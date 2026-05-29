# AI Chat History Persistence

> How the resume AI assistant stores and reuses conversation history.

---

## Overview

AI chat history is persisted on the backend and grouped by `resumeId`.
Each resume may have multiple selectable conversations.
The backend uses Spring AI `ChatClient` with `MessageChatMemoryAdvisor` and a JDBC-backed `ChatMemoryRepository`.
The frontend sends only the current user message and bound resume context; Spring AI persists the conversation memory by `conversationId` and reuses it on the next stream.

---

## Persistence Rules

* Use `ai_chat_conversations` as the resume-scoped conversation metadata table.
* Persist per-assistant-round suggestion cards in `ai_chat_suggestions`, keyed by `user_id + resume_id + conversation_id + suggestion_id`.
* Build server-owned `suggestion_id` values from `(conversationId, assistantMessageIndex, displayOrder)` as `"{conversationId}-a{assistantMessageIndex}-s{displayOrder}"` so one assistant reply can safely persist multiple cards.
* Use `ChatMemory.CONVERSATION_ID` as the selected conversation id, not as the resume id.
* All AI features generate conversation ids uniformly through `AiConversationIdGenerator.generate(resumeId, AiFeatureType)` → `{resumeId|default}_{featureCode}_{yyyyMMddHHmmssSSS}`. See [ai-chat-service.md](./ai-chat-service.md). Distinguishing per-feature behavior is done via the `featureCode` segment, not via separate id schemes.
  * Resume chat uses `AiFeatureType.RESUME_CHAT` and additionally writes a row into `ai_chat_conversations` so the user can list/switch threads from the editor.
  * Other features (resume scoring, future interview / interview report) write only to `spring_ai_chat_memory`; their conversation ids exist for audit but are not surfaced as user-selectable threads.
  * Pre-refactor resume-chat rows in `ai_chat_conversations` may carry the legacy `resume-{resumeId}-{uuid}` id; these stay valid — no migration needed.
* Use `MessageWindowChatMemory` with a bounded message window for prompt reuse.
* Keep read APIs for listing a resume's conversations and loading messages for a selected conversation. Filtering by `resumeId` (the metadata column) is the source of truth — do NOT rely on parsing the conversation-id string to recognise threads.
* Resume-chat history reads should attach persisted suggestions back onto the matching assistant message so the frontend can restore cards and statuses after refresh or conversation switch without rebuilding them heuristically.
* Persisting suggestions from a streaming response must not rely on `CurrentUserContext` inside Reactor worker threads. Capture `userId` before entering the async stream and pass it explicitly into persistence methods.
* Persist suggestion status transitions as product state, not just transient UI state. Supported states: `pending`, `applied`, `dismissed`, and `dismissed -> pending` undo.
* Never delete earlier suggestions when a later assistant turn produces more cards in the same conversation. Each turn appends its own persisted set, and replays should reuse the existing row when the same normalized `suggestion_id` already exists.
* Prefer `stream().content()` for SSE text output; the frontend can render each content chunk directly.
* Do not switch the frontend to a newly-created conversation until the current stream is complete, otherwise the history reload can overwrite the in-progress streamed assistant message.

---

## Scenario: AI Memory Archival During Physical Delete

### 1. Scope / Trigger

- Trigger: non-normal resume deletes and interview deletes physically remove domain rows but must preserve related Spring AI chat memory for audit.
- This is a cross-layer data-retention contract because deletion APIs, service ownership checks, `spring_ai_chat_memory`, and `ai_history` must stay aligned.

### 2. Signatures

- Archive table: `ai_history(source_conversation_id, user_id, resume_id, content, type, source_timestamp, archive_reason, archived_at)`.
- Resume delete flow: physical delete paths must archive related resume AI memories before deleting the source `spring_ai_chat_memory` rows.
- Interview delete API: `DELETE /api/interviews/{interviewId}`.
- Interview delete service entry: `InterviewService.deleteInterview(String interviewId)`.

### 3. Contracts

- All delete entry points must resolve ownership with `CurrentUserContext.requireUserId()` and apply `user_id` filters before deleting.
- Archive before delete: copy matching `spring_ai_chat_memory` rows into `ai_history`, then delete the original memory rows.
- Store the source conversation id unchanged in `ai_history.source_conversation_id`.
- Store the owning resume id when known; interview sessions without a resume may archive with `resume_id = null`.
- Delete and archive implementation should use MyBatis-Flex mapper/query APIs rather than handwritten service-layer SQL. Batch archive writes with `insertBatch(...)` and delete source rows with a separate `deleteByQuery(...)` that does not carry read-only ordering clauses.
- When matching Spring AI memory by conversation-id prefix, use the archive helper's prefix lookup and verify matches with Java `startsWith(...)` before delete/archive. MyBatis-Flex `like(...)` wraps values in `%...%`, and SQL `_` is a wildcard, so raw service-layer `LIKE` conditions can overmatch unrelated conversations.
- Interview deletion must include:
  - the session's `ai_conversation_id`
  - `interview-{sessionId}-%` conversation ids for round, answer, score, report, and extraction variants
  - `{sessionId}_interview_%` legacy/unified-generator variants

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| Interview id not owned by current user | `404 Not Found` |
| Matching chat memory exists | Archive every matching row, then delete source rows |
| No matching chat memory exists | Continue physical domain deletion |
| Interview belongs to a resume | Archive rows with that `resume_id` |
| Interview has no resume | Archive rows with `resume_id = null` |

### 5. Good/Base/Bad Cases

- Good: deleting an interview removes session/messages/topics/assists and moves all matching Spring AI memory rows to `ai_history`.
- Base: deleting a resume physically deletes its interviews by reusing the interview physical-delete service instead of duplicating interview cleanup SQL.
- Bad: deleting `spring_ai_chat_memory` directly before archiving, losing audit history.
- Bad: matching only the session's primary `ai_conversation_id`, leaving answer/score/report memories behind.

### 6. Tests Required

- Service regression test for manual interview delete:
  - creates an interview
  - inserts assist/topic rows and a matching Spring AI memory row
  - calls `deleteInterview`
  - asserts domain rows and source memory are gone
  - asserts `ai_history` has the archived row with `user_id` and `resume_id`
- Resume physical-delete tests must assert interview cleanup is delegated/reused and related AI memories are archived.
- Test schema must keep `SPRING_AI_CHAT_MEMORY.timestamp` compatible with Spring AI repository queries.

### 7. Wrong vs Correct

#### Wrong

```java
jdbcTemplate.update("delete from spring_ai_chat_memory where conversation_id like ?", "interview-" + sessionId + "-%");
jdbcTemplate.update("delete from interview_sessions where id = ?", sessionId);
```

Issues: drops audit data, misses ownership filtering, bypasses MyBatis-Flex conventions, and can drift from resume physical-delete behavior.

#### Correct

```java
interviewPhysicalDeleteService.deleteOwnedInterview(interviewId, CurrentUserContext.requireUserId());
```

The physical-delete service gathers all known interview conversation id patterns, archives memory rows to `ai_history`, and deletes owned domain rows through MyBatis-Flex mappers in one transaction.

```java
aiHistoryMapper.insertBatch(archives);
springAiChatMemoryMapper.deleteByQuery(
    QueryWrapper.create().where(memoryTable.CONVERSATION_ID.in(conversationIds))
);
```

Use a sorted `selectListByQuery(...)` only for deterministic archival reads. Do not reuse that same ordered query for `deleteByQuery(...)`, because it can emit invalid SQL such as `DELETE ... ORDER BY ...`.

---

## Common Mistakes

* Passing the full conversation history from the browser on every request.
* Hand-rolling persistence when `MessageChatMemoryAdvisor` already stores and replays memory.
* Loading unbounded history into the prompt context.
* Letting SSE endpoint exceptions fall through to the global JSON exception handler; emit an SSE `error` event instead.
* Collapsing all chats for the same resume into a single conversation id, which prevents users from choosing and continuing distinct histories.
* Inventing a fresh conversation-id scheme inside a feature (e.g. `"interview-" + uuid`) — use `AiConversationIdGenerator` so the audit format stays uniform across features. **Exception**: interview uses per-round conversationIds (`"interview-{sessionId}-round-{roundIndex}"`) for context isolation between rounds — this is an accepted deviation.
* Exposing scoring / interview / report conversation ids in the resume-chat history list — they share the underlying table but are not user-selectable threads.
