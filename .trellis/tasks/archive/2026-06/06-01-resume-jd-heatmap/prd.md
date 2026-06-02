# brainstorm: Resume JD Heatmap

## Goal

Evaluate a Resume JD heatmap feature that helps users understand how well a resume matches a target job description, where the resume is strong or weak, and what concrete edits would improve fit.

## What I Already Know

* User asked to evaluate the requirement for a resume-JD heatmap, not to implement it yet.
* The product already has an AI resume scoring flow with optional `jobDescription`.
* Existing scoring flow persists the last successful score per `(user_id, resume_id)`.
* Existing backend scoring contract exposes `POST /api/ai/resume-score` and `GET /api/ai/resumes/{resumeId}/score`.
* Current score response is summary-oriented: score, summary, strengths, and suggestion groups. It does not include structured per-section or per-keyword match data.
* The resume editor already has a modal entry point via `ResumeScoreButton`.
* The application tracker stores company, position, channel, status, resume link, and notes, but does not currently store a dedicated JD field.
* Interview sessions already accept `jobDescription`, so JD text exists in another domain but is not yet shared as a reusable JD entity.

## Assumptions (Temporary)

* "Heatmap" means a visual match distribution between JD requirements and resume sections/keywords, not only another total score.
* MVP should reuse the AI scoring entry and visible-resume-content serialization path.
* Users care more about actionable gaps than a decorative visualization.
* The feature should be useful even before the app has a full JD library or ATS parser.

## Open Questions

* Final confirmation from user before implementation.

## Requirements (Evolving)

* User can provide or reuse a JD and run an analysis against the current resume.
* Result should show overall JD match plus a visual distribution of matched, weak, and missing requirements.
* Result should identify missing or under-supported JD keywords/skills.
* Result should map recommendations back to resume sections where possible.
* The analysis should remain tied to the current user's accessible resume.
* The feature should extend the existing AI score modal rather than introduce a new top-level workflow.
* Heatmap details should be generated only when a non-blank JD is provided.
* When JD is blank, the existing general resume scoring behavior should remain available without heatmap details.
* This task should only upgrade the current score modal and latest persisted result.
* This task should not introduce per-JD history, a JD library, or direct edit/apply actions.

## Acceptance Criteria (Evolving)

* [ ] Given a resume and JD, the user can see an overall match score.
* [ ] The result includes structured match details rather than only prose.
* [ ] The user can distinguish strong matches, partial matches, and gaps.
* [ ] Recommendations identify which resume section should be edited.
* [ ] Empty JD clearly falls back to the existing general scoring mode without heatmap details.
* [ ] The existing persisted-score restore flow can restore heatmap details when the last score used a JD.
* [ ] The modal remains usable on mobile and desktop.
* [ ] Existing AI error behavior is preserved; the UI must not fabricate a fake heatmap on provider failure.

## Definition of Done (Team Quality Bar)

* Tests added/updated where behavior changes.
* Lint / typecheck / CI green.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (Explicit)

* Automatic rewriting of the resume based on the heatmap.
* A multi-JD ATS database or full job-post ingestion pipeline.
* Per-JD analysis history.
* Direct edit/apply-suggestion actions from the heatmap.
* Browser-only heuristic scoring that diverges from backend AI scoring.
* Public share-page heatmap display.

## Research References

* [`research/resume-jd-heatmap-patterns.md`](research/resume-jd-heatmap-patterns.md) - Comparable resume scanners emphasize keyword match, missing terms, ATS readability, and job-specific recommendations.

## Research Notes

### What similar tools do

* Jobscan-style reports compare resume text against a JD and surface match-rate plus missing keywords.
* Teal-style workflows focus on job-specific keyword alignment and targeted resume edits.
* Resume Worded-style flows combine scorecards with concrete resume improvement categories.

### Constraints from this repo

* Existing `AiResumeScoringService` is the natural backend extension point.
* Existing `ResumeScoreButton` is the natural frontend entry point, but the current modal copy still references legacy mock wording and only renders summary/group cards.
* Backend DTOs should remain the cross-layer source of truth; frontend should not infer heatmap data from prose.
* Resume prompt construction should continue using `ResumeContentService.buildAiVisibleContentJson`.

### Feasible approaches here

**Approach A: Keyword Requirement Matrix (Recommended MVP)**

* How it works: backend returns extracted JD requirements/keywords with status `matched | partial | missing`, confidence/weight, matching resume sections, and short advice.
* Pros: highest actionability, easy to render, easy to test, does not require modifying resume preview rendering.
* Cons: less visually "on-resume" than a literal heat overlay.

**Approach B: Section Heatmap**

* How it works: backend scores each resume section against the JD and frontend colors sections/cards by strength.
* Pros: intuitive visual relationship to the resume editor; good for quick scanning.
* Cons: weaker at explaining missing terms that do not appear in any section; can become vague without keyword details.

**Approach C: Hybrid Matrix + Section Heatmap**

* How it works: combine per-requirement matrix with per-section aggregate heat.
* Pros: best user experience long-term.
* Cons: larger DTO, more UI states, more AI prompt/test surface; better as phase two unless this is a flagship feature.

## Decision (ADR-lite)

**Context**: The heatmap can be implemented as a lightweight keyword matrix, a section-level visual overlay, or a hybrid of both. The user selected option 3, the hybrid direction.

**Decision**: Build toward a hybrid heatmap: per-JD requirement/keyword match details plus per-resume-section aggregate heat.

**Consequences**: This gives the strongest product experience and clearer explanations, but increases DTO, prompt, UI, and test scope. Implementation should keep a structured backend response as the source of truth so the frontend does not infer heatmap state from prose.

**Context**: The heatmap could live in the existing score modal, a persistent editor side panel, or the application/JD workflow.

**Decision**: Extend the existing AI score modal.

**Consequences**: Scope stays concentrated in the current scoring flow and avoids adding a JD storage model in the same change. The modal must remain usable on mobile and should present the heatmap without overwhelming the existing score summary.

**Context**: A JD heatmap needs a target JD to make "match" meaningful, but the existing scoring flow supports optional JD.

**Decision**: Require a non-blank JD for heatmap details, while preserving general no-JD scoring as a fallback mode.

**Consequences**: The UI should clearly distinguish "general score" from "JD match heatmap". Backend response can keep the existing summary fields for both modes and include heatmap fields only when `jobDescriptionProvided = true`.

**Context**: The hybrid heatmap could expand into JD history or direct resume editing.

**Decision**: Keep this task focused on upgrading the current scoring modal and latest persisted result only.

**Consequences**: The feature is still complete for one JD analysis, but future per-JD history and apply-actions remain out of scope.

## Technical Approach

Extend the existing AI resume scoring flow rather than creating a parallel feature.

Backend:

* Keep `POST /api/ai/resume-score` as the analysis endpoint.
* Extend `AiResumeScoreResponse` with optional structured heatmap fields, present only when JD is provided.
* Suggested response shape:
  * `requirementMatches`: JD requirement/keyword rows with text, category, importance, status, score, matched sections, evidence, and suggestion.
  * `sectionHeatmap`: resume section aggregates with section key, label, score, status, matched count, missing count, and summary.
  * `heatmapSummary`: compact text summary for the visual report.
* Continue using `ResumeContentService.buildAiVisibleContentJson(resumeEntity)` for model-facing resume content.
* Continue using `AiChatService.callStructured` and preserve the existing error behavior.
* Persist the full normalized response in `ai_resume_scores.result_json`, so restored results include heatmap data.

Frontend:

* Extend `ResumeScoreButton` rather than adding a new entry point.
* When JD is blank, render current general score UI.
* When JD is provided and heatmap fields exist, render:
  * score summary
  * section heatmap overview
  * requirement matrix with matched / partial / missing states
  * actionable suggestions mapped to resume sections
* Update `frontend/src/features/ai/types.ts` and i18n strings.

Testing:

* Backend service tests should cover JD heatmap response, no-JD fallback, persisted restore, and prompt/serialization constraints.
* Frontend build/typecheck should cover the extended typed response and modal rendering paths.

## Recommended Scope

Use a hybrid result model. The first complete version should answer: "What JD requirements am I covering, what am I missing, where is each match supported in the resume, and which resume sections are weak overall?"

## Technical Notes

* Relevant specs:
  * `.trellis/spec/backend/ai-resume-scoring.md`
  * `.trellis/spec/backend/ai-chat-service.md`
  * `.trellis/spec/frontend/index.md`
* Relevant backend files inspected:
  * `backend/src/main/java/com/smartresume/ai/controller/AiController.java`
  * `backend/src/main/java/com/smartresume/ai/dto/AiDtos.java`
  * `backend/src/main/java/com/smartresume/ai/service/AiResumeScoringService.java`
  * `backend/src/main/java/com/smartresume/application/dto/JobApplicationDtos.java`
  * `backend/src/main/java/com/smartresume/interview/dto/InterviewDtos.java`
* Relevant frontend files inspected:
  * `frontend/src/features/ai/api/aiApi.ts`
  * `frontend/src/features/ai/components/ResumeScoreButton.tsx`
  * `frontend/src/features/ai/types.ts`
  * `frontend/src/pages/ApplicationsPage.tsx`
