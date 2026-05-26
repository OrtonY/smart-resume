# AI Resume Chat (Smart Resume Assistant)

> Cross-layer contract for the resume-focused AI chat with default suggestion plan emission.

## Scenario: Resume chat that always returns a structured suggestion plan alongside readable text

### 1. Scope / Trigger

- Trigger: the resume editor's AI assistant must steer answers to the bound resume, default to "diagnose + concise apply-able suggestions", and let the frontend render Apply / Skip cards without parsing free-form prose.
- Why this needs code-spec depth: prompt contract, sentinel protocol, and SSE event semantics span backend + frontend; drift in any of them silently breaks the Apply loop.
- Current implementation: `AiAgentService.streamChat` delegates to `AiChatService.stream(...)` (see [ai-chat-service.md](./ai-chat-service.md)) and then strips the suggestion sentinel before re-emitting characters.

### 2. Signatures

```java
package com.smartresume.ai.service;

@Service
public class AiAgentService {
    public Flux<AiChatEvent> streamChat(AiChatRequest request);
}
```

```java
package com.smartresume.ai.dto.suggestion;

public record AiResumeSuggestion(
    String id,
    ResumeSection section,
    Integer index,           // null for scalar sections (personalSummary)
    String field,
    String currentValue,     // optional snapshot for UI compare
    String suggestedValue,   // required, applyable text
    String rationale         // required, one-sentence reason
) {}

public record AiResumeSuggestionPlan(
    List<AiResumeSuggestion> suggestions,
    String summary           // optional batch summary
) {}

public enum ResumeSection {
    personalInfo, personalSummary, education, workExperience,
    projectExperience, skills, honors, certificates;
}
```

```java
public record AiChatEvent(String type, String content, String conversationId) {}
// type ∈ { "message", "suggestion", "error", "done" }
```

### 3. Contracts

#### 3.1 Prompt contract (CHAT_SYSTEM_PROMPT)

- **Identity**: When asked who/what it is, the assistant introduces itself as "智慧简历 AI" and briefly describes its capability — optimizing the bound resume.
- **Scope**: Only answer questions about the bound resume content, the companies / projects / roles / industries that already appear in it, resume optimization, and interview-related common knowledge. Out-of-scope chitchat / general programming / lifestyle questions are politely redirected back to the resume topic without breaking the conversation context.
- **Default behavior**: When improvement points exist, output a markdown-readable diagnosis listing "issue + one-line rationale" per item. `suggestedValue` defaults to a concise, one-shot apply-able new text — do NOT preemptively expand into multi-paragraph rewrites.
- **Explicit-expansion trigger**: Only when the user explicitly says "帮我写长一点 / 多给几个版本 / 详细改" (or equivalent) does the assistant emit a longer rewrite or multiple candidates, overwriting the corresponding patch's `suggestedValue`.
- **Sentinel protocol** — appended on a single line **after** all readable text:
  ```
  <<<SUGGESTIONS_JSON>>>{"suggestions":[...], "summary":"..."}
  ```
  - `section` MUST be one of the lowercased camelCase enum values.
  - Array-typed sections (everything except `personalSummary`) MUST include `index` (0-based).
  - Scalar section `personalSummary` MUST omit `index` and use `field = "value"`.
  - When there are no suggestions, output exactly `<<<SUGGESTIONS_JSON>>>{"suggestions":[]}`.
  - The sentinel must NEVER appear mid-paragraph; it is a stream-tail marker only.

#### 3.2 SSE protocol extension

| event type | source | semantics |
|---|---|---|
| `message` | already existed | character-level chunks of the **stripped** readable text (12ms/char UI cadence) |
| `suggestion` | **NEW** | `content` is a JSON string conforming to `AiResumeSuggestionPlan`; emitted exactly once, **before** `done` |
| `error` | already existed | provider/agent error; envelope unchanged |
| `done` | already existed | terminal event; emitted last |

Emission order on a single stream: `message`* → `suggestion` → `done`.

#### 3.3 Sentinel parsing & stripping

- Backend implementation choice: **Approach B — collect-then-emit**. The agent reduces the upstream `Flux<AiChatEvent>` message chunks into the full text first, splits on the sentinel, then re-emits the visible portion via the existing 12ms/char cadence and finally fires the `suggestion` event.
- Reasoning: guarantees zero leakage of the raw `<<<SUGGESTIONS_JSON>>>{...}` characters into the user-facing message bubble, regardless of how the upstream chunk boundaries fall. Approach A (pure parallel-channel split) is harder to make leak-proof when the sentinel straddles two upstream chunks. The tradeoff is a small first-character latency, which is acceptable for resume-chat-sized responses.
- Sentinel found → strip from visible text, parse JSON to `AiResumeSuggestionPlan`. On parse success, re-emit the original JSON string as the suggestion event content.
- Sentinel found but JSON parse fails → log WARN with `conversationId`, emit `AiChatEvent("suggestion", "{\"suggestions\":[]}", conversationId)`. **Do NOT throw.**
- Sentinel missing entirely → log WARN with `conversationId`, emit empty-list suggestion event, then `done`. **Do NOT throw.**

#### 3.4 Suggestion persistence + multi-turn chat contract (frontend → backend)

- The frontend sends only the user's typed chat content as the next `userMessage`; suggestion card content, rationales, and statuses must not be appended as hidden prompt text.
- The backend persists each suggestion card to `ai_chat_suggestions` using the tuple `(conversationId, assistantMessageIndex, displayOrder)` as the stable per-round identity source. Returned `suggestion.id` values are normalized server-side to `"{conversationId}-a{assistantMessageIndex}-s{displayOrder}"`; do not trust model-provided ids for persistence.
- `AiAgentService` must capture `userId` before entering the stream / SSE pipeline and pass it into suggestion persistence explicitly, because `CurrentUserContext` is thread-local and is not safe to read from Reactor worker threads.
- Suggestion status is durable across refresh / history reload with the enum: `pending`, `applied`, `dismissed`. Undoing a dismissal writes `dismissed -> pending`.
- Sending a new user message must not prune prior rounds' pending or dismissed cards from frontend state. The chat timeline keeps all rounds, and prior suggestion cards remain visible and actionable until the user applies or skips them.
- Persisted suggestion status is for UI/history restoration, not prompt replay.

### 4. Section → field whitelist

| section | shape | `index` | allowed `field` |
|---|---|---|---|
| `personalInfo` | object | omit | `fullName`, `headline`, `phone`, `email`, `city`, `website`, `expectedSalary`, `age` |
| `personalSummary` | scalar | **omit** | `value` (sentinel field) |
| `education` | array | required (0-based) | `school`, `degree`, `major`, `startDate`, `endDate`, `description` |
| `workExperience` | array | required | `company`, `role`, `startDate`, `endDate`, `description` |
| `projectExperience` | array | required | `name`, `role`, `startDate`, `endDate`, `description` |
| `skills` | array | required | `name`, `level` |
| `honors` | array | required | `title`, `issuer`, `awardedAt`, `description` |
| `certificates` | array | required | `name`, `issuer`, `issuedAt`, `credentialId` |

Source of truth: aligned with `frontend/src/features/resume/types.ts` interfaces. When schema evolves, update both `ResumeSection` enum and this table.

Note on `personalInfo.index`: although it is an object section, the model may either omit `index` or set it to `null`. The frontend treats both identically. Avoid over-indexing for `personalInfo` to keep it consistent with `personalSummary` semantics.

### 5. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| Upstream `AiChatService.stream` raises | Existing `onErrorResume` emits `error` + `done`; suggestion event suppressed |
| Sentinel missing in upstream output | Visible text passes through unchanged; emit empty-list suggestion event + WARN log |
| Sentinel present, JSON malformed | Strip from visible text; emit empty-list suggestion event + WARN log; never throw |
| Sentinel present, JSON parses but `section` invalid enum value | Jackson rejects → falls into "JSON malformed" branch → empty list |
| Out-of-scope user question | System prompt steers back to resume topic; suggestions list typically empty |
| User asks for detailed rewrite | `suggestedValue` may be longer / multi-line; structure unchanged |
| Memory write fails | Surface upstream — not this layer's concern |

### 6. Good/Base/Bad Cases

- **Good**: user asks "帮我看看简历"; agent returns markdown bullet list + sentinel JSON with ≥1 suggestion, each with concise `suggestedValue` and one-line `rationale`. Frontend renders Apply/Skip cards directly.
- **Good**: user follows up with "第 2 条帮我写长一点"; agent emits a single suggestion patch with an extended multi-sentence `suggestedValue` overwriting the original.
- **Base**: out-of-scope question receives a polite redirect message + empty-list suggestion event. No card is rendered.
- **Base**: user asks "你是什么"; agent self-introduces as "智慧简历 AI" + empty-list suggestion event.
- **Bad**: agent emits `<<<SUGGESTIONS_JSON>>>{...}` mid-paragraph and the frontend bubble shows raw JSON characters. Caused by either an Approach A leakage or the model violating the "single line at the tail" rule.
- **Bad**: agent decides to fabricate a sample patch because parsing failed. Forbidden — empty list is the only correct fallback.
- **Bad**: frontend invents ad hoc suggestion ids or reattaches persisted suggestions to the wrong assistant message after reload. The backend-owned normalized id and `assistantMessageIndex` mapping are the source of truth.

### 7. Tests Required

Located at `backend/src/test/java/com/smartresume/ai/service/AiAgentServiceTest.java`.

- **Out-of-scope question** — assert visible text steers back to resume topic, suggestion event has zero suggestions, raw sentinel string never appears in the message text.
- **Default diagnostic** — assert ≥1 suggestion in the plan, each `suggestedValue` non-blank and concise (length cap as a sanity bound, not a contract).
- **Explicit detailed rewrite** — assert the resulting `suggestedValue` is meaningfully longer than the default-mode case (proxy: length > short-form threshold).
- **Sentinel fallback** — when the mock model emits a malformed JSON tail or omits the sentinel, the service does not throw, emits an empty-list suggestion event, and the malformed JSON characters never reach the visible message stream.

Tests mock `AiChatService.stream(...)` to return a controlled `Flux<AiChatEvent>` so the model output text is fully deterministic.

### 8. Wrong vs Correct

#### Wrong

```java
// Per-character emission with no buffering — sentinel JSON characters leak into the user bubble
return aiChatService.stream(invocationRequest)
    .flatMap(event -> "message".equals(event.type())
        ? emitCharacters(event.content(), conversationId)
        : Flux.just(event));
```

Issues: `<<<SUGGESTIONS_JSON>>>{...}` is rendered character by character into the assistant bubble; the frontend has no clean way to parse it back out without retroactive surgery.

```java
// Catch the parse failure and synthesise a sample patch so the UI "still works"
try {
    plan = objectMapper.readValue(rawJson, AiResumeSuggestionPlan.class);
} catch (Exception e) {
    plan = new AiResumeSuggestionPlan(
        List.of(new AiResumeSuggestion("fake", ResumeSection.personalSummary, null,
            "value", null, "（示例）补充技术栈关键词", "占位建议")),
        null);
}
```

Issues: violates the no-mock-fallback rule. Empty list is the only correct fallback.

#### Correct

```java
return aiChatService.stream(invocationRequest)
    .filter(event -> "message".equals(event.type()))
    .map(AiChatEvent::content)
    .reduce(new StringBuilder(), StringBuilder::append)
    .map(StringBuilder::toString)
    .flatMapMany(fullText -> buildResponseFlux(fullText, conversationId));
```

Where `buildResponseFlux` strips the sentinel, validates JSON via Jackson, falls back to `{"suggestions":[]}` on any failure, and emits `message`* → `suggestion` → `done` in that order.

---

## Design Decision: Approach B (collect-then-emit) over Approach A (parallel channels)

**Context**: the agent must (a) preserve the existing 12ms/char streaming UX and (b) guarantee the sentinel JSON never bleeds into the message bubble.

**Options considered**:

1. **A — parallel channels**: split the upstream message stream into two: one for character emission (with delay), one accumulating to a buffer for tail-time sentinel parsing. Synchronise so the suggestion event fires before `done` and the sentinel characters are filtered out of the message channel.
2. **B — collect-then-emit**: reduce the upstream message stream to a single string, strip the sentinel, then re-emit the visible portion via the existing `emitCharacters` (12ms/char). Suggestion event fires after the character stream completes.

**Decision**: Approach B.

- **Leak-proof**: filtering the sentinel character-by-character (Approach A) is fragile when the sentinel string straddles two upstream chunk boundaries; the buffer cursor logic to detect a partial-prefix mid-stream and replay it on completion adds non-trivial state.
- **Simpler**: the visible text computation is a pure substring; the failure paths are flat (sentinel found+valid / found+invalid / missing).
- **Tradeoff**: the user sees the first character only after the full upstream stream completes. For resume-chat-sized responses (hundreds of tokens) this is a sub-second cost on real providers, well below the perceptual threshold for "still feels live".
- **When to revisit**: if real-world latency complaints surface or upstream models emit very long responses (>2k tokens) routinely, switch to Approach A and add the partial-prefix detector with a comprehensive test matrix.

---

## Technical Notes

- The frontend strips `personalInfo.avatar` from the `AiResumeContext` before sending requests to save context tokens and reduce latency. The backend should not assume `avatar` is present in the resume context payload.
