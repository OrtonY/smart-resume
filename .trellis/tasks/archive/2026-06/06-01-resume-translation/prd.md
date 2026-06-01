# Resume Translation

## Goal

Add a resume Chinese/English translation feature in the resume editor so users can quickly prepare an English version for foreign companies or a Chinese version for return-to-China/job-seeking classmates. The editor should let the user choose a target language version and then decide whether to overwrite the current resume or create a new translated resume.

## What I Already Know

* User wants the feature inside the resume edit page.
* User flow: click/select translation language version, then choose either "overwrite current resume" or "create a new resume".
* The repository is a Spring Boot backend plus React + Vite frontend.
* Existing AI capabilities are configured in-app and reused by resume chat, scoring, and single text-span rewrite.
* Current resume editor already has autosave, version timeline, share, export, score, template modification, interview entry, and AI assistant actions.
* Existing resume copy flow supports creating a new resume with copied title/content/layout through `POST /api/resumes/{resumeId}/copy`.
* Existing resume update flow persists `title`, `templateKey`, `content`, and `layout` through `PUT /api/resumes/{resumeId}`.

## Assumptions

* MVP supports two target languages: Chinese and English.
* Translation uses the configured AI provider via the existing backend AI invocation layer.
* Translation should preserve factual content, resume structure, section order, hidden sections, template, dates, contact fields, proper nouns, and Markdown formatting.
* User-facing labels must be added to both `zh-CN` and `en-US` frontend i18n resources.
* The source resume must remain unchanged until the user confirms overwrite or create-new.

## Open Questions

* None for MVP.

## Requirements

* Add a translation entry in the resume editor action area.
* Let the user choose a target language version, at minimum Chinese and English.
* After target language is selected, ask the user to choose overwrite current resume or create a new resume.
* For overwrite, apply translated content to the current resume and persist it through the normal resume save/update path.
* For create-new, create a separate resume containing the translated content while preserving the source resume's template and layout.
* After create-new succeeds, immediately open the new translated resume editor page.
* Show loading state while translation is running.
* Show a clear failure message if AI configuration/model invocation fails.
* Do not pass avatar binary/data URL content to AI during translation; preserve the source avatar in the translated resume content.
* Use conservative proper-noun handling: preserve name, email, phone, links, school names, company names, and project names as much as possible; translate mainly headline, summary, role/title text when appropriate, descriptions, skill labels, honor/certificate descriptions, and other readable prose.
* Preserve structured resume field shape exactly; no section/item should disappear because of translation.
* Before translation starts, include the latest editor draft by saving or otherwise sending current content so recently edited text is not lost.

## Acceptance Criteria

* [ ] From the resume editor, a user can translate the current resume to English.
* [ ] From the resume editor, a user can translate the current resume to Chinese.
* [ ] User can choose overwrite current resume and see translated content reflected in the editor/preview.
* [ ] User can choose create new resume, get a separate translated resume, and land on the new resume editor page.
* [ ] Existing autosave/update behavior remains intact after overwrite.
* [ ] Existing copy/list behavior remains intact after create-new.
* [ ] Empty optional fields remain empty instead of being hallucinated.
* [ ] Name/contact fields and obvious proper nouns are not arbitrarily translated.
* [ ] AI errors are surfaced through existing UI feedback patterns.
* [ ] Backend rejects invalid target languages.
* [ ] Frontend typecheck and backend tests for the new service/controller path pass.

## Definition of Done

* Tests added/updated for the backend translation contract and key frontend API/type behavior where practical.
* Frontend lint/typecheck and backend focused test suite are run, or any inability to run them is documented.
* Relevant Trellis spec context is curated before implementation.
* Rollback is straightforward: remove the new editor action/API without database migration rollback.

## Out of Scope

* Arbitrary language pairs beyond Chinese and English.
* Real-time streaming translation progress.
* Human review workflow or side-by-side diff.
* Translation memory/glossary management.
* Automatic detection of source language as a user-facing feature.
* Translating shared/public resume pages directly.

## Technical Notes

* Frontend editor entry point: `frontend/src/features/resume/components/editor/ResumeEditorView.tsx`.
* Frontend page/container orchestration: `frontend/src/pages/WorkspacePage.tsx`.
* Resume API client: `frontend/src/features/resume/api/resumeApi.ts`.
* AI API client: `frontend/src/features/ai/api/aiApi.ts`.
* Resume data model: `frontend/src/features/resume/types.ts` and `backend/src/main/java/com/smartresume/resume/dto/ResumeDtos.java`.
* Existing backend AI endpoints: `backend/src/main/java/com/smartresume/ai/controller/AiController.java`.
* Existing structured AI invocation examples: `backend/src/main/java/com/smartresume/ai/service/AiResumeScoringService.java`.
* Existing resume creation/copy/update service: `backend/src/main/java/com/smartresume/resume/service/ResumeService.java`.
* Cross-layer feature: API request/response shape must line up across backend DTOs, frontend API types, editor state update, and create-new navigation/list refresh.

## Feasible Approach

**Recommended MVP: backend returns translated content, frontend decides persistence mode**

* Add an AI translation endpoint that receives `resumeId` and `targetLanguage`, loads the current user's resume, and returns translated `ResumeContentPayload`.
* In the editor, open a modal/menu for target language and persistence mode.
* For overwrite, update the local draft content with the translated content and rely on the existing save path, or immediately call update if needed by UX.
* For create-new, add a resume API path that can create a resume from supplied translated content plus copied template/layout, or extend backend translation to create the copy directly.
* Pros: translation prompt stays backend-side, permission checks stay server-side, frontend keeps simple decision UX.
* Cons: needs a new cross-layer API contract and tests.

## Decision (ADR-lite)

**Context**: Resume translation crosses frontend editor UX, backend AI invocation, resume persistence, and structured resume content validation.

**Decision**: Implement a conservative Chinese/English translation flow in the editor. The user selects target language and persistence mode. Create-new opens the newly translated resume immediately. Translation preserves names, contact fields, links, school/company/project names, template, layout, hidden sections, and item structure.

**Consequences**: This avoids destructive surprises and proper-noun hallucination, at the cost of sometimes leaving organization/project names untranslated even when a polished localized name exists.

## Expansion Sweep

* Future evolution: later can add target language presets, glossary, side-by-side review, or section-level retry without changing the core "translate content then persist" model.
* Related scenarios: create-new should feel consistent with existing copy flow; overwrite should feel consistent with existing autosave/version timeline behavior.
* Failure/edge cases: AI may return malformed JSON, omit fields, translate private/contact fields awkwardly, or fail because AI is not configured. Backend should validate/normalize output and frontend should leave the original draft intact on failure.
