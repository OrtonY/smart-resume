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
* Use `ChatMemory.CONVERSATION_ID` as the selected conversation id, not as the resume id.
* All AI features generate conversation ids uniformly through `AiConversationIdGenerator.generate(resumeId, AiFeatureType)` → `{resumeId|default}_{featureCode}_{yyyyMMddHHmmssSSS}`. See [ai-chat-service.md](./ai-chat-service.md). Distinguishing per-feature behavior is done via the `featureCode` segment, not via separate id schemes.
  * Resume chat uses `AiFeatureType.RESUME_CHAT` and additionally writes a row into `ai_chat_conversations` so the user can list/switch threads from the editor.
  * Other features (resume scoring, future interview / interview report) write only to `spring_ai_chat_memory`; their conversation ids exist for audit but are not surfaced as user-selectable threads.
  * Pre-refactor resume-chat rows in `ai_chat_conversations` may carry the legacy `resume-{resumeId}-{uuid}` id; these stay valid — no migration needed.
* Use `MessageWindowChatMemory` with a bounded message window for prompt reuse.
* Keep read APIs for listing a resume's conversations and loading messages for a selected conversation. Filtering by `resumeId` (the metadata column) is the source of truth — do NOT rely on parsing the conversation-id string to recognise threads.
* Prefer `stream().content()` for SSE text output; the frontend can render each content chunk directly.
* Do not switch the frontend to a newly-created conversation until the current stream is complete, otherwise the history reload can overwrite the in-progress streamed assistant message.

---

## Common Mistakes

* Passing the full conversation history from the browser on every request.
* Hand-rolling persistence when `MessageChatMemoryAdvisor` already stores and replays memory.
* Loading unbounded history into the prompt context.
* Letting SSE endpoint exceptions fall through to the global JSON exception handler; emit an SSE `error` event instead.
* Collapsing all chats for the same resume into a single conversation id, which prevents users from choosing and continuing distinct histories.
* Inventing a fresh conversation-id scheme inside a feature (e.g. `"interview-" + uuid`) — use `AiConversationIdGenerator` so the audit format stays uniform across features. **Exception**: interview uses per-round conversationIds (`"interview-{sessionId}-round-{roundIndex}"`) for context isolation between rounds — this is an accepted deviation.
* Exposing scoring / interview / report conversation ids in the resume-chat history list — they share the underlying table but are not user-selectable threads.
