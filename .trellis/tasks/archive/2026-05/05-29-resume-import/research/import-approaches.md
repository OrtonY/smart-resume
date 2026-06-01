# Resume Import Approaches

## Context

Smart Resume stores editable resumes as structured sections:

* `personalInfo`
* `personalSummary`
* `education`
* `workExperience`
* `projectExperience`
* `skills`
* `honors`
* `certificates`

The backend already has:

* `ResumeService.createResume` and `ResumeContentService.saveSections` for creating and storing structured resumes.
* `AiChatService.callStructured(...)` for AI-backed structured JSON output with retry-on-parse-failure.
* Per-user ownership through `CurrentUserContext.requireUserId()`.

The frontend already has:

* A resume workspace list in `WorkspacePage`.
* Existing resume API helpers in `features/resume/api/resumeApi.ts`.
* Ant Design and i18n-based UI.

## Comparable Patterns

### Pattern A: Text-only import

Users paste resume text into a dialog. Backend sends text to `AiChatService.callStructured(...)` and creates a structured resume.

Pros:

* No new binary parsing dependency.
* Lower implementation and deployment risk.
* Easy to test with deterministic text.

Cons:

* Not a true file import.
* Users must manually copy from PDF/DOCX.
* Lower perceived product value.

### Pattern B: File upload + server-side text extraction + AI mapping

Users upload one resume file. Backend extracts text from the file, asks AI to map it into `ResumeContentPayload`, then creates a new editable resume.

Suggested dependencies:

* PDF: Apache PDFBox (`org.apache.pdfbox:pdfbox`)
* DOCX: Apache POI OOXML (`org.apache.poi:poi-ooxml`)

Pros:

* Matches user expectation for "import resume".
* Keeps parsing and AI mapping server-side, avoiding browser-specific extraction issues.
* Reuses existing AI structured output and resume persistence contracts.
* Can degrade cleanly: unsupported files and low-text files return localized errors.

Cons:

* Adds backend dependencies.
* PDF extraction quality depends on source PDF text layer; scanned/image PDFs will not work without OCR.
* AI configuration must be available for structured import.

### Pattern C: File upload + raw text preview before creating resume

Same as Pattern B, but the UI shows extracted text and asks the user to confirm before AI mapping and creating the resume.

Pros:

* Users can catch bad extraction before consuming AI.
* Easier to explain scanned-PDF failures.

Cons:

* More UI surface and extra workflow step.
* Slower MVP.
* Still needs backend parsing dependencies.

## Recommended MVP

Choose Pattern B:

* Add a workspace-level import action near existing resume actions.
* Upload one `.pdf`, `.docx`, or `.txt` file.
* Backend rejects unsupported file types, empty files, overly large files, and files with too little extracted text.
* Backend creates a new resume using the current user's default/template choice.
* AI maps extracted text to `ResumeContentPayload`.
* After import succeeds, frontend opens the new resume in the existing editor.

## Data Flow

```
User file -> frontend FormData -> POST /api/resumes/import
  -> backend file validation
  -> text extraction
  -> AI structured mapping
  -> ResumeService-style create + saveSections
  -> ResumeDetailResponse
  -> frontend navigate to /app/resumes/{id}
```

## Important Constraints

* Import must never bypass user ownership. All created resumes must set `userId` from `CurrentUserContext`.
* `AiChatService.callStructured(...)` should be used instead of ad hoc AI provider calls.
* Conversation ID should use `AiConversationIdGenerator` with a new feature type or an import-specific namespace documented in code/spec if needed.
* No silent fallback to fake or partial structured data if AI parsing fails.
* Scanned PDFs are out of scope unless OCR is explicitly added.

