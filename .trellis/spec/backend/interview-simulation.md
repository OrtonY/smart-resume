# Interview Simulation

> Runtime contract for interview session creation, optional company-context enrichment, and multi-round prompt injection.

---

## Scenario: Interview creation with optional company context

### 1. Scope / Trigger

- Trigger: interview creation now accepts an optional target company and uses AI once at creation time to derive reusable company context.
- Why this needs code-spec depth: this change spans database schema, request/response DTOs, AI extraction behavior, list filtering, and prompt injection rules. Drift in any layer silently changes interview behavior.

### 2. Signatures

#### Database migration

- `V15__interview_company_context.sql`

#### Persistence

```java
class InterviewSessionEntity {
    String targetCompany;
    String companyContextSummaryJson;
    String companyContextStatus;
}
```

#### Request / response

```java
public record InterviewCreateRequest(
    String resumeId,
    String targetCompany,
    String title,
    String jobDescription,
    String difficulty,
    List<String> interviewerRoles
) {}
```

```java
public record InterviewSummaryResponse(
    ...,
    String targetCompany,
    List<String> companyContextSummary,
    String companyContextStatus,
    ...
) {}
```

```java
public record InterviewDetailResponse(
    ...,
    String targetCompany,
    List<String> companyContextSummary,
    String companyContextStatus,
    ...
) {}
```

#### API surface

- `GET /api/interviews?resumeId=&status=&targetCompany=&keyword=&page=&pageSize=`
- `POST /api/interviews`

#### Service contracts

```java
InterviewPageResponse listInterviews(
    String resumeId,
    String status,
    String targetCompany,
    String keyword,
    int page,
    int pageSize
)
```

```java
InterviewPromptBuilder.buildSystemPrompt(
    String role,
    String difficulty,
    String resumeJson,
    String jobDescription,
    String targetCompany,
    List<String> companyContextSummary,
    int currentQuestionCount,
    int maxQuestions,
    List<String> previousRoundTopics
)
```

### 3. Contracts

- `target_company` is optional and stores the raw normalized company name entered at interview creation time.
- `company_context_summary_json` stores up to 3 normalized summary bullets as a JSON array string.
- `company_context_status` is required at runtime and must be one of:
  - `NOT_REQUESTED`
  - `READY`
  - `FAILED`
- AI company-context extraction runs only during `createInterview(...)`.
- If extraction succeeds with a non-empty summary:
  - persist summary JSON
  - persist status `READY`
  - expose both fields on list/detail responses
- If extraction returns empty or throws:
  - still create the interview
  - persist empty summary JSON
  - persist status `FAILED`
  - do not inject company context into later prompts
- Prompt injection rule:
  - only inject company context when status is `READY` and summary list is non-empty
  - company context is optional seasoning, not the primary scope of the interview
  - prompts must explicitly tell the model not to make every question company-specific
- Filtering rule:
  - `targetCompany` query filters by case-insensitive partial match against `interview_sessions.target_company`
  - `keyword` search also matches `targetCompany` in addition to title and JD

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| `resumeId` and `jobDescription` both blank | `400 Bad Request` |
| `targetCompany` blank | normalize to `null`, status becomes `NOT_REQUESTED` |
| `targetCompany` present and AI extraction succeeds with bullets | create interview with `READY` |
| `targetCompany` present and AI extraction returns empty / throws | create interview with `FAILED` |
| `company_context_status` contains unknown persisted value | normalize to `NOT_REQUESTED` when reading |
| `company_context_summary_json` malformed | treat as server error; do not silently invent fallback summary |

### 5. Good/Base/Bad Cases

- Good: user enters `阿里云`, AI extracts 2 to 3 stable business/context bullets, interview list card shows the company name, detail view shows the bullets, and prompts only occasionally use that context.
- Base: user enters a company name but extraction fails; interview is still created and runs like a normal interview without company-specific prompt injection.
- Bad: company extraction is retried on every message or every page load, creating unstable prompt drift and unnecessary AI cost.
- Bad: every interviewer question is rewritten to mention the target company, causing the interview to become too narrow.

### 6. Tests Required

- Migration test or startup validation proving the new columns exist.
- `InterviewServiceTest` assertions for:
  - `READY` path with persisted summary
  - `FAILED` path that still creates the interview
  - `targetCompany` list filtering
  - topic extraction prompt still works after DTO expansion
- Frontend build/lint assertions after type expansion and new modal UI.
- Prompt-level assertion that company context is injected only when status is `READY`.

### 7. Wrong vs Correct

#### Wrong

- Recompute company context every round or every message send.
- Treat `targetCompany` as equivalent to “all interview questions must reference this company”.
- Drop the interview creation entirely when company-context extraction fails.

#### Correct

- Extract once during creation, persist the summary, and reuse it in later prompts.
- Keep company context optional and occasional inside the interview prompt.
- Fall back to a normal interview when extraction fails, while preserving the original company name for filtering and display.

---

## Scenario: AI Assist (answer generation + scoring)

### 1. Scope / Trigger

- Trigger: users need reference answers and self-assessment scoring for interview questions, persisted to avoid repeated AI calls.
- Why this needs code-spec depth: introduces a new table, two streaming endpoints, two prompt templates, and a status state machine that must stay consistent across stream lifecycle hooks.

### 2. Signatures

#### Database migration

- `V20__create_interview_ai_assists.sql`

#### Persistence

```java
class InterviewAiAssistEntity {
    String id;
    String messageId;       // FK → interview_messages(id)
    String sessionId;       // FK → interview_sessions(id)
    Long userId;
    String answerContent;
    String answerStatus;    // PENDING | GENERATING | READY | FAILED
    String candidateAnswer; // snapshot of user's answer at scoring time
    Integer score;          // 0-100, nullable
    String feedback;        // markdown
    String scoreStatus;     // PENDING | GENERATING | READY | FAILED
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

#### API surface

- `GET /api/interviews/{interviewId}/messages/{messageId}/assist` → `InterviewAssistResponse`
- `POST /api/interviews/{interviewId}/messages/{messageId}/answer-stream` → `Flux<AiChatEvent>` (text/event-stream, empty body)
- `POST /api/interviews/{interviewId}/messages/{messageId}/score-stream` → `Flux<AiChatEvent>` (body: `{ candidateAnswer: string }`)

#### Service contracts

```java
InterviewAssistResponse getAssist(String sessionId, String messageId);
Flux<AiChatEvent> streamAnswer(String sessionId, String messageId);
Flux<AiChatEvent> streamScore(String sessionId, String messageId, String candidateAnswer);
```

### 3. Contracts

- One row per interviewer message (unique index on `message_id`). Answer and score are independent columns updated by separate endpoints.
- ConversationId isolation: `"interview-{sessionId}-answer-{messageId}"` and `"interview-{sessionId}-score-{messageId}"` — never collides with the main interview round conversation.
- Status state machine: `PENDING → GENERATING → READY | FAILED`. The `GENERATING` state is transient and must always be resolved by stream lifecycle hooks.
- Score parsing: AI is prompted to emit `SCORE: <0-100>` on the first line followed by markdown feedback. Service parses with regex; if parsing fails, `score` stays null and full text becomes `feedback` with status `READY`.
- `candidateAnswer` snapshot: persisted at scoring time so the displayed score always corresponds to the exact text that was evaluated.
- Report isolation: `InterviewReportService` must never read `interview_ai_assists`. The table is purely for user self-study.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| `messageId` not found or not in this session | `404 Not Found` |
| Message role is not `INTERVIEWER` | `400 Bad Request` |
| `candidateAnswer` blank on score-stream | `400 Bad Request` with message "请先输入回答内容再进行评分" |
| Session not owned by current user | `404 Not Found` |
| Stream cancelled (user closes modal) | Persist partial content as `READY` if non-empty, else `FAILED` |
| Stream errors (AI provider failure) | Persist partial content + `FAILED` status |
| No assist row exists on GET | Return response with null fields and both statuses as `PENDING` |

### 5. Good/Base/Bad Cases

- Good: user opens AI answer modal, stream completes, answer is persisted as READY. User reopens modal — instant cache hit, zero AI cost.
- Good: user clicks "regenerate" — old row's `answerStatus` flips to GENERATING, new content overwrites old.
- Base: user closes modal mid-stream — partial content is saved as READY (still useful), next open shows partial + regenerate button.
- Bad: `answerStatus` stuck at GENERATING after a crash — frontend should treat GENERATING as "in-flight or stale" and offer regenerate.
- Bad: score endpoint called without candidateAnswer — rejected with 400, no DB write.

### 6. Tests Required

- `InterviewAssistServiceTest`:
  - `streamAnswer` happy path persists row with status READY and non-empty content.
  - `streamScore` rejects blank candidateAnswer with AppException.
  - `streamScore` parses `SCORE: 85` prefix correctly.
  - `streamScore` handles missing SCORE prefix gracefully (score=null, full text as feedback).
  - `getAssist` returns PENDING statuses when no row exists.

### 7. Wrong vs Correct

#### Wrong

```java
// Writing AI assist content into interview_messages table
InterviewMessageEntity aiAnswer = new InterviewMessageEntity();
aiAnswer.setRole("AI_ANSWER");
aiAnswer.setContent(generatedText);
interviewMessageMapper.insert(aiAnswer);
```

Issues: pollutes the interview transcript, breaks report generation, breaks sort_order logic.

#### Correct

```java
// Separate table, separate service, isolated conversationId
InterviewAiAssistEntity entity = findOrCreateAssist(messageId, sessionId, userId);
entity.setAnswerContent(generatedText);
entity.setAnswerStatus("READY");
interviewAiAssistMapper.update(entity);
```

#### Wrong

```java
// Using the main interview conversationId for AI answer
String conversationId = session.getAiConversationId();
aiChatService.stream(new AiInvocationRequest(prompt, question, conversationId));
```

Issues: AI answer context leaks into the interviewer's memory, causing the interviewer to reference its own "ideal answer" in subsequent questions.

#### Correct

```java
// Isolated conversationId per auxiliary feature
String conversationId = "interview-" + sessionId + "-answer-" + messageId;
aiChatService.stream(new AiInvocationRequest(prompt, question, conversationId));
```
