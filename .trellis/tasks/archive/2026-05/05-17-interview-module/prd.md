# Interview Module

## Goal

Add an interview module that lets users start and revisit interview sessions from either the home/interview area or a specific resume. Binding a resume is optional and is used to make generated questions more targeted; the initial task should scaffold the product, API, storage, and UI flows while leaving the real AI implementation out of scope.

## What I already know

* Users can enter the interview module from a specific resume or from the home/interview entry.
* An interview does not have to bind to a resume.
* Binding a resume should make future interview questions more targeted.
* One resume can bind to multiple interview windows/sessions, partly to support backend paginated query conditions.
* Starting an interview requires the user to provide interview title, interview JD, interview difficulty, and one or more interviewer roles.
* Interviewer roles represent scenarios such as HR, Leader, project deep dive, scenario, and behavioral interview.
* Clicking start should eventually ask AI to generate multiple interview questions.
* Interviews can be stopped halfway and continued later.
* After an interview ends, an interview report should be generated asynchronously.
* Users can repeatedly view interview content and the report.
* Current AI implementation is explicitly out of scope; this task should build the framework.
* Backend uses Spring Boot, PostgreSQL, Flyway, and MyBatis-Flex with feature-oriented packages.
* Frontend uses React, TypeScript, Ant Design, and feature-oriented folders.
* Current app routes are `/app`, `/app/recycle-bin`, `/app/templates`, and `/app/resumes/:resumeId`.
* Current home/resume workspace is implemented in `frontend/src/pages/WorkspacePage.tsx`.
* Existing AI chat history already models one resume to many selectable conversations, but it is resume-required and Spring AI memory-specific.

## Assumptions

* The MVP should persist interview sessions, chat-style messages, status, resume binding, and report status/content placeholders.
* The frontend should expose both resume-context and global interview creation flows.
* The backend should provide APIs that allow paginated list queries by resume binding and interview state.
* Question generation and report generation can be represented with deterministic placeholder data or status transitions until AI is implemented.
* Interview should be a new backend feature package named `interview`, with AI integration left behind service interfaces/stubs for later.

## Open Questions

* None currently.

## Requirements

* Users can create an interview from a resume context with that resume pre-bound.
* Users can create an interview from the interview module without selecting a resume.
* Users can optionally bind, change, or clear the resume association during creation.
* Users must provide title, JD, difficulty, and at least one interviewer role before starting an interview.
* A resume can have many interviews.
* Interview sessions support paused/stopped, continued, ended, and report-viewable states.
* MVP scope is the complete clickable framework: backend schema/API/pagination plus frontend entry points, list, create form, interview detail, pause/continue, end, and report placeholder.
* Interview content should be stored and displayed as chat-style messages rather than a fixed question/answer list.
* Interview sessions should keep a stable Spring AI `aiConversationId` so future AI calls can use `spring_ai_chat_memory` for conversation continuity.
* Product-facing interview messages remain stored separately for replay/report UI; Spring AI memory is the AI prompt continuity store.
* Chat-style interview messages must allow future AI to ask follow-up/deep-dive questions based on user answers.
* Starting an interview should automatically append one opening interviewer message.
* The opening interviewer message is a deterministic placeholder in this task and should later be replaced by AI generation.
* Interview session status should use `IN_PROGRESS`, `PAUSED`, and `ENDED`.
* Interview report status should be stored separately from session status.
* Initial report statuses should support at least `PENDING`, `GENERATING`, and `READY`.
* Interviewer roles should offer built-in options while still allowing custom input.
* Built-in interviewer roles should include HR, Leader, project deep dive, scenario questions, and behavioral interview.
* Users can select multiple interviewer roles to match multi-round interview behavior, and each role maps to one interview round in sequence.
* Backend should store interviewer roles as an ordered array/list contract to preserve round order and track the active round index.
* Interview difficulty should use three built-in options: easy, medium, and hard.
* The interview module should have an independent interview center route, likely `/app/interviews`.
* Resume detail/editor should expose an interview shortcut that starts creation with the current resume pre-bound.
* The global interview center should support unbound interviews and listing all interviews.
* Interview creation should use a single shared modal/drawer form inside the interview center.
* Resume-origin creation should route to the interview center with the current `resumeId` pre-bound and the create form opened.
* The shared create form should allow optional resume binding.
* Global creation should allow selecting a resume or leaving the interview unbound.
* Resume-origin creation should preselect the current resume and allow changing or clearing the binding.
* Interview list should support pagination, optional `resumeId` filtering, session status filtering, and keyword search over title/JD.
* Difficulty, interviewer role, and report status should be visible in the list but not required as MVP filters.
* Resume editor should provide interview shortcuts instead of embedding a bound-interviews list.
* Resume editor should offer a way to start a pre-bound interview and a way to view related interviews in the interview center filtered by `resumeId`.
* MVP should not support editing or deleting existing interviews.
* Created interview metadata should remain immutable in the MVP to preserve consistency with the message history and report.
* Ending an interview should immediately create a viewable placeholder report and set `reportStatus` to `READY`.
* Real asynchronous report generation remains a future implementation detail.
* While an interview is in progress, each candidate message should be persisted and followed by one deterministic placeholder interviewer follow-up message.
* The placeholder follow-up behavior should later be replaceable by real AI-generated deep-dive questions.
* Real AI question generation and report generation are out of scope for the current implementation.

## Acceptance Criteria

* [ ] Interview sessions can be created with required fields and optional resume binding.
* [ ] The backend can page/query interviews, including by bound resume.
* [ ] The backend can filter interview list by optional resume id, session status, and keyword.
* [ ] The frontend interview center exposes pagination, resume filter, status filter, and keyword search.
* [ ] The frontend exposes entry points from both resume detail/context and the interview module.
* [ ] Users can open a unified interview center independent of any resume.
* [ ] Users can start creation from a resume with the resume pre-bound.
* [ ] Users can jump from a resume to the interview center filtered to interviews bound to that resume.
* [ ] The same create form is used for both global and resume-origin interview creation.
* [ ] Users can optionally bind, change, or clear the resume association during creation.
* [ ] Existing interviews cannot be edited or deleted in the MVP.
* [ ] Users can stop and continue an interview session.
* [ ] Interview session status and report status are represented independently.
* [ ] Users can select one or more built-in interviewer roles or enter custom roles.
* [ ] Users can select one of three interview difficulty levels.
* [ ] Interview detail displays a chronological message flow with interviewer/user turns.
* [ ] Newly started interviews contain an initial interviewer opening question/message.
* [ ] Users can submit answers/messages into an ongoing interview.
* [ ] Submitting a candidate message appends a persisted placeholder interviewer follow-up.
* [ ] Users can end an interview and later see a report placeholder/status.
* [ ] Ending an interview makes a placeholder report immediately viewable.
* [ ] The UI is clickable end-to-end using placeholder questions/report data without real AI calls.
* [ ] Real AI integration is not required for this task.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* Real AI generation of interview questions.
* Real AI generation of interview reports.
* Advanced scoring, evaluation rubrics, or personalized coaching beyond placeholders.
* Backend-only or frontend-only partial prototype.

## Technical Notes

* Backend likely impacted files:
  * `backend/src/main/java/com/smartresume/interview/**` for controller/service/domain/mapper/dto.
  * `backend/src/main/resources/db/migration/V10__create_interview_sessions.sql` or next available migration.
  * Backend tests under `backend/src/test/java/com/smartresume/interview/**`.
* Frontend likely impacted files:
  * `frontend/src/app/router/AppRouter.tsx` to add `/app/interviews` and likely `/app/interviews/:interviewId`.
  * `frontend/src/pages/WorkspacePage.tsx` for homepage and resume-editor entry points if keeping current page structure.
  * `frontend/src/features/interview/**` for API/types/components.
  * `frontend/src/index.css` for module-specific layout styles.
* Current resume list API already supports paginated list DTO shape; interview can mirror this shape for list pagination.
* Existing `ai_chat_conversations` is not enough for interviews because interview sessions can be unbound, carry JD/difficulty/interviewer metadata, have statuses, and need report placeholders.
* Existing AI chat history spec is still useful as a pattern: one resume can have many independent threads; for interviews this becomes optional `resume_id` with indexes for `(resume_id, updated_at)`.
* Interview message storage should support roles such as `INTERVIEWER`, `CANDIDATE`, and possibly `SYSTEM`.

## Technical Approach

Backend:

* Add an `interview` package with controller, service, domain entities, mappers, and DTOs.
* Add Flyway migration tables for `interview_sessions` and `interview_messages`.
* `interview_sessions` should store optional `resume_id`, title, AI conversation id, JD, difficulty, interviewer roles, active round index, session status, report status/content, and timestamps.
* `interview_messages` should store `session_id`, role, content, sort/order or timestamp, and timestamps.
* Placeholder interview messages should also be mirrored to Spring AI chat memory under the session's `aiConversationId`, preserving the future AI conversation contract.
* Expose REST APIs for list/page, create/start, get detail, pause, continue, submit candidate message, and end interview.
* Keep placeholder opening/follow-up/report generation in the service layer so later AI integration can replace it.

Frontend:

* Add `/app/interviews` as the interview center route and likely `/app/interviews/:interviewId` for detail.
* Add `features/interview` types and API client modules.
* Build interview center with pagination, resume filter, status filter, keyword search, create drawer/modal, and interview cards/table.
* Build interview detail with metadata, message timeline, candidate input, pause/continue/end actions, and report panel.
* Add homepage/interview-center navigation and resume editor shortcuts for start/view related interviews.

## Decision Log

### MVP Depth

**Context**: The module needs backend pagination, optional resume binding, interview lifecycle state, and repeatable viewing of interview content and report.

**Decision**: Build the complete clickable non-AI framework across backend and frontend.

**Consequences**: This gives enough product surface to validate routing, persistence, status transitions, and UI ergonomics before real AI integration. The first implementation will use deterministic placeholder interview questions and report status/content.

### Interview Content Model

**Context**: A fixed question/answer list would not support real-time deep-dive follow-ups after a candidate answer.

**Decision**: Store and display interview content as a chronological chat/message flow.

**Consequences**: The MVP can support interviewer/user turns now, and later AI can append dynamic follow-up questions without changing the main interaction model. A future initial question plan can be added as metadata or generated messages if needed.

### AI Memory Contract

**Context**: Product-side message history is needed for UI replay and reports, but real AI follow-up generation needs Spring AI chat memory continuity.

**Decision**: Each interview session stores a stable `aiConversationId`. Interview messages are persisted in `interview_messages` for product reads and mirrored into Spring AI chat memory for future AI prompt continuity.

**Consequences**: The current non-AI framework keeps replay/report data explicit while leaving the real AI implementation able to use `spring_ai_chat_memory` without a later data model rewrite.

### Opening Message

**Context**: The interview should feel started immediately after the user submits title, JD, difficulty, and interviewer role.

**Decision**: Insert one deterministic opening interviewer message when an interview is created/started.

**Consequences**: The MVP remains clickable without real AI while preserving the future contract where AI generates the opening question from the JD, difficulty, interviewer role, and optional resume context.

### Status Model

**Context**: Stopping/continuing an interview and generating a report are related but independent workflows.

**Decision**: Use `IN_PROGRESS`, `PAUSED`, and `ENDED` for interview session lifecycle, and store report state separately as `PENDING`, `GENERATING`, or `READY`.

**Consequences**: The UI can clearly show whether the interview can continue and whether the report is available. Future retry/failure states can be added to report status without changing the interview lifecycle model.

### Interviewer Roles

**Context**: Interviewer roles drive the interview scenario and will later influence AI prompt behavior. A real interview can include multiple rounds or perspectives.

**Decision**: Provide built-in role options for HR, Leader, project deep dive, scenario questions, and behavioral interview, while allowing users to enter custom roles. Require at least one role and persist roles with array/list semantics, treating their order as the round order with an active round index.

**Consequences**: The MVP has a guided creation flow without forcing every future interview style into a backend enum. Later prompt templates can still key off known role labels and can run role-specific rounds.

### Difficulty Levels

**Context**: Interview difficulty should be easy to choose and useful later for AI prompt behavior.

**Decision**: Provide three built-in difficulty levels: easy, medium, and hard.

**Consequences**: The MVP keeps the form simple while preserving a stable value for list filters and later AI prompt generation.

### Navigation Shape

**Context**: Interviews can be bound or unbound, and users need entry points from both the home/interview area and a specific resume.

**Decision**: Add an independent interview center, likely `/app/interviews`, plus a resume-editor shortcut that starts creation with the current resume pre-bound.

**Consequences**: Unbound interviews have a natural home, while resume-bound interviews still remain easy to create from resume context. Backend list APIs should support global pagination and optional `resumeId` filtering.

### Create Form Placement

**Context**: Creating an interview requires a small required field set and can be initiated globally or from a resume.

**Decision**: Use one shared modal/drawer create form in the interview center. Resume-origin entry should navigate to the interview center with the resume pre-bound and the form opened.

**Consequences**: The UI avoids duplicated create flows while still giving resume-context creation a direct path.

### Report Placeholder

**Context**: The current task does not implement real AI or asynchronous report generation, but users should be able to verify the report viewing flow.

**Decision**: When the user ends an interview, immediately persist a deterministic placeholder report and mark `reportStatus` as `READY`.

**Consequences**: The MVP is fully clickable and testable. Later implementation can replace the immediate placeholder with an asynchronous generation job without changing the primary report viewing surface.

### Placeholder Follow-ups

**Context**: The interview should support real-time deep-dive behavior later, where AI follows up based on the candidate's answer.

**Decision**: In the MVP, submitting a candidate message persists that message and appends one deterministic placeholder interviewer follow-up message.

**Consequences**: The persisted message flow already matches the future AI interaction contract, while avoiding real model calls in this task.

### Optional Resume Binding

**Context**: Resume binding improves future targeting but should not be required to conduct an interview.

**Decision**: The shared create form allows optional resume binding. Global creation can select a resume or leave the interview unbound; resume-origin creation preselects the current resume but allows changing or clearing the binding.

**Consequences**: Users can create targeted and general interviews from the same flow, while backend pagination can still filter by `resumeId` when needed.

### Interview List Filters

**Context**: Backend pagination by resume binding is an explicit requirement, and users need basic ways to find in-progress or past interviews.

**Decision**: The MVP interview list supports pagination, optional `resumeId` filtering, session status filtering, and keyword search over title/JD. Difficulty, interviewer role, and report status are shown but not MVP filters.

**Consequences**: The API supports the core query needs without overloading the first UI with every possible filter.

### Resume Editor Interview Surface

**Context**: The existing resume editor already contains editing, preview, sharing, export, and AI assistant surfaces.

**Decision**: Do not embed a bound-interviews list inside the resume editor. Provide shortcuts to start a pre-bound interview and to open the interview center filtered by the current resume.

**Consequences**: Resume editing stays focused while users can still quickly create and review resume-related interviews.

### Editing and Deletion

**Context**: Interview records represent a process history. Changing metadata after messages/report exist can make the history inconsistent, and deleting records needs separate retention decisions.

**Decision**: Do not support editing or deleting existing interviews in the MVP.

**Consequences**: The first implementation focuses on the core interview lifecycle. Archive/delete and metadata correction can be added later with explicit retention behavior.
