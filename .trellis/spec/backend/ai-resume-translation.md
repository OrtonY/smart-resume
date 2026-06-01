# AI Resume Translation

> Contract for AI-backed full-resume Chinese/English translation.

---

## Scenario: Conservative full-resume translation from the editor

### 1. Scope / Trigger

- Trigger: Users translate a structured resume between Chinese and English from the resume editor.
- Why this needs code-spec depth: the flow crosses frontend editor state, authenticated backend API, AI structured output, resume content normalization, and resume persistence through overwrite or copy flows.

### 2. Signatures

- Backend API: `POST /api/ai/resumes/{resumeId}/translate`
- Request DTO: `AiResumeTranslationRequest(String targetLanguage)`
  - allowed values: `ENGLISH`, `CHINESE`
- Response DTO: `AiResumeTranslationResponse(String targetLanguage, ResumeContentPayload content)`
- Backend service: `AiResumeTranslationService.translateResume(String resumeId, AiResumeTranslationRequest request)`
- AI feature enum: `AiFeatureType.RESUME_TRANSLATION("resume_translation")`
- Frontend API wrapper: `translateAiResume(resumeId, { targetLanguage }): Promise<AiResumeTranslationResponse>`

### 3. Contracts

- Translation uses `AiChatService.callStructured(request, ResumeContentPayload.class)`.
- The service must load the current user's resume with `ResumeLookupService.requireResume(resumeId, userId)` and `CurrentUserContext.requireUserId()`.
- The prompt must ask for valid JSON matching `ResumeContentPayload`; do not parse free-form Markdown into resume content on the frontend.
- The prompt payload must strip `personalInfo.avatar` before serialization to avoid sending base64/data URL image content to AI.
- The normalized response must preserve the source `personalInfo.avatar`; avatar is source-owned and never translated.
- Backend normalization must preserve the source shape after AI returns:
  - list lengths and item order follow the source content, not the AI response
  - empty source fields stay empty
  - missing/blank AI fields fall back to the source value
  - extra AI list items are ignored
- Conservative proper-noun fields stay source-owned:
  - personal: `fullName`, `phone`, `email`, `city`, `website`, `expectedSalary`, `age`, `avatar`
  - education: `school`, `startDate`, `endDate`
  - work: `company`, `startDate`, `endDate`
  - project: `name`, `startDate`, `endDate`
  - honors/certificates: `issuer`, date fields, credential IDs
- Frontend must save or otherwise submit the latest editor draft before translation so unsaved text is included.
- Overwrite mode updates the current resume with translated content.
- Copy mode creates a copy, updates the copy with translated content/layout, then navigates to the new resume editor.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| `targetLanguage` blank | Bean validation error `validation.ai.translationLanguageRequired` |
| `targetLanguage` not `ENGLISH`/`CHINESE` | `400 error.ai.unsupportedTranslationLanguage` |
| User cannot access `resumeId` | existing resume lookup not-found/auth path |
| AI structured output parse fails after shared retry | shared `AiChatService.callStructured` exception; do not synthesize content |
| AI returns fewer/more list entries | normalize to source list length |
| AI fills a source-empty field | normalized output keeps it empty |
| Source avatar is present | do not include avatar in the AI prompt payload; response keeps the source avatar |

### 5. Good/Base/Bad Cases

- Good: user translates to English, chooses copy mode, backend returns translated content, frontend creates a copied resume, updates its content/layout, and opens `/app/resumes/{newId}`.
- Base: user translates to Chinese and overwrites the current resume; title/template/layout remain stable while content changes.
- Bad: frontend sends raw resume content to a model directly, bypassing backend auth, prompt ownership, and structured-output retry.
- Bad: backend trusts the AI list shape and accidentally drops an education/work/project entry.
- Bad: AI translates `fullName`, email, company names, or project names without post-processing safeguards.

### 6. Tests Required

- Backend unit tests:
  - valid target calls `AiChatService.callStructured` with `ResumeContentPayload.class`
  - unsupported target language throws `error.ai.unsupportedTranslationLanguage`
  - normalization preserves protected fields, empty source fields, and source list length
  - prompt serialization receives a payload with `personalInfo.avatar == null`, while normalized output keeps the source avatar
- Frontend verification:
  - build/type-check passes after wiring `translateAiResume`
  - editor translation action exists on desktop and mobile action menus
  - locale keys exist in both `zh-CN` and `en-US`

### 7. Wrong vs Correct

#### Wrong

```java
ResumeContentPayload translated =
    aiChatService.callStructured(request, ResumeContentPayload.class);
return new AiResumeTranslationResponse(target, translated);
```

Issues: trusts AI output shape, can drop entries, fill empty fields, or translate protected identity/proper-noun fields.

#### Correct

```java
ResumeContentPayload translated =
    aiChatService.callStructured(request, ResumeContentPayload.class);
return new AiResumeTranslationResponse(
    target,
    normalizeTranslatedContent(sourceContent, translated));
```

The backend treats AI output as a draft and applies deterministic source-shape preservation before returning content to the frontend.

#### Wrong

```typescript
const translated = await translateAiResume(resumeId, { targetLanguage })
```

Issues: if the user typed recently and autosave has not flushed yet, the backend may translate stale content.

#### Correct

```typescript
const savedSource = await saveDraftNow(resumeId, draft)
const translated = await translateAiResume(resumeId, { targetLanguage })
```

The editor persists the latest draft first, then translates the server-side source of truth.
