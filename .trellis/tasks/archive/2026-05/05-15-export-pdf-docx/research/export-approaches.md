# Export Approaches Research

## Comparable Patterns

* Browser print / DOM capture for PDF: fastest way to make the exported PDF match an existing React preview because it reuses the same rendered DOM and CSS. Trade-off: output quality depends on browser rendering, pagination CSS, and canvas/image capture details.
* Frontend document generation for DOCX: libraries such as `docx` can build editable `.docx` files in the browser from typed resume data. Trade-off: DOCX visual parity with the React preview is limited because Word layout is not CSS layout.
* Backend generation: Java libraries or a server-side rendering pipeline can produce files from resume data. Trade-off: it would duplicate the existing frontend template renderer unless we introduce a browser rendering service.
* Headless browser rendering: Playwright/Puppeteer can render the React preview and print it to PDF with strong visual parity. Trade-off: adds runtime dependency, deployment weight, and server orchestration.

## Current Package Snapshot

Checked npm package metadata on 2026-05-15:

* `docx` 9.6.1: browser and Node `.docx` generation with a declarative API.
* `jspdf` 4.2.1: JavaScript PDF generation.
* `html2canvas` 1.4.1: browser DOM screenshot capture.
* `@react-pdf/renderer` 4.5.1: React-based PDF document generation.
* `playwright` 1.60.0: browser automation / headless rendering.

## Repo Constraints

* Resume visual rendering already lives in `frontend/src/features/resume/components/ResumePreview.tsx`.
* The backend export controller is currently only a scaffolded placeholder endpoint.
* Frontend dependencies are intentionally lean: React, Ant Design, React Router.
* Backend is a Spring Boot modular monolith; export is an expected domain, but there is no service implementation yet.
* Resume data is typed in `frontend/src/features/resume/types.ts`, with layout order and hidden sections already normalized client-side.

## Feasible Approaches

### Approach A: Frontend MVP (Recommended)

Generate exports in the browser. PDF uses the existing preview DOM / print path, and DOCX uses typed resume data via `docx`.

Pros:
* Reuses the current preview instead of duplicating templates in Java.
* Lowest deployment complexity.
* Fast to deliver and test locally.

Cons:
* DOCX will be structured and editable, but not pixel-identical to the preview template.
* PDF quality depends on browser print/capture behavior.

### Approach B: Backend Document Service

Implement Spring services that convert `ResumeDetailResponse` into PDF and DOCX responses.

Pros:
* Centralized export API and easier future async job tracking.
* Consistent behavior across clients.

Cons:
* Requires Java-side template rendering or mapping that duplicates React template behavior.
* More dependencies and larger implementation surface.

### Approach C: Backend Headless Browser PDF + Structured DOCX

Use a headless browser for PDF visual parity, and a document library for DOCX.

Pros:
* Best PDF fidelity to the preview.
* Keeps downloads server-side.

Cons:
* Highest operational complexity.
* Adds browser runtime concerns to the backend deployment.

