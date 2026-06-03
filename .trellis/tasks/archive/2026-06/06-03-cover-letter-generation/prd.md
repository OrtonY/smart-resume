# brainstorm: cover letter generation

## Goal

Add a cover letter generation feature to the resume editor so a user can generate application-ready prose from the current resume, optionally tailored to a target company, position, and job description.

## What I already know

* User requested: "简历编辑页面新增求职信生成功能".
* The resume editor is implemented in `frontend/src/features/resume/components/editor/ResumeEditorView.tsx`.
* The editor already has AI actions for resume scoring, bullet rewrite, full-resume translation, and a floating AI assistant.
* The backend exposes AI endpoints through `backend/src/main/java/com/smartresume/ai/controller/AiController.java`.
* Existing AI one-shot structured flows use `AiChatService.callStructured(...)` and feature-specific services such as `AiResumeScoringService` and `AiResumeTranslationService`.
* Frontend AI API wrappers live in `frontend/src/features/ai/api/aiApi.ts`, with shared response/request types in `frontend/src/features/ai/types.ts`.
* Job applications exist, but the current `JobApplication` model does not store a standalone job description field; it has company, position, status, channel, resume id, applied date, and notes.
* Editor desktop actions and mobile overflow menu must stay in sync.
* Locale keys must be added for both `zh-CN` and `en-US`.

## Assumptions (temporary)

* The MVP should persist generated cover letters as first-class history records.
* The generated result can be previewed in a modal/history detail and copied by the user.
* The AI prompt should use backend-loaded, current-user resume content rather than trusting a frontend-provided resume payload.
* Unsaved editor changes should be saved before generation so the AI sees the latest resume content.

## Open Questions

* None for MVP confirmation.

## Requirements (evolving)

* Add a cover letter generation entry in the resume editor on desktop and mobile.
* Collect target company and position as required inputs.
* Allow optional job description and extra user notes to improve tailoring.
* Allow the user to choose output language, defaulting to the current UI language.
* Use one default generation style for MVP: professional, concise, and application-ready.
* Generate cover letter content from the authenticated user's current resume.
* Persist generated cover letters for later retrieval.
* Provide a history/list experience for previously generated cover letters inside the cover-letter modal.
* Store cover letters as resume-scoped records with an optional link to an existing job application.
* Allow generated cover-letter text to be edited and saved in the app.
* Allow users to delete saved cover-letter history records to manage clutter.
* Show loading, success, and failure states without fabricating fallback content when AI fails.
* Preserve existing resume editing, preview, export, share, translation, scoring, and interview actions.

## Acceptance Criteria (evolving)

* [ ] A user can open a cover letter generation modal from the resume editor.
* [ ] A user can enter required company/position and optional JD/notes, then request generation.
* [ ] The generation modal offers output language selection with a UI-language default.
* [ ] Generated cover letters use the default professional/concise style without tone or length controls.
* [ ] The backend validates resume access through the current user before AI invocation.
* [ ] The backend generates the cover letter through the shared `AiChatService` invocation layer.
* [ ] The backend stores successful generated cover letters with current-user ownership.
* [ ] A generated cover letter may optionally reference an owned job application.
* [ ] A user can view previously generated cover letters for the current resume.
* [ ] The cover-letter modal includes separate generation and history views/tabs.
* [ ] A user can edit and save the generated cover-letter body.
* [ ] A user can delete saved cover-letter records.
* [ ] The generated cover letter is shown in the editor UI and can be copied at minimum.
* [ ] Desktop and mobile editor action menus both expose the feature.
* [ ] `zh-CN` and `en-US` UI text exists for all new controls and feedback.
* [ ] Backend and frontend verification commands pass.

## Definition of Done (team quality bar)

* Tests added/updated for backend service/controller behavior where appropriate.
* Frontend build/typecheck and lint pass.
* Backend tests pass for affected AI service behavior.
* Docs/spec notes updated if a new reusable AI pattern emerges.
* Rollout/rollback considered if AI prompt behavior or persistence scope is risky.

## Out of Scope (explicit)

* Sending cover letters to employers.
* Email client integration.
* A full cover-letter document designer.
* Replacing the existing AI resume assistant/chat.
* Sending or tracking application delivery status.
* Reworking the job application page as the primary cover-letter workspace.

## Research References

* [`research/codebase-ai-cover-letter.md`](research/codebase-ai-cover-letter.md) — Repo constraints and feasible implementation approaches for adding cover letter generation.

## Research Notes

### Constraints from our repo/project

* AI features should use `AiChatService.callStructured` or `call` rather than direct provider plumbing.
* New feature conversation ids should be added to `AiFeatureType`.
* Backend prompt construction should use `ResumeLookupService` and `ResumeContentService` so only accessible, relevant resume content is used.
* Existing translation flow saves the latest draft before invoking backend AI; cover letter generation should follow that pattern.
* Existing editor UI is action-heavy; a modal flow fits the current translation/scoring patterns better than introducing a new page for MVP.

### Feasible approaches here

**Approach A: On-demand modal with copy output (Recommended)**

* How it works: add editor action, modal fields for company/position/job description/notes, synchronous backend generation, result preview, copy button.
* Pros: smallest useful MVP, aligns with existing AI one-shot flows, avoids data model churn.
* Cons: generated letters are not recoverable after closing unless the user copies them.

**Approach B: On-demand modal plus download**

* How it works: same as Approach A, plus frontend download of generated text/Markdown as a file.
* Pros: still low backend complexity, more useful for users preparing applications.
* Cons: requires output formatting decisions and extra UI states.

**Approach C: Persisted cover-letter records** (Selected)

* How it works: add backend storage for generated cover letters, list/history UI, optional linkage to job applications.
* Pros: supports long-term workflow and reuse.
* Cons: wider scope: database migration, CRUD API, history UI, access tests, and more product decisions.

## Technical Approach

Selected MVP is Approach C: persisted cover-letter records. Expected implementation:

* Backend: add `AiCoverLetterGenerationService`, request/response DTOs, `/api/ai/resumes/{resumeId}/cover-letters` generation/list/detail/update/delete endpoints, `AiFeatureType.RESUME_COVER_LETTER`, prompt rules, persistence entity/mapper/migration, optional owned `application_id` linkage, required company/position inputs, optional JD/notes inputs, output language, fixed professional/concise style, and service tests.
* Frontend: add typed API wrapper/types, editor modal/action wiring, optional job application selector, cover-letter modal generation/history tabs, editable detail body, save/delete actions, copy behavior, i18n strings, and build/lint verification.
* The page-level editor handler should save the current draft before calling the generation endpoint, matching the translation flow.

## Decision (ADR-lite)

**Context**: The user wants cover letter generation from the resume editor and selected the richer saved-history MVP.

**Decision**: Implement persisted cover-letter records rather than a purely ephemeral generated result. Cover letters are resume-scoped and may optionally link to an existing owned job application.

**Consequences**: The feature needs a database migration, backend CRUD/list read paths, ownership checks, optional application ownership validation, and a history UI. This increases implementation scope but supports application-aware retrieval without turning the job application page into the primary workspace.

**Input decision**: Company and position are required. Job description and extra notes are optional.

**Input consequences**: The feature remains usable without a JD while still preserving enough structured metadata for history display and future filtering.

**Language decision**: Output language is selectable, with the default derived from the current UI language.

**Language consequences**: The generation request and persisted record need an explicit language field so history can show what was generated and users can intentionally create Chinese or English letters.

**Style decision**: MVP uses a fixed professional, concise, application-ready style and does not expose tone or length controls.

**Style consequences**: The form stays compact and prompt behavior is easier to test. Tone/length can be added later as metadata fields if needed.

**History UI decision**: History appears inside the same cover-letter modal as a generation/history tabbed experience.

**History UI consequences**: The feature has one editor entry point and does not require a new page. Modal state must support generating, listing, selecting a historical record, and copying content.

**Editing decision**: Generated cover-letter text can be edited and saved inside the app.

**Editing consequences**: Persistence needs update/delete operations, frontend history detail needs an editable body, and tests must cover ownership checks for modifications.

## Technical Notes

* Branch: `codex/cover-letter-generation`.
* Task directory: `.trellis/tasks/06-03-cover-letter-generation`.
* Relevant frontend files inspected:
  * `frontend/src/features/resume/components/editor/ResumeEditorView.tsx`
  * `frontend/src/pages/WorkspacePage.tsx`
  * `frontend/src/features/ai/api/aiApi.ts`
  * `frontend/src/features/ai/types.ts`
  * `frontend/src/features/application/api/applicationApi.ts`
  * `frontend/src/features/application/types.ts`
  * `frontend/src/i18n/locales/zh-CN/workspace.json`
  * `frontend/src/i18n/locales/en-US/workspace.json`
* Relevant backend files/specs inspected:
  * `backend/src/main/java/com/smartresume/ai/controller/AiController.java`
  * `backend/src/main/java/com/smartresume/ai/dto/AiDtos.java`
  * `backend/src/main/java/com/smartresume/ai/service/AiResumeScoringService.java`
  * `backend/src/main/java/com/smartresume/ai/service/AiResumeTranslationService.java`
  * `backend/src/main/java/com/smartresume/ai/memory/AiFeatureType.java`
  * `.trellis/spec/backend/ai-chat-service.md`
  * `.trellis/spec/backend/ai-resume-scoring.md`
  * `.trellis/spec/backend/ai-resume-translation.md`
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/backend/index.md`
