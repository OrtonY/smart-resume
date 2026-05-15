# Implement PDF and DOCX Export

## Goal

Implement real export functionality for Smart Resume so users can download their current resume as PDF and DOCX instead of receiving the existing scaffold message.

## What I Already Know

* The user reported that export is not implemented and requested PDF and DOCX export.
* The backend has `ExportController` with `POST /api/resumes/{resumeId}/exports/pdf`, but it returns only an `ExportPlaceholderResponse`.
* The frontend has a `导出 PDF` button in `WorkspacePage.tsx` that calls `requestPdfExport()` and displays the placeholder message.
* Resume rendering is centralized in `ResumePreview.tsx`, with A4 preview and paged preview support.
* Resume data and layout are strongly typed in `frontend/src/features/resume/types.ts`.
* The frontend currently has no document/PDF export dependencies.
* The backend is Spring Boot, Java 21, MyBatis-Flex, and feature-oriented by domain.

## Assumptions (Temporary)

* MVP should export the current saved/draft resume from the editor view.
* PDF should prioritize matching the current visual preview.
* DOCX should prioritize being editable and containing all visible resume content, even if it is not pixel-identical to the visual template.
* Exporting deleted resumes, share-page exports, async job tracking, and historical version exports are out of scope unless the user asks for them.

## Open Questions

* None.

## Requirements (Evolving)

* Add real PDF export from the resume editor.
* Add real DOCX export from the resume editor.
* Replace the placeholder-only PDF flow in the frontend.
* Preserve section order and hidden section behavior in exported output.
* Provide useful success/error feedback in the UI.
* Scope is confirmed as current requirement only: editor export for the current resume, with no server-side export infrastructure in this task.

## Acceptance Criteria (Evolving)

* [x] Clicking PDF export downloads or opens a real PDF representation of the current resume.
* [x] Clicking DOCX export downloads a real `.docx` file containing the current resume content.
* [x] Hidden sections are excluded and reordered sections keep their editor order.
* [x] Export buttons do not silently succeed when generation fails.
* [x] Frontend build passes.
* [x] DOCX export adapts to the active template layout and theme tokens instead of rendering as a plain black-and-white text dump.

## Definition of Done (Team Quality Bar)

* Tests added/updated where appropriate.
* Lint / typecheck / CI green.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Research References

* [`research/export-approaches.md`](research/export-approaches.md) — Frontend MVP is the lowest-complexity path because existing React preview already owns visual rendering.

## Research Notes

### Feasible Approaches Here

**Approach A: Frontend MVP** (Recommended)

* How it works: PDF exports from the existing preview/print path; DOCX is generated from typed resume data in the browser.
* Pros: avoids duplicating templates in Java, fastest to deliver, low deployment risk.
* Cons: DOCX is editable and complete but not pixel-identical to the preview.

**Approach B: Backend Document Service**

* How it works: Spring services convert resume data into downloadable PDF/DOCX responses.
* Pros: centralized export API and consistent behavior across clients.
* Cons: likely duplicates React template rendering or requires a new template layer.

**Approach C: Backend Headless Browser PDF + Structured DOCX**

* How it works: server renders the React preview through a browser engine for PDF and builds DOCX separately.
* Pros: strongest PDF fidelity.
* Cons: highest deployment and runtime complexity.

## Expansion Sweep

### Future Evolution

* Export could later support async jobs, export history, version snapshots, and share-page downloads.
* A backend export domain may still be valuable if the product needs server-side file storage or queued generation.

### Related Scenarios

* Export behavior should stay consistent with template selection, section ordering, section hiding, and share snapshots.
* The existing placeholder backend endpoint should either be removed from the active UI path or replaced later by a real service.

### Failure & Edge Cases

* Export should handle empty sections, missing personal info, long content spanning multiple pages, and avatar images.
* UI should report generation errors instead of showing scaffold/success messages.

## Out of Scope (Explicit)

* Server-side export job tracking.
* Export history and stored files.
* Exporting share links or historical resume versions.
* Pixel-perfect DOCX parity with the React preview.
* Rebuilding all visual templates in Java.

## Decision (ADR-lite)

**Context**: The current export button calls a backend scaffold endpoint that returns a message. The React preview already owns visual rendering and template layout.

**Decision**: Implement the MVP in the frontend. PDF export will render the current preview into a downloadable PDF, while DOCX export will generate an editable structured document from the current resume data.

**Consequences**: This avoids Java-side template duplication and keeps deployment simple. DOCX content will be complete and editable, but not pixel-identical to the preview. Backend export infrastructure remains available for a later task if share-page, versioned, stored, or queued exports become necessary.

## Technical Notes

* Inspected `backend/src/main/java/com/smartresume/export/controller/ExportController.java`.
* Inspected `frontend/src/pages/WorkspacePage.tsx`.
* Inspected `frontend/src/features/resume/api/resumeApi.ts`.
* Inspected `frontend/src/features/resume/components/ResumePreview.tsx`.
* Inspected `frontend/src/features/resume/types.ts`.
* Inspected frontend and backend Trellis spec indexes.
* Verified with `npm run build` using bundled Node 20 runtime because the system default Node 16 does not satisfy Vite 8 engine requirements.
* Verified with `npm run lint` using bundled Node 20 runtime.
