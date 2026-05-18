# brainstorm: resume scoring in editor

## Goal

Add a resume scoring feature to the resume editor page so users can optionally provide a JD, submit the current resume for AI-based evaluation, and receive a score plus detailed suggestions without leaving the editing workflow. The concrete AI vendor/model invocation is explicitly out of scope for this task; we only need to leave the backend integration seam ready.

## What I already know

* The resume editor page is implemented in `frontend/src/pages/WorkspacePage.tsx`.
* The editor page already includes `AiConfigurationButton` in the top action area and `AiResumeAssistant` as a floating AI entry point.
* Resume CRUD currently uses `frontend/src/features/resume/api/resumeApi.ts` and `backend/src/main/java/com/smartresume/resume/controller/ResumeController.java`.
* The frontend already has a dedicated AI feature area under `frontend/src/features/ai/`.
* The backend already exposes AI-related endpoints under `backend/src/main/java/com/smartresume/ai/controller/AiController.java`.
* Existing AI chat binds the current resume context and streams model output through `AiAgentService`.
* The user requirement says JD is optional, and backend AI integration should be left unimplemented for now.
* This feature will span frontend editor UI, frontend API typing/calls, backend controller/service/DTOs, and likely placeholder response shaping.

## Assumptions (temporary)

* MVP can reuse the existing AI feature area instead of introducing a brand-new global infrastructure layer.
* MVP should score the current in-memory resume draft / saved resume context, not historical versions.
* Because real AI invocation is out of scope, the backend should expose a stable contract plus placeholder implementation path that is easy to replace later.
* The scoring result should be shown immediately in the editor flow rather than requiring the user to open a separate page.

## Open Questions

## Requirements (evolving)

* Add a resume scoring capability on the resume editor page.
* Use a dedicated action button in the editor action area and open a scoring modal for the flow.
* Let the user optionally enter a JD before triggering scoring.
* Allow scoring even when JD is empty.
* Backend accepts resume context plus optional JD and returns a score with detailed suggestions.
* The backend AI call seam must be reserved, but concrete vendor/model invocation is not implemented in this task.
* The UI should make it clear when JD is optional and when scoring is running / completed / failed.
* Scoring results are ephemeral in MVP: show them only in the current modal session and do not persist them to backend history.
* MVP should return a mock / placeholder scoring result from backend so the full frontend-backend interaction can run end-to-end before real AI integration is wired in.

## Decision (ADR-lite)

**Context**: Resume scoring needs to be discoverable in the editor without overloading the existing AI chat entry.

**Decision**: MVP uses a dedicated action button in the resume editor top action area. Clicking it opens a dedicated scoring modal containing optional JD input, score trigger, and result display.

**Consequences**: The scoring flow is easier to discover and keeps "chat assistant" and "structured scoring" separated. It adds one more editor action, but keeps the implementation boundary clear and reduces coupling with chat history UX.

**Related MVP decision**: Scoring results are not persisted. They live only in the currently opened scoring modal state.

**AI seam decision**: The backend exposes the real request/response contract now, but returns a mock scoring result and detailed suggestions until actual AI provider integration is implemented.

## Acceptance Criteria (evolving)

* [ ] In the resume editor, the user can find and open a dedicated resume scoring modal from the action area.
* [ ] Before scoring, the user can fill in a JD text input, and leaving it empty does not block submission.
* [ ] Triggering scoring sends the current resume context and optional JD to a backend endpoint.
* [ ] The UI displays a score and detailed suggestions returned by the backend.
* [ ] If the scoring request fails or is unavailable, the UI shows a clear error state.
* [ ] The backend implementation leaves AI integration as a replaceable placeholder instead of a real provider call.
* [ ] Closing or refreshing the page clears the scoring result, and no scoring history is stored.
* [ ] The end-to-end interaction is usable in development with a mock backend scoring response.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* Real AI vendor/model invocation
* Prompt tuning for production quality scoring
* Persisting scoring history across sessions
* Resume auto-rewrite / auto-apply AI suggestions directly into resume content
* A separate scoring page outside the resume editor unless MVP decisions change

## Technical Notes

* Frontend likely touches `frontend/src/pages/WorkspacePage.tsx`, `frontend/src/features/ai/`, and/or `frontend/src/features/resume/api/resumeApi.ts`.
* Backend likely touches `backend/src/main/java/com/smartresume/ai/` and may need a resume-facing scoring endpoint depending on final API placement.
* Existing AI chat uses a bound resume JSON context pattern that may be reusable for scoring request payload design.
* Existing editor action area already hosts `AiConfigurationButton`, share, export, and interview-related actions, making it the natural placement for a new scoring entry.
* Scope expansion checkpoint:
* Future evolution: scoring may later evolve into version comparisons, repeated optimization cycles, or JD-targeted tailoring.
* Related scenarios: chat assistant and scoring should stay separate but reuse compatible resume-context payloads.
* Failure/edge cases: no JD provided, AI not configured, placeholder backend unavailable, repeated scoring during autosave, modal close after result.
* Recommended MVP output shape: numeric score plus structured suggestion groups so frontend presentation stays stable when real AI is swapped in later.
* Relevant spec indexes: `.trellis/spec/frontend/index.md`, `.trellis/spec/backend/index.md`, `.trellis/spec/guides/index.md`.
