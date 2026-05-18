# AI Resume Scoring

> Cross-layer contract for the resume scoring flow in the editor.

## Scenario: Resume scoring backed by the shared AI invocation layer

### 1. Scope / Trigger

- Trigger: the resume editor adds a structured scoring flow that spans UI, API, service, and AI integration.
- Why this needs code-spec depth: the request/response contract must stay stable across the mock → AI migration, and the AI implementation must follow the shared invocation policy defined in [ai-chat-service.md](./ai-chat-service.md).
- Current implementation: backed by real AI through `AiChatService.callStructured` (see [ai-chat-service.md](./ai-chat-service.md)). The earlier mock path has been removed.

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
    - integer percentage-like score, expected range `0..100`
  - `summary: string`
  - `strengths: string[]`
  - `suggestionGroups: { title: string; suggestions: string[] }[]`
  - `jobDescriptionProvided: boolean`
  - `generatedAt: string`
    - ISO-8601 timestamp
  - `mode: "ai"`
    - constant since the mock path was removed; reserved as an enum-shaped field for future variants (e.g. `"ai-cached"`)
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
- Partially filled resume sections -> accepted; the scoring prompt derives suggestions from available content
- AI provider parse failure -> `AiChatService.callStructured` retries once silently; if the retry also fails, the service throws and the controller maps it to a 5xx error. **Do NOT** fall back to a mock score.
- AI provider unavailable / configuration missing -> propagate as a service error with the existing error envelope; frontend should display the error rather than render a fabricated score.
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
    - response always has `mode = "ai"`
    - each call uses a freshly generated `conversationId` via `AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_SCORE)`
    - parse-failure path: assert the service throws after the single retry exhausts; assert NO mock-shaped payload is returned

### 7. Wrong vs Correct

#### Wrong

- Create a second resume-to-AI context mapper just for scoring, letting chat and scoring drift over time.
- Return only a single markdown blob from the backend and let the modal split sections heuristically.
- Call `ChatModel` / `ChatClient` directly from `AiResumeScoringService` and skip `AiChatService.callStructured` — loses memory persistence, vendor branching, and the retry-once policy.
- Catch the structured-output exception and synthesise a mock-shaped response so the UI "still works" — silently hides AI regressions in production.

#### Correct

- Reuse one `AiResumeContext` mapping path for both AI chat and scoring.
- Keep scoring as a normal JSON request/response flow with explicit DTOs.
- Build an `AiInvocationRequest` with a fresh `AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_SCORE)` id and invoke `aiChatService.callStructured(req, AiResumeScoreResponse.class)`; let exceptions bubble.

---

## Technical Notes

- The frontend strips `personalInfo.avatar` from the `AiResumeContext` before sending requests to save context tokens and reduce latency. The backend should not assume `avatar` is present in the resume context payload.
