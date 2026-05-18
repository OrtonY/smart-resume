# AI Resume Scoring

> Cross-layer contract for the resume scoring flow in the editor.

## Scenario: Resume scoring with optional JD and mock backend response

### 1. Scope / Trigger

- Trigger: the resume editor adds a structured scoring flow that spans UI, API, service, and future AI integration.
- Why this needs code-spec depth: the request/response contract must stay stable while the backend implementation moves from mock scoring to real AI scoring later.

### 2. Signatures

- Frontend API:
  - `scoreAiResume(payload: AiResumeScoreRequest): Promise<AiResumeScoreResponse>`
- Frontend component entry:
  - `ResumeScoreButton({ draft }: { draft: ResumeDetail })`
- Shared frontend mapper:
  - `toAiResumeContext(draft: ResumeDetail): AiResumeContext`
- Frontend local persistence:
  - `localStorage["smart-resume:resume-score:{resumeId}"] -> PersistedResumeScoreState`
- Backend API:
  - `POST /api/ai/resume-score`
- Backend service:
  - `AiResumeScoringService.scoreResume(AiResumeScoreRequest request): AiResumeScoreResponse`

### 3. Contracts

- Request body:
  - `jobDescription?: string`
    - optional
    - blank text is treated as absent
  - `resume: AiResumeContext`
    - required
    - same shape as AI chat context
    - fields:
      - `id: string`
      - `title: string`
      - `templateKey: string`
      - `content: ResumeContentPayload`
      - `layout: ResumeLayoutPayload`
- Response body:
  - `score: number`
    - integer percentage-like score
    - current mock implementation clamps to `35..96`
  - `summary: string`
  - `strengths: string[]`
  - `suggestionGroups: { title: string; suggestions: string[] }[]`
  - `jobDescriptionProvided: boolean`
  - `generatedAt: string`
    - ISO-8601 timestamp
  - `mode: "mock" | "live"`
- Ownership:
  - backend DTO naming is the source of truth for cross-layer field names
  - frontend must not reshape the response into ad hoc JSX-only objects before state storage
  - frontend stores only the last successful score per resume in browser local storage
  - persisted frontend state includes:
    - `jobDescription: string`
    - `result: AiResumeScoreResponse`
    - `version: 1`

### 4. Validation & Error Matrix

- Missing `resume` -> request validation error
- Blank `jobDescription` -> accepted, treated as not provided
- Partially filled resume sections -> accepted; scoring service derives suggestions from available content
- Backend still on mock mode -> return `mode = "mock"` and usable scoring payload, not a "not implemented" error
- Future real AI integration unavailable -> preserve the same response shape; callers should not need a new UI contract
- Local storage unavailable or JSON malformed -> frontend falls back to in-memory modal state and still allows fresh scoring

### 5. Good/Base/Bad Cases

- Good: user fills JD, submits scoring, sees `jobDescriptionProvided = true` and JD-oriented suggestion groups.
- Base: user leaves JD empty, still receives score, summary, strengths, and structured suggestions.
- Good: user closes the modal and reopens it later for the same resume, and the last successful score plus last scored JD are restored from local storage.
- Bad: backend returns free-form text only, forcing the frontend to parse or heuristically split advice cards.
- Bad: scoring flow reuses chat-stream payloads or SSE semantics, making a simple one-shot modal harder to manage.

### 6. Tests Required

- Frontend:
  - `npm run lint`
  - `npm run build`
  - assertion points:
    - score modal compiles with typed request/response
    - shared resume context mapper is reused by both chat and scoring entry points
    - last successful score can be restored per resume from local storage
- Backend:
  - `mvn test`
  - assertion points:
    - `AiResumeScoringServiceTest` covers JD provided and JD omitted cases
    - response always contains non-empty summary, strengths, and suggestion groups
    - mock mode returns a bounded numeric score

### 7. Wrong vs Correct

#### Wrong

- Create a second resume-to-AI context mapper just for scoring, letting chat and scoring drift over time.
- Return only a single markdown blob from the backend and let the modal split sections heuristically.
- Gate the mock endpoint behind AI vendor configuration even though no real provider call is made.

#### Correct

- Reuse one `AiResumeContext` mapping path for both AI chat and scoring.
- Keep scoring as a normal JSON request/response flow with explicit DTOs.
- Return a fully usable mock response now, then swap only the service internals when real AI scoring is introduced later.
