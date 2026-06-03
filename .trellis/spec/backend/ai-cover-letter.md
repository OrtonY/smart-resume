# AI Cover Letter Generation

> Cross-layer contract for persisted AI-generated cover letters from the resume editor.

## Scenario: Resume-scoped cover-letter generation with editable history

### 1. Scope / Trigger

- Trigger: the resume editor can generate application-ready cover letters from the current resume and persist them as editable history records.
- Why this needs code-spec depth: the flow spans editor state persistence, authenticated backend lookup, AI structured output, database storage, optional job-application linkage, and frontend history editing.

### 2. Signatures

- Frontend API:
  - `generateAiCoverLetter(resumeId, payload): Promise<AiCoverLetter>`
  - `listAiCoverLetters(resumeId): Promise<AiCoverLetter[]>`
  - `getAiCoverLetter(resumeId, coverLetterId): Promise<AiCoverLetter>`
  - `updateAiCoverLetter(resumeId, coverLetterId, payload): Promise<AiCoverLetter>`
  - `deleteAiCoverLetter(resumeId, coverLetterId): Promise<void>`
- Backend API:
  - `POST /api/ai/resumes/{resumeId}/cover-letters`
  - `GET /api/ai/resumes/{resumeId}/cover-letters`
  - `GET /api/ai/resumes/{resumeId}/cover-letters/{coverLetterId}`
  - `PUT /api/ai/resumes/{resumeId}/cover-letters/{coverLetterId}`
  - `DELETE /api/ai/resumes/{resumeId}/cover-letters/{coverLetterId}`
- Backend service:
  - `AiCoverLetterService.generate(String resumeId, AiCoverLetterGenerateRequest request)`
  - `AiCoverLetterService.list(String resumeId)`
  - `AiCoverLetterService.get(String resumeId, String coverLetterId)`
  - `AiCoverLetterService.update(String resumeId, String coverLetterId, AiCoverLetterUpdateRequest request)`
  - `AiCoverLetterService.delete(String resumeId, String coverLetterId)`
- Database:
  - `ai_cover_letters`
- AI feature enum:
  - `AiFeatureType.RESUME_COVER_LETTER("resume_cover_letter")`

### 3. Contracts

- Generate request:
  - `applicationId?: string`
    - optional
    - if present, must belong to the current user
    - if the application already has `resume_id`, it must match the current `resumeId`
  - `company: string`
    - required, non-blank
  - `position: string`
    - required, non-blank
  - `jobDescription?: string`
    - optional
  - `extraNotes?: string`
    - optional
  - `outputLanguage: "CHINESE" | "ENGLISH"`
    - required
- Update request:
  - `title?: string`
    - optional; blank means keep existing title
  - `body: string`
    - required, non-blank
- Response:
  - `id`, `resumeId`, `applicationId`, `company`, `position`, `jobDescription`, `extraNotes`, `outputLanguage`, `title`, `body`, `createdAt`, `updatedAt`
- Prompt ownership:
  - backend loads resume content with `ResumeLookupService.requireResume(resumeId, userId)`
  - backend serializes AI-visible resume content with `ResumeContentService.buildAiVisibleContentJson(resume)`
  - frontend must not send arbitrary resume content for cover-letter generation
- AI invocation:
  - use `AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_COVER_LETTER)`
  - call `AiChatService.callStructured(request, AiCoverLetterGenerationResult.class)`
  - no fallback or mock cover letter may be returned when AI fails or returns blank `title` / `body`
- Frontend editor flow:
  - save the latest draft before calling the generation endpoint
  - expose the action on desktop and mobile editor menus
  - keep generation and history in one modal

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| User cannot access `resumeId` | existing resume lookup not-found/auth path |
| `company` blank | `400 validation.ai.coverLetterCompanyRequired` or service-level `error.ai.coverLetterCompanyRequired` |
| `position` blank | `400 validation.ai.coverLetterPositionRequired` or service-level `error.ai.coverLetterPositionRequired` |
| `outputLanguage` blank | `400 validation.ai.coverLetterLanguageRequired` or service-level `error.ai.coverLetterLanguageRequired` |
| `applicationId` not found or belongs to another user | `404 error.application.notFound` |
| `applicationId` belongs to another resume | `409 error.ai.coverLetterApplicationResumeMismatch` |
| AI structured output parse fails after retry | shared `AiChatService.callStructured` exception; do not synthesize content |
| AI returns blank title | `500 error.ai.coverLetterEmptyTitle` |
| AI returns blank body | `500 error.ai.coverLetterEmptyBody` |
| Cover letter not owned by current user or not under current resume | `404 error.ai.coverLetterNotFound` |
| Update body blank | `400 validation.ai.coverLetterBodyRequired` or service-level `error.ai.coverLetterBodyRequired` |

### 5. Good/Base/Bad Cases

- Good: user opens the editor, fills company/position/JD, generates a Chinese cover letter, edits the body, saves it, and sees it in the history tab on reload.
- Good: user links an application with no resume binding or the same resume binding; the cover letter stores `applicationId`.
- Base: user generates without JD or extra notes; prompt uses company, position, selected language, and visible resume content.
- Base: user updates only the body and leaves the title blank; the existing title is preserved.
- Bad: frontend calls the AI provider directly with local draft content, bypassing backend auth and prompt ownership.
- Bad: backend stores a cover letter for an application tied to a different resume.
- Bad: backend catches AI failure and returns placeholder cover-letter text.
- Bad: editor exposes the action only on desktop and omits mobile overflow menu parity.

### 6. Tests Required

- Backend:
  - generation validates resume ownership and required fields
  - generation validates optional application ownership and resume compatibility
  - generation uses `AiChatService.callStructured` with `AiCoverLetterGenerationResult.class`
  - generated conversation id contains `resume_cover_letter`
  - generated title/body are persisted with `user_id`, `resume_id`, optional `application_id`, target fields, language, and timestamps
  - blank AI title/body throws instead of persisting fabricated content
  - list/detail/update/delete enforce current-user and current-resume ownership
- Frontend:
  - `npm run build` and `npm run lint` pass under the supported Node version
  - editor action appears in desktop actions and mobile overflow menu
  - generation form validates company and position before calling the API
  - page-level generation saves the draft before calling `generateAiCoverLetter`
  - history detail supports copy, edit/save, and delete states
  - `zh-CN` and `en-US` locale keys exist for new UI text

### 7. Wrong vs Correct

#### Wrong

```typescript
// Sends local draft content directly to AI or backend generation.
generateAiCoverLetter(resume.id, {
  company,
  position,
  outputLanguage,
  resume: draft,
})
```

Issues: bypasses backend-owned resume lookup, may include stale or unauthorized content, and duplicates prompt serialization.

#### Correct

```typescript
await saveDraftNow(resumeId, draft)
const letter = await generateAiCoverLetter(resumeId, {
  company,
  position,
  jobDescription,
  extraNotes,
  outputLanguage,
})
```

The backend loads the current user's persisted resume and builds the AI-visible content.

#### Wrong

```java
try {
    return aiChatService.callStructured(req, AiCoverLetterGenerationResult.class);
} catch (Exception e) {
    return new AiCoverLetterGenerationResult("Cover Letter", "Please edit this placeholder.");
}
```

Issues: silent fallback hides AI/provider failures and stores fabricated content.

#### Correct

```java
AiCoverLetterGenerationResult result =
    aiChatService.callStructured(req, AiCoverLetterGenerationResult.class);
String title = requireGeneratedText(result.title(), "error.ai.coverLetterEmptyTitle");
String body = requireGeneratedText(result.body(), "error.ai.coverLetterEmptyBody");
```

The service treats blank or invalid AI output as a real failure.
