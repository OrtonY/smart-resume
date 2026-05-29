# brainstorm: resume import

## Goal

Add a resume import feature so users can bring an existing resume file into Smart Resume and convert it into editable structured resume data.

## What I already know

* User asked to add a resume import feature.
* Project is a private, multi-user Smart Resume workspace with resume create/copy/delete/recover, editor, templates, PDF export, AI resume chat, scoring, sharing, and interview flows.
* Backend stack is Spring Boot with PostgreSQL and MyBatis-Flex.
* Frontend stack is TypeScript with Ant Design.
* Current branch for this requirement is `codex/resume-import`, created from `develop`.
* Trellis task directory is `.trellis/tasks/05-29-resume-import`.
* Existing backend resume flow uses `ResumeController`, `ResumeService`, `ResumeContentService`, and `ResumeDtos.ResumeContentPayload`.
* Existing frontend workspace flow lives mainly in `frontend/src/pages/WorkspacePage.tsx` and `frontend/src/features/resume/api/resumeApi.ts`.
* Existing AI shared service exposes `AiChatService.callStructured(...)`, which can map extracted resume text into structured content without duplicating AI provider plumbing.

## Assumptions (temporary)

* Import should create or populate an editable structured resume rather than merely storing the uploaded file.
* MVP should reuse existing resume data models and editor flows instead of introducing a separate imported-document domain.
* Authentication and per-user data isolation should follow existing backend rules.
* Recommended MVP: uploading one `.pdf`, `.docx`, or `.txt` file creates a new editable resume, then opens it in the existing editor.

## Open Questions

* None.

## Requirements (evolving)

* Users can upload an existing resume through the resume workspace/editor flow.
* Imported content is mapped into the existing structured resume format.
* Users can review and edit the imported result with the existing resume editor.
* Import must create data owned by the current authenticated user only.
* Import creates a new resume. It must not overwrite the currently selected or existing resume.
* Import entry is in the template gallery page. After entering the template catalog from the home page and selecting a template, the preview panel currently shows a create-resume button; add an import button next to that button.
* The selected template is applied to the imported resume.
* MVP supports importing one `.pdf`, `.docx`, or `.txt` file.
* Scanned/image-only PDFs are out of scope for MVP. If text extraction yields too little usable text, show a clear error and do not create a resume.
* Imported resume title defaults to the uploaded file name without extension.

## Acceptance Criteria (evolving)

* [ ] A supported resume file can be imported from the UI.
* [ ] Import result becomes an editable resume owned by the current user.
* [ ] Import from the template gallery creates a new resume using the currently selected template.
* [ ] Import success opens `/app/resumes/{id}` for the newly created resume.
* [ ] Supported formats are `.pdf`, `.docx`, and `.txt`.
* [ ] Image-only/scanned PDFs that do not yield usable text fail gracefully without creating a resume.
* [ ] Imported resume title defaults to the uploaded file name without extension.
* [ ] Invalid/unsupported files show a clear user-facing error.
* [ ] Import behavior respects existing authentication and resume ownership constraints.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint/typecheck/targeted backend verification pass where feasible.
* Docs/notes updated if behavior changes or new setup is required.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* Batch import.
* Importing into another user's resume.
* Replacing the full resume editor UX.
* OCR for scanned/image-only resumes.

## Technical Notes

* Relevant spec indexes: `.trellis/spec/backend/index.md`, `.trellis/spec/frontend/index.md`, `.trellis/spec/guides/index.md`.
* Relevant thinking guide likely needed later: `.trellis/spec/guides/cross-layer-thinking-guide.md`, because import touches UI, API, service logic, persistence, and existing resume model.
* Initial repository search hit environment issues: `rg` execution was denied and ACE context search returned 429, so context discovery is continuing with PowerShell file inspection.

## Research References

* [`research/import-approaches.md`](research/import-approaches.md) - recommends file upload plus server-side text extraction plus AI structured mapping as the MVP path.

## Feasible Approaches

**Approach A: Text paste import**

* How it works: user pastes raw resume text; backend maps it to structured resume content.
* Pros: no new parsing dependencies, fastest to implement.
* Cons: not a real file import and less useful for users.

**Approach B: File upload import** (Recommended)

* How it works: user uploads one `.pdf`, `.docx`, or `.txt`; backend extracts text, calls AI structured mapping, creates a new resume, and frontend opens the editor.
* Pros: matches expected import workflow and reuses existing resume/AI contracts.
* Cons: adds backend parsing dependencies and cannot handle scanned PDFs without OCR.

**Approach C: File upload with text preview**

* How it works: upload file, show extracted text, then user confirms creation.
* Pros: users can catch poor extraction before AI mapping.
* Cons: more UI and slower MVP.

## Decision (ADR-lite)

**Context**: Import could either create a new resume, overwrite an existing resume, or support both.

**Decision**: MVP import creates a new resume only. The entry is added beside the existing create-resume button in the template gallery preview panel, and the imported resume uses the selected template.

**Consequences**: This avoids accidental overwrite risk and keeps the editor auto-save/versioning behavior unchanged. Future work can add "import into current resume" with an explicit confirmation and snapshot workflow.

## Decision: Supported Formats

**Context**: File import can start narrow or support the common resume formats.

**Decision**: MVP supports `.pdf`, `.docx`, and `.txt`.

**Consequences**: Users can import the most common resume file types. Text-based PDF parsing is supported, but OCR/scanned PDFs are explicitly out of scope and should fail with a clear message when no usable text is extracted.

## Decision: Imported Resume Title

**Context**: Imported resumes need a predictable default title before the user edits them.

**Decision**: Use the uploaded file name without extension as the default resume title.

**Consequences**: Import behavior is stable and easy to understand. The title may not be semantically polished, but users can rename it in the existing editor.
