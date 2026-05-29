# Optimize PDF Export Fallback

## Goal

Make PDF export feel like one reliable user action: the editor and public share page should prefer backend PDF export by default, and when backend export fails, automatically fall back to the existing frontend snapshot export so users do not need to understand or choose between export implementations.

## Requirements

* Authenticated editor PDF export defaults to backend-generated PDF.
* Public share-page PDF export also defaults to backend-generated PDF.
* If authenticated backend export fails, the editor automatically attempts frontend snapshot export from the existing `.resume-export-source` preview root.
* If public share backend export fails, the share page automatically attempts frontend snapshot export from an equivalent `.resume-export-source` preview root.
* Users see one coherent PDF export action, not separate backend/screenshot implementation choices.
* Fallback success is quiet: show only the normal PDF download success message and do not show the backend failure.
* If both backend and frontend fallback fail, show one clear failure message.
* Keep user-facing text in the existing i18n namespaces and update both zh-CN and en-US when keys change.

## Acceptance Criteria

* [ ] Clicking editor "Export PDF" calls the backend export path first.
* [ ] When editor backend export succeeds, the frontend snapshot path is not invoked.
* [ ] When editor backend export rejects and an export preview root exists, frontend snapshot export is invoked automatically.
* [ ] Desktop and mobile editor menus expose the same simplified one-action export behavior.
* [ ] Public share-page "Download PDF" calls backend share export first.
* [ ] When public share backend export rejects and an export preview root exists, frontend snapshot export is invoked automatically.
* [ ] When fallback succeeds, the user receives a success message and no backend-error toast that would create doubt.
* [ ] When both backend and fallback fail, the user receives one clear error message.
* [ ] Existing off-screen export source styling remains compatible with the frontend rasterization guidelines.

## Definition of Done

* Frontend build/type-check passes.
* Frontend lint passes or any unrelated lint baseline issue is documented.
* i18n keys updated in both zh-CN and en-US if user-facing text changes.
* Rollback is straightforward: restore the prior separate export menu behavior.

## Technical Approach

* Keep `exportResumeServerPdf`, `exportSharePdf`, and `exportResumePdf` as the low-level export primitives.
* Add orchestration in page-level handlers so each user action tries backend export first and catches failures internally before attempting snapshot export.
* Simplify `ResumeEditorView` export props and menus to one PDF export callback.
* Add a hidden `.resume-export-source` to `PublicSharePage` for fallback capture instead of capturing the responsive visible preview.
* Reuse `exportResumePdf(previewRoot, title)` for both editor and share fallback to preserve the existing `html2canvas` / `jspdf` path.

## Decision (ADR-lite)

**Context**: The app already has backend PDF export and frontend snapshot export, but exposing both choices makes users reason about implementation details. Public share downloads currently have no fallback.

**Decision**: Apply backend-first PDF export with automatic frontend snapshot fallback to both the authenticated editor and public share-page download flows. Fallback success remains quiet so users only perceive a successful PDF download.

**Consequences**: The editor UI can be simplified to one export action. The share page needs a frontend-capturable preview root using the same off-screen export styling as the editor. Backend PDF quality remains preferred, while frontend snapshot export becomes the resilience path.

## Out of Scope

* Replacing the backend PDF renderer.
* Replacing `html2canvas` / `jspdf` snapshot export.
* Adding new export formats.
* Changing resume preview visual templates unless required for fallback correctness.

## Technical Notes

* Branch: `codex/pdf-export-frontend-fallback`.
* Task path: `.trellis/tasks/05-29-pdf-export-frontend-fallback`.
* Relevant files inspected:
  * `frontend/src/pages/WorkspacePage.tsx`
  * `frontend/src/pages/PublicSharePage.tsx`
  * `frontend/src/features/resume/components/editor/ResumeEditorView.tsx`
  * `frontend/src/features/resume/components/ResumePreview.tsx`
  * `frontend/src/features/resume/export/serverPdfExport.ts`
  * `frontend/src/features/resume/export/pdfExport.ts`
  * `frontend/src/features/resume/export/fileDownload.ts`
  * `frontend/src/index.css`
  * `frontend/src/i18n/locales/zh-CN/workspace.json`
  * `frontend/src/i18n/locales/en-US/workspace.json`
  * `frontend/src/i18n/locales/zh-CN/share.json`
  * `frontend/src/i18n/locales/en-US/share.json`
  * `.trellis/spec/frontend/component-guidelines.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
  * `.trellis/spec/frontend/state-management.md`
* `rg.exe` is currently blocked by OS access denial in this environment; used `git ls-files`, `Get-ChildItem`, and `Select-String` instead.
