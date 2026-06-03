# Codebase Research: AI Cover Letter Generation

## Question

How should cover letter generation fit into the existing Smart Resume codebase?

## Comparable local patterns

### Resume translation

* Frontend entry is in the resume editor action bar and mobile overflow menu.
* The page-level handler saves the latest draft before invoking the backend AI endpoint.
* Backend owns prompt construction and current-user resume loading.
* AI output is structured and normalized before returning.

### Resume scoring

* Frontend exposes a one-shot modal from the editor.
* Backend uses `AiResumeScoringService` with `AiChatService.callStructured`.
* The service generates a feature-scoped conversation id via `AiConversationIdGenerator`.
* Last score is persisted because the feature explicitly needs cross-device recovery.

### Bullet rewrite

* Frontend calls a small typed AI endpoint and previews the generated content before applying it.
* Backend includes the relevant resume context and returns a deterministic response DTO.
* The generated content is not persisted as its own domain object.

## Repo constraints

* New AI services must use the shared `AiChatService` layer; direct provider calls are against spec.
* `AiFeatureType` should include a dedicated feature code for cover letter generation.
* Backend must validate resume access with `CurrentUserContext.requireUserId()` and `ResumeLookupService.requireResume(...)`.
* Resume content sent to AI should come from backend services, not frontend-provided arbitrary resume content.
* Editor actions need parity between desktop buttons and mobile menu entries.
* UI strings need both `zh-CN` and `en-US`.
* Current job application records do not have a separate JD field; notes may contain context but are not a clean source of truth.

## Feasible approaches

### Approach A: On-demand modal with copy output

Add a cover letter action to the editor. A modal collects company, position, optional job description, optional notes, and output language/tone if selected. Backend returns generated title/body text. The UI previews the result and provides copy.

This matches the current bullet rewrite and translation ergonomics and keeps the data model unchanged.

### Approach B: On-demand modal plus download

Same as Approach A, but add a generated text/Markdown download action. This keeps backend scope the same but introduces more output formatting UX.

### Approach C: Persisted cover-letter records

Add database storage and history for generated letters, potentially linked to resumes and job applications. This supports a richer application workflow, but requires migration, CRUD endpoints, list/detail UI, and extra access tests.

## Recommendation

Start with Approach A. It provides immediate value in the resume editor, fits the existing AI feature architecture, and avoids committing to a cover-letter data model before the user workflow is proven. Add download as a small extension if the MVP needs a tangible artifact beyond copy-to-clipboard.

## Updated scope decision

The user selected Approach C: persisted cover-letter records, with optional linkage to existing job applications.

Additional codebase findings:

* Existing `job_applications` rows have `company`, `position`, `channel`, `status`, `resume_id`, `applied_at`, and `notes`, but no dedicated JD or cover-letter fields.
* Persisted cover letters should not be stored in `job_applications.notes`; notes are general application notes and do not provide cover-letter versioning/history semantics.
* A dedicated cover-letter table can include `user_id`, `resume_id`, optional `application_id`, target company/position/JD/notes, generated title/body, language/tone metadata, and timestamps.
* Optional `application_id` linkage must validate ownership and should not require reworking the job application form for MVP.

Finalized MVP decisions:

* Required generation inputs: company and position.
* Optional generation inputs: job description and extra notes.
* Output language: selectable, defaulting to the current UI language.
* Style: fixed professional, concise, application-ready output.
* History UI: generation/history tabs inside one editor modal.
* Editing: generated cover-letter body can be edited and saved in the app.
* Cleanup: saved cover-letter records can be deleted.
