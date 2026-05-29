# Physical Deletion And AI History Archival

## Goal

Keep the system sustainable by changing deletion behavior: normal resume deletion keeps the current recycle-bin flow, while other in-scope delete actions physically remove data from the database. Add permanent delete to the recycle bin, cascade cleanup for resume-linked data, limit resume-editor AI chat history to 10 conversations, allow users to delete AI chat history from the UI, and archive deleted `spring_ai_chat_memory` rows into a new `ai_history` table.

## Requirements

* Keep existing normal resume deletion behavior: `DELETE /resumes/{resumeId}` moves active resumes into the recycle bin.
* Add a recycle-bin-only permanent delete action for resumes.
* Permanent resume deletion must only allow the current user to purge resumes that are already in the recycle bin.
* Permanent resume deletion must physically remove all resume-linked business data in one transaction.
* Resume-linked cleanup must include sections, versions, shares, share access logs, interviews, interview messages, interview round topics, interview AI assists, AI resume scores, resume chat conversations, resume chat suggestions, and related Spring AI chat memory.
* `spring_ai_chat_memory` rows removed by retention, manual history deletion, or resume purge must first be copied into `ai_history`.
* Resume-editor AI chat history must keep at most 10 conversations per user and resume.
* When a new resume-editor AI conversation causes the limit to exceed 10, delete the oldest conversations and archive their Spring AI memory.
* The frontend AI history list must support deleting a conversation.
* Deleting an AI history item must delete its conversation metadata, suggestions, and Spring AI memory after archiving the memory rows.
* The frontend AI chat window must show an internationalized retention hint that only the latest 10 histories are kept.
* All non-normal-resume delete operations must physically delete data unless a future requirement explicitly preserves soft-delete behavior.
* Custom resume template deletion must physically delete template rows.
* Resume version/snapshot deletion must physically delete version rows while handling dependent share/access data in an order that satisfies database constraints.

## Acceptance Criteria

* [x] Normal resume delete still moves the resume to the recycle bin and supports restore.
* [x] Recycle bin shows a permanent delete action for deleted resumes.
* [x] Permanent delete removes the resume row and linked child rows from business tables.
* [x] Permanent delete rejects missing, unauthorized, or not-yet-deleted resumes.
* [x] Public share links for a purged resume are no longer accessible.
* [x] Interviews, reports, AI assists, scoring results, versions, shares, and resume chat history linked to a purged resume are no longer queryable.
* [x] Creating an 11th AI resume-chat conversation automatically removes the oldest retained conversation.
* [x] Manual AI history deletion removes the item from the UI and deletes the backend conversation data.
* [x] `spring_ai_chat_memory` rows deleted by retention or manual delete are inserted into `ai_history`.
* [x] Existing latest 10 conversations remain usable after retention cleanup.
* [x] Custom resume template deletion physically removes the template row.
* [x] Resume version deletion physically removes the version row.
* [x] Frontend build/typecheck passes for UI and API changes.
* [x] Backend verification passes for affected deletion and AI history flows.

## Definition Of Done

* Database migration added for `ai_history`.
* Backend code implements physical deletion and archival with ownership checks.
* Frontend code adds recycle-bin permanent delete and AI-history delete UX.
* User-facing text is added to both `zh-CN` and `en-US` locale files.
* Focused tests are added or updated for destructive flows where practical.
* Rollout and rollback risk are considered for irreversible deletion.

## Technical Approach

Recommended implementation direction:

* Add `V25__create_ai_history.sql`.
* Add an AI memory archival helper/service that:
  * reads `spring_ai_chat_memory` rows by conversation id,
  * inserts archived copies into `ai_history`,
  * records archive reason such as `MANUAL_DELETE`, `RETENTION_LIMIT`, or `RESUME_PURGE`,
  * deletes the source memory rows after successful archive.
* Add explicit service-layer cleanup instead of relying on database cascade because current foreign keys generally do not use `ON DELETE CASCADE`.
* Add a permanent resume delete endpoint such as `DELETE /api/resumes/{resumeId}/purge`.
* Keep existing `DELETE /api/resumes/{resumeId}` as soft delete.
* Add `DELETE /api/ai/resumes/{resumeId}/chat/conversations/{conversationId}` for manual AI history deletion.
* Enforce the 10-conversation retention limit after creating a new resume-chat conversation.
* Change custom template deletion from soft delete to physical delete.
* Change resume version deletion from soft delete to physical delete, preserving existing snapshot-share invalidation semantics where needed before deleting the version row.
* Update the recycle-bin UI with a dangerous permanent delete confirmation.
* Update the AI history list with a per-conversation delete action and retention hint.

## Decision

**Context**: Existing code has mixed deletion behavior. Normal resume deletion is intentionally soft delete for recycle bin, while other deletes should not retain database rows.

**Decision**: Use physical deletion everywhere except normal resume delete. This includes custom templates and resume versions.

**Consequences**: Implementation must explicitly handle dependency ordering and user confirmation for destructive operations. Deleted templates and versions will no longer be recoverable unless a separate backup/restore mechanism exists outside this task.

## Open Questions

* None currently blocking implementation.

## Assumptions

* "Physical delete" means removing database rows, not setting `deleted` or `deleted_at`.
* `ai_history` is an archive/audit table and is not used for prompt memory recall.
* The 10-history limit is counted by resume-editor conversation, not by individual chat message.
* Resume-editor AI history retention applies only to rows listed from `ai_chat_conversations`.
* Non-resume AI memory is only cleaned when its owning business entity is physically deleted.

## Out Of Scope

* Do not change normal resume delete entering the recycle bin.
* Do not add restore from `ai_history` back into `spring_ai_chat_memory`.
* Do not add an `ai_history` management or query UI.
* Do not add scheduled global data-retention jobs in this task.

## Expansion Sweep

* Future evolution: `ai_history` can later power admin audit, storage reporting, or retention jobs, so it should preserve source metadata now.
* Related scenarios: custom templates and resume versions currently have soft-delete behavior; this task must explicitly decide which of those are in scope.
* Failure and edge cases: permanent delete must be transactional, ownership-checked, ordered by dependencies, and archive memory before deleting memory rows.

## Technical Notes

* Branch: `codex/physical-delete-ai-history`
* Task directory: `.trellis/tasks/05-29-physical-delete-ai-history`
* `rg` was unavailable in this environment with "Access is denied"; code search used PowerShell and direct file reads.
* Current `ResumeService.softDeleteResume` sets `resumes.deleted=true`.
* Current recycle-bin flow has list and restore, but no permanent-delete endpoint.
* Current `ShareService.deleteShare` already physically deletes share access logs and share links.
* Current `ResumeVersionService.deleteVersion` soft-deletes snapshots and invalidates snapshot shares.
* Current `TemplateCatalogService.deleteTemplate` soft-deletes custom templates.
* Current AI history uses `ai_chat_conversations`, `ai_chat_suggestions`, and Spring AI `JdbcChatMemoryRepository`.
* Relevant specs:
  * `.trellis/spec/backend/database-guidelines.md`
  * `.trellis/spec/backend/ai-chat-history.md`
  * `.trellis/spec/backend/ai-resume-chat.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
  * `.trellis/spec/frontend/type-safety.md`
  * `.trellis/spec/guides/cross-layer-thinking-guide.md`
