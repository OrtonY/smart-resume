# AI Chat Service (Shared Invocation Layer)

> Reusable AI invocation abstraction shared by resume chat, resume scoring, and (future) interview simulation and interview report.

---

## Scenario: Shared AI invocation surface for all AI-powered features

### 1. Scope / Trigger

- Trigger: more than one feature needs to call the configured LLM; the original `AiAgentService` was hardcoded for resume chat only.
- Why this needs code-spec depth: every new AI feature must go through this layer instead of writing its own `ChatModel` / `Prompt` plumbing, otherwise memory persistence, conversation-id format, structured-output handling, and vendor branching will drift.

### 2. Signatures

```java
package com.smartresume.ai.service;

public interface AiChatService {
    Flux<AiChatEvent> stream(AiInvocationRequest request);
    String call(AiInvocationRequest request);
    <T> T callStructured(AiInvocationRequest request, Class<T> responseType);
}
```

```java
package com.smartresume.ai.dto;

public record AiInvocationRequest(
    String systemPrompt,
    String userMessage,
    String conversationId,                          // required, generated via AiConversationIdGenerator
    UnaryOperator<String> persistenceSanitizer      // optional; null = persist verbatim
) {
    // 3-arg convenience constructor leaves persistenceSanitizer null
    public AiInvocationRequest(String systemPrompt, String userMessage, String conversationId) { ... }
}
```

```java
package com.smartresume.ai.memory;

public enum AiFeatureType {
    RESUME_CHAT("resume_chat"),
    RESUME_SCORE("resume_score"),
    RESUME_IMPORT("resume_import"),
    INTERVIEW("interview"),
    INTERVIEW_REPORT("interview_report");
    // String getCode()
}

public final class AiConversationIdGenerator {
    public static String generate(String resumeId, AiFeatureType feature);
    // returns "{resumeId|default}_{feature.code}_{yyyyMMddHHmmssSSS}"
}
```

### 3. Contracts

- `AiInvocationRequest.conversationId` — required, non-null, non-blank. Callers MUST obtain it through `AiConversationIdGenerator.generate(...)`, never hand-roll. **Exception**: the interview feature uses per-round conversationIds (`"interview-{sessionId}-round-{roundIndex}"`) for multi-round context isolation — this is an intentional deviation documented in the interview module spec.
- **Auxiliary-feature conversationId isolation**: when a feature adds AI-powered helpers that operate alongside a primary conversation (e.g., AI answer generation or scoring for an interview question), the helper MUST use a distinct conversationId namespace that cannot collide with the primary flow. Convention: `"{feature}-{primaryId}-{helper}-{targetId}"` (e.g., `"interview-{sessionId}-answer-{messageId}"`, `"interview-{sessionId}-score-{messageId}"`). This prevents auxiliary context from leaking into the primary conversation's chat memory window and confusing subsequent prompts.
- All three methods write to `spring_ai_chat_memory` unconditionally so every interaction is auditable.
- **No double-write of the user turn.** `AiChatServiceImpl.buildPromptWithMemory` already calls `chatMemory.add(conversationId, userMessage)` before invoking the provider. A feature module that mirrors AI turns into its own domain table (e.g. `interview_messages`) MUST persist DB-only for the user message and MUST NOT also call `chatMemoryRepository.saveAll(...)` / `chatMemory.add(...)` for that same turn. The convention in `InterviewService` is to keep two helpers: `appendMessage` (DB + chat memory, used by non-streaming code paths that bypass `AiChatService`) and `persistMessage` (DB only, used inside `streamMessage`/anything else that delegates to `aiChatService.stream/call`). Failing to split these results in duplicate user messages in `spring_ai_chat_memory`, which then replay into the next prompt and confuse the model.
- **Persisting the assistant turn from a stream consumer.** When a feature's controller exposes its own SSE endpoint that delegates to `aiChatService.stream(...)`, accumulate the `message`-typed event content into a `StringBuilder` and persist the full assistant text in `doOnComplete`. Do not persist per chunk. The shared service still writes the assistant turn to `spring_ai_chat_memory` on its own — the feature's `doOnComplete` is responsible only for the feature's domain table (e.g. `interview_messages`).
- **Stream lifecycle status tracking.** When a feature persists AI-generated content with a status field (e.g., `PENDING → GENERATING → READY/FAILED`), the stream hooks (`doOnComplete`, `doOnCancel`, `doOnError`) must all transition the status out of `GENERATING`. Use a `boolean[] completed = {false}` guard to ensure exactly one hook fires the persistence write — Reactor may invoke multiple terminal signals in edge cases (cancel + error). Pattern:
  ```java
  boolean[] completed = { false };
  return aiChatService.stream(request)
      .doOnNext(event -> { if ("message".equals(event.type())) sb.append(event.content()); })
      .doOnComplete(() -> { if (completed[0]) return; completed[0] = true; persistReady(entity, sb); })
      .doOnCancel(() -> { if (completed[0]) return; completed[0] = true; persistPartial(entity, sb); })
      .doOnError(err -> { if (completed[0]) return; completed[0] = true; persistFailed(entity, sb); });
  ```
- `stream()` — server-sent character-level deltas; consumers (`AiAgentService`) may apply UI delay (resume chat uses 12ms/char).
- `call()` — synchronous free-text return; for prose-style outputs (e.g. future interview-report prose).
- `callStructured(request, T.class)` — synchronous structured return using Spring AI `BeanOutputConverter<T>`. Internal policy:
  - **Vendor branching**: when the provider exposes `response_format: json_schema` (OpenAI / DeepSeek), the converter's schema is sent natively. For Ollama / providers that ignore the field, the converter's schema text is injected into the prompt as a soft constraint and the response is parsed with Jackson.
  - **Retry policy**: if parsing the model output into `T` fails, retry the same prompt exactly **once**. If the second attempt also fails, throw — DO NOT fall back to mock or partial data.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| `conversationId` null / blank | Reject at service boundary; this is a programming error, not a user error |
| `userMessage` blank | Reject; callers must compose at least one user turn before invocation |
| Provider raises during `stream()` | Emit an SSE `error` event; do not bubble into the global JSON exception handler |
| Provider raises during `call()` / `callStructured()` | Rethrow as a service exception; caller decides HTTP mapping |
| `callStructured()` parse fails once | Retry once silently (log at WARN with conversationId) |
| `callStructured()` parse fails twice | Throw `AiStructuredOutputException` (or equivalent); never substitute fake data |
| Memory write fails | Surface as a service exception — do not silently swallow; persistence is part of the contract |

### 5. Good/Base/Bad Cases

- **Good**: a new feature (e.g. interview report) calls `aiChatService.callStructured(req, InterviewReport.class)` with a fresh `AiConversationIdGenerator.generate(resumeId, INTERVIEW_REPORT)` ID and gets a strongly-typed object back; memory is automatically written.
- **Base**: resume scoring uses `callStructured` per request, generates a new conversation id every call (no continuity), surfaces parse errors to the user.
- **Bad**: a feature writes its own `ChatClient.prompt().call()` path and constructs an ad hoc conversation id like `"interview-" + UUID.randomUUID()`, bypassing `AiChatService` — memory rows become unjoinable, vendor branching diverges, and retry policy is lost.
- **Bad**: a feature catches the second parse failure and falls back to mock content. Truthful errors are mandatory; silent fallback hides production AI regressions.
- **Bad**: a feature calls `aiChatService.stream(req)` AND also writes the user message to `chatMemoryRepository` / `chatMemory.add(...)` in its own code. This double-writes the user turn into `spring_ai_chat_memory`, causing the model to see the same user message twice on the next prompt replay.

### 6. Tests Required

- `AiChatServiceImplTest`:
  - `stream` happy path emits ordered `AiChatEvent`s and persists memory.
  - `stream` error path surfaces provider errors.
  - `call` happy path returns the model's text and persists memory.
  - `call` error path rethrows.
  - `callStructured` happy path deserialises into the requested type on first attempt.
  - `callStructured` retry path succeeds on second attempt and asserts the retry counter.
  - `callStructured` exhausts retries and throws — explicitly assert NO mock fallback.
  - Vendor branching: assert that for an OpenAI/DeepSeek-shaped provider the native JSON-schema path is taken; for an Ollama-shaped provider the soft-constraint prompt path is taken.
- `AiConversationIdGeneratorTest`:
  - Null/blank `resumeId` produces `default_<featureCode>_<ts>`.
  - Non-blank `resumeId` is preserved verbatim.
  - Timestamp uses `yyyyMMddHHmmssSSS`.

### 7. Wrong vs Correct

#### Wrong

```java
// Feature does its own plumbing
ChatResponse response = chatModel.call(new Prompt(
    "You are an interviewer...\n" + userMessage));
return objectMapper.readValue(response.getResult().getOutput().getText(), Report.class);
```

Issues: skips `AiChatService`, skips memory write, no retry, no vendor branching, no conversation id.

#### Correct

```java
String conversationId =
    AiConversationIdGenerator.generate(resumeId, AiFeatureType.INTERVIEW_REPORT);
AiInvocationRequest req = new AiInvocationRequest(
    INTERVIEW_REPORT_SYSTEM_PROMPT,
    userMessage,
    conversationId);
Report report = aiChatService.callStructured(req, Report.class);
```

#### Wrong

```java
try {
    return aiChatService.callStructured(req, Score.class);
} catch (Exception e) {
    return buildMockScore();           // silent fallback hides regressions
}
```

#### Correct

```java
return aiChatService.callStructured(req, Score.class);
// let the controller's exception advice map this to a 5xx + JSON error body
```

---

## Design Decision: thin shared service, not a registered-agent framework

**Context**: four features need AI access, only resume chat currently uses real AI.

**Options considered**:
1. Heavy: agent-registry pattern with declarative `@AiFeature` annotations and a router.
2. Thin: a 3-method service each feature composes against directly.

**Decision**: option 2. Features keep ownership of their system prompts and DTOs; the shared layer owns only what is genuinely cross-cutting (memory write, retry policy, vendor branching, conversation id format).

**When to escalate to option 1**: only if three or more features show clearly duplicated prompt-orchestration code. Until then, duplication is cheaper than premature abstraction.


## Scenario: AI-backed resume file import

### 1. Scope / Trigger
- Trigger: Users can upload an existing `.pdf`, `.docx`, or `.txt` resume file from the template gallery and create a new editable resume from it.
- Why this needs code-spec depth: the flow spans multipart upload, server-side text extraction, shared AI structured output, authenticated resume creation, template access validation, and frontend navigation.

### 2. Signatures
- Frontend API: `importResume(file: File, templateKey: string): Promise<ResumeDetail>`.
- Backend API: `POST /api/resumes/import`, `multipart/form-data` with fields:
  - `file`: uploaded resume file.
  - `templateKey`: selected resume template key.
- Backend service: `ResumeImportService.importResume(MultipartFile file, String templateKey): ResumeDetailResponse`.
- AI feature enum: `AiFeatureType.RESUME_IMPORT("resume_import")`.

### 3. Contracts
- Import always creates a new resume; it never overwrites an existing resume.
- Imported resume title defaults to the uploaded file name without extension, with a service fallback title only when the upload name is blank.
- The selected `templateKey` is validated through the same current-user template access rules as ordinary resume creation.
- Text extraction is server-side:
  - `.txt` uses UTF-8 text.
  - `.pdf` uses PDFBox text extraction and does not perform OCR.
  - `.docx` uses Apache POI text extraction.
- AI mapping must call `AiChatService.callStructured(request, ResumeContentPayload.class)` with a conversation id from `AiConversationIdGenerator.generate(null, AiFeatureType.RESUME_IMPORT)`.
- No mock, fallback, or fabricated resume content may be substituted when AI structured parsing fails.
- Frontend upload must send `FormData` without forcing `Content-Type: application/json`; the browser owns the multipart boundary.

### 4. Validation & Error Matrix
| Condition | Behavior |
|---|---|
| Missing/empty file | `400 error.resume.importFileRequired` |
| Unsupported extension | `400 error.resume.importUnsupportedFileType` |
| Extraction throws/read failure | `400 error.resume.importReadFailed` |
| Extracted text is blank or too short | `400 error.resume.importInsufficientText`; scanned/image-only PDFs fail here |
| Template not accessible to current user | Existing template access error path |
| AI structured output fails after retry | Shared `AiChatService.callStructured` exception path; do not create a resume |

### 5. Good/Base/Bad Cases
- Good: a text-based PDF uploads from the template gallery, maps into `ResumeContentPayload`, creates a new current-user resume with the selected template, and the frontend opens `/app/resumes/{id}`.
- Base: a `.txt` resume imports successfully and missing AI fields normalize to empty strings or empty lists before section persistence.
- Bad: a scanned PDF creates an empty resume anyway. It must fail before resume creation if extracted text is insufficient.
- Bad: frontend manually sets `Content-Type: multipart/form-data` without the boundary, causing the backend to receive no file.

### 6. Tests Required
- Backend unit tests:
  - TXT happy path calls `AiChatService.callStructured` and `ResumeService.createResumeFromContent`.
  - Unsupported extension rejects before AI invocation.
  - Insufficient extracted text rejects before AI invocation and before resume creation.
- Frontend verification:
  - `npm run build` and `npm run lint` pass after upload UI and `FormData` request changes.
  - User-facing upload labels/errors exist in both `en-US` and `zh-CN` template locale files.

### 7. Wrong vs Correct
#### Wrong
```typescript
return request<ResumeDetail>('/api/resumes/import', {
  method: 'POST',
  body: formData,
})
// shared request helper still forces Content-Type: application/json
```

#### Correct
```typescript
return request<ResumeDetail>('/api/resumes/import', {
  method: 'POST',
  body: formData,
  formData: true,
})
```

#### Wrong
```java
String conversationId = "resume_import_" + UUID.randomUUID();
ResumeContentPayload payload = ownChatClientCall(text);
```

#### Correct
```java
String conversationId = AiConversationIdGenerator.generate(null, AiFeatureType.RESUME_IMPORT);
ResumeContentPayload payload = aiChatService.callStructured(
    new AiInvocationRequest(systemPrompt, userMessage, conversationId),
    ResumeContentPayload.class
);
```
