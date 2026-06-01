# brainstorm: JSON import export

## Goal

Add JSON import and export for resumes so users can back up a structured resume, move it between environments, or restore it without relying on AI parsing from PDF/DOCX/TXT.

## What I already know

* User requested a JSON import/export feature.
* Existing resume import is available from the template gallery and supports PDF, DOCX, and TXT via `POST /api/resumes/import`.
* Existing PDF/DOCX export is available in the resume editor export dropdown.
* The canonical editable frontend shape is `ResumeDetail` with `title`, `templateKey`, `content`, `layout`, and metadata.
* The backend update contract persists `title`, `templateKey`, `content`, and `layout`.
* Frontend already has `downloadBlob` and `createExportFilename`, currently typed for `pdf` and `docx`.

## Assumptions (temporary)

* JSON export should export structured resume data, not a rendered document.
* JSON import should use the unified import entry in the template catalog.
* JSON import should create a new resume from the selected template/catalog flow rather than overwriting the currently opened resume by default.
* The import payload should ignore server-owned identifiers and timestamps.
* The MVP can validate and normalize the JSON on the frontend before calling existing backend APIs, unless backend validation is needed for ownership or stricter schema enforcement.

## Open Questions

* (resolved) JSON import should keep missing sections visible as empty data under the default layout.

## Requirements (evolving)

* Export the current resume as a `.json` file from the editor export menu.
* Expose JSON export in the existing resume editor "Export" dropdown, alongside PDF and Word.
* Include only lightweight business data in the JSON export: resume title and currently visible resume content.
* Do not include schema/version metadata in MVP.
* Do not include template metadata or `templateKey`; JSON import uses the template chosen in the template catalog flow.
* Do not include layout metadata such as hidden sections or full section order.
* Do not export content from sections currently hidden in the editor.
* Import a JSON file from the existing template catalog import entry and restore the structured content without AI parsing.
* JSON import follows the same user flow as current PDF/DOCX/TXT import: user picks a template in the template catalog, opens import, uploads a file, and the result creates a new resume.
* When importing JSON, sections absent from the JSON file are imported as empty data and remain visible in the new resume.
* Imported JSON uses the template chosen in the template catalog import flow.
* Validate JSON shape before applying or creating data.
* Reuse existing i18n and Ant Design patterns for user-facing UI.

## Acceptance Criteria (evolving)

* [ ] A user can export an opened resume to a JSON file.
* [ ] The JSON export action appears in the editor export dropdown.
* [ ] The template catalog import entry accepts JSON in addition to PDF/DOCX/TXT.
* [ ] The exported JSON contains no `schemaVersion`, template metadata, `templateKey`, hidden-section metadata, or full layout metadata.
* [ ] The exported JSON contains content only for sections visible in the current editor preview.
* [ ] The exported JSON can be imported back through the template catalog and creates a new editable resume with the selected template.
* [ ] Importing JSON keeps absent sections visible as empty data.
* [ ] Invalid JSON or unsupported schema shows a clear localized error.
* [ ] PDF/DOCX import/export behavior remains unchanged.
* [ ] Frontend type-check/lint passes for changed frontend files.
* [ ] Backend tests are added only if the implementation introduces backend endpoints or service logic.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / CI green for affected areas.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* Bulk import/export of multiple resumes.
* Importing arbitrary third-party JSON formats outside the Smart Resume visible-content JSON schema.
* Preserving the original resume template during JSON import/export.
* Preserving hidden-section state or full layout settings during JSON import/export.

## Technical Approach

* Frontend export builds a lightweight JSON payload from the opened `ResumeDetail`, copying `title` and only content for non-hidden sections.
* Frontend import accepts `.json` in the existing template catalog import modal and keeps calling the unified `POST /api/resumes/import` endpoint.
* Backend import detects `.json`, parses the lightweight visible-content payload directly, creates a new resume with the selected template, and keeps the default layout so missing sections remain visible as empty data.
* Existing PDF/DOCX/TXT import keeps using the same endpoint and continues through text extraction plus AI parsing.
* Exporting AI chat history, interviews, shares, versions, or application tracking data.
* Replacing PDF/DOCX/TXT AI parsing.

## Technical Notes

* Relevant frontend files inspected:
  * `frontend/src/features/resume/types.ts`
  * `frontend/src/features/resume/api/resumeApi.ts`
  * `frontend/src/features/resume/export/fileDownload.ts`
  * `frontend/src/features/resume/components/editor/ResumeEditorView.tsx`
  * `frontend/src/pages/WorkspacePage.tsx`
  * `frontend/src/features/resume/components/template-gallery/TemplateGalleryPreviewPanel.tsx`
  * `frontend/src/features/resume/hooks/useTemplateGalleryController.ts`
* Relevant backend files inspected:
  * `backend/src/main/java/com/smartresume/resume/controller/ResumeController.java`
  * `backend/src/main/java/com/smartresume/resume/service/ResumeImportService.java`
  * `backend/src/main/java/com/smartresume/resume/dto/ResumeDtos.java`
  * `backend/src/main/java/com/smartresume/export/controller/ExportController.java`
* Relevant specs:
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/backend/index.md`
  * `.trellis/spec/frontend/type-safety.md` notes that imported resume payloads should be validated before editable state.
* `rg.exe` failed with Access denied in this environment, so repo inspection used PowerShell `Get-ChildItem` / `Select-String`.

## Decision (ADR-lite)

**Context**: JSON import/export needs to fit the existing resume workflows without introducing a second creation or backup surface.

**Decision**: JSON import uses the template catalog's unified import entry; JSON export is added to the editor's existing export dropdown. The JSON format is lightweight and excludes schema version metadata, template metadata, hidden-section metadata, and full layout settings. Import keeps the selected template default layout and treats missing JSON sections as empty data.

**Consequences**: Users import all resume source files from one place and export the currently opened resume from the same menu as PDF/Word. JSON backups are intentionally focused on visible resume content, so restoring template identity or exact layout state is out of scope. A JSON round-trip preserves visible content and keeps omitted modules visible as empty sections. List-page export and current-resume overwrite import stay out of MVP.
