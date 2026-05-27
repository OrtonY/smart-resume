# brainstorm: refactor extensibility and centralize magic values

## Goal

Refactor the codebase to improve extensibility while preserving existing behavior. The immediate aim is to reduce oversized backend service responsibilities, make module boundaries clearer, and centralize repeated magic values across backend and frontend so future changes do not require scattered updates, with the current scope centered on backend `resume` / `interview` refactoring plus shared default and threshold cleanup.

## What I already know

* The user wants refactoring and cleanup focused on extensibility and maintainability, not a net-new feature.
* The backend is a Spring Boot modular monolith using MyBatis-Flex and PostgreSQL.
* Project backend spec explicitly targets clear domain boundaries and feature-oriented packages.
* Current backend modules include `ai`, `common`, `export`, `interview`, `resume`, `share`, `system`, and `template`.
* The user first selected `resume` as the initial refactoring scope, and then requested that `interview` be included as well.
* `backend/src/main/java/com/smartresume/resume/service/ResumeService.java` already mixes listing, create/copy/update, delete/restore, snapshot/versioning, content persistence, and layout serialization concerns.
* `backend/src/main/java/com/smartresume/interview/service/InterviewService.java` is very large and likely another architectural hotspot.
* `backend/src/main/java/com/smartresume/resume/controller/ResumeController.java` is relatively thin, so the main extensibility pressure appears to be in service-layer orchestration.
* Inside `resume`, current packages are only `controller`, `domain`, `dto`, `mapper`, and `service`; there is no internal application/domain split yet.
* `ResumeService` currently centralizes:
* resume metadata CRUD
* section load/save and JSON serialization
* layout normalization/defaulting
* snapshot/version creation and reading
* template access validation and resolved-template assembly
* `interview` currently has `InterviewService`, `InterviewAssistService`, `InterviewPromptBuilder`, and `InterviewReportService`, but the main `InterviewService` still centralizes core orchestration.
* `InterviewService` currently centralizes:
* list/query filtering
* interview session creation and lifecycle transitions
* round advancement
* message submission
* streaming / regenerate streaming flows
* AI orchestration coordination across the interview lifecycle
* The user chose the MVP direction for `resume`: split responsibilities and also extract snapshot/version into an independent sub-capability.
* The user additionally requested a global API-prefix cleanup: move the current controller-level `/api` prefix into YAML configuration and simplify controller mappings.
* The later implementation scope also included centralizing repeated magic values across backend and frontend, such as pagination defaults, validation bounds, modal widths, score thresholds, and interaction thresholds.
* The backend serves static frontend assets from `src/main/resources/static`, so `server.servlet.context-path=/api` would be too broad for this project.
* A safer fit for this codebase is `spring.mvc.servlet.path=/api`, combined with removing `/api` from controller mappings and adjusting MVC interceptor path patterns.

## Assumptions (temporary)

* The user likely prefers incremental refactoring over a full backend rewrite.
* Preserving existing API contracts is more important than redesigning endpoint shapes.
* The implementation should now cover both backend service restructuring and cross-layer constant centralization, but still favor incremental internal restructuring over product behavior changes.
* The user prefers business behavior stability over aggressive domain-model redesign in this round.

## Open Questions

* Which repeated literals are worth promoting to shared constants versus keeping local to a single feature?

## Requirements (evolving)

* Improve backend extensibility of the `resume` and `interview` modules through clearer service/module boundaries.
* Keep behavior and existing API contracts stable unless a later decision explicitly expands scope.
* Prefer incremental, low-risk refactoring that can be verified with minimal necessary tests.
* Produce a refactoring shape that can be reused by other large backend modules later.
* Split `ResumeService` so resume metadata/content orchestration and snapshot/version workflows no longer live in one oversized class.
* Extract snapshot/version logic into its own service-level capability with clear boundaries.
* Keep controller API paths and DTO contracts stable for the current frontend.
* Refactor `InterviewService` so interview lifecycle, messaging, and streaming orchestration are not concentrated in one oversized class.
* Keep current interview endpoints and streaming contracts stable for the current frontend.
* Move the shared API prefix out of controller annotations and into YAML-backed MVC configuration.
* Keep externally visible API URLs unchanged after the prefix migration.
* Centralize repeated backend magic values into appropriately owned constants instead of duplicating literals across controllers, services, DTOs, and security/token code.
* Centralize repeated frontend magic values into shared or feature-local constants instead of duplicating literals across API helpers, components, and form rules.
* Keep constant extraction behavior-preserving: values may move, but defaults, limits, and thresholds must remain unchanged unless explicitly requested.

## Acceptance Criteria (evolving)

* [ ] A concrete `resume` refactoring scope is selected.
* [ ] The `resume` and `interview` modules have clearer responsibility boundaries than the current structure.
* [ ] The chosen refactoring path preserves existing external behavior for the covered scope.
* [ ] Minimal necessary verification is identified and run for changed behavior.
* [ ] Snapshot/version responsibilities are no longer embedded directly in the main `ResumeService` workflow implementation.
* [ ] `ResumeController` can continue serving the same current use cases without API contract changes.
* [ ] `InterviewService` no longer directly owns all major interview lifecycle and messaging flows in one class.
* [ ] `InterviewController` can continue serving the same current use cases without API contract changes.
* [ ] API routes remain externally compatible after moving the `/api` prefix into configuration.
* [ ] Reused backend defaults/limits are centralized behind clearly owned constants without changing their values.
* [ ] Reused frontend defaults/thresholds are centralized behind clearly owned constants without changing their values.
* [ ] Cross-layer defaults that should stay aligned, such as pagination and validation-related limits, are no longer duplicated as scattered literals.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* Broad frontend architectural refactoring beyond magic-value cleanup
* Unrelated feature work
* Full backend rewrite beyond `resume` and `interview`
* New resume editor features
* New snapshot/version product behavior
* New interview product behavior
* Large-scale schema redesign unless the agreed refactoring scope makes it unavoidable

## Technical Approach

Refactor the `resume` and `interview` modules toward smaller collaborating services inside the same feature packages, while keeping the existing REST API and DTOs intact. In parallel, centralize repeated magic values into the narrowest stable ownership scope across backend and frontend.

Planned direction:

* Keep `ResumeController` thin and contract-stable.
* Keep `InterviewController` thin and contract-stable.
* Reduce `ResumeService` to a narrower orchestration role, or split it into explicit application services by responsibility.
* Extract snapshot/version responsibilities into a dedicated service such as `ResumeVersionService`.
* Separate content/section persistence concerns from metadata lifecycle concerns where practical.
* Reduce `InterviewService` to narrower orchestration responsibilities, or split it into explicit interview sub-services by responsibility.
* Separate interview lifecycle transitions, message persistence/assembly, and streaming orchestration where practical.
* Configure the global API prefix in `application.yml` using MVC servlet path rather than a full server context path, so static assets and non-API web resources are not unintentionally remapped.
* Replace repeated backend literals with named constants close to their owning feature or shared contract boundary.
* Replace repeated frontend literals with shared HTTP defaults or feature-local constants modules, depending on reuse scope.
* Preserve current mapper usage and database schema unless a minimal supporting change becomes unavoidable.

Likely service boundaries for this MVP:

* `ResumeQueryService` or equivalent read-focused capability
* `ResumeCommandService` or equivalent create/update/delete/copy capability
* `ResumeVersionService` for snapshot capture and version retrieval
* optional internal helper/service for section content persistence and layout normalization
* `InterviewQueryService` or equivalent read-focused capability
* `InterviewLifecycleService` for create/pause/continue/next-round/end transitions
* `InterviewMessageService` and/or streaming-focused capability for submit/stream/regenerate flows

## Decision (ADR-lite)

**Context**: The current `resume` and `interview` modules concentrate too many responsibilities in oversized service classes, and repeated literals are duplicated across backend/frontend layers. This weakens extensibility and makes future maintenance changes riskier.

**Decision**: Refactor both `resume` and `interview` in this iteration. Use responsibility splitting as the primary refactoring strategy. In `resume`, explicitly extract snapshot/version into an independent sub-capability. In `interview`, split lifecycle and messaging/streaming responsibilities into clearer collaborators, while preserving existing API contracts and behavior.
Also move the shared `/api` prefix from controller annotations into YAML-backed MVC configuration while preserving external route compatibility, and centralize repeated backend/frontend magic values into clearly owned constants without changing product behavior.

**Consequences**: The codebase should become easier to extend and safer to evolve, especially for future changes in resume lifecycle/versioning, interview flows, and cross-layer defaults. The trade-off is a moderate increase in internal class count and constants modules, plus a broader verification surface than the original single-module plan.

## Technical Notes

* Inspected: `backend/pom.xml`
* Inspected: `backend/src/main/java/com/smartresume/resume/controller/ResumeController.java`
* Inspected: `backend/src/main/java/com/smartresume/resume/service/ResumeService.java`
* Inspected: `backend/src/main/java/com/smartresume/interview/service/InterviewService.java`
* Inspected: `.trellis/spec/backend/index.md`
* Inspected: `.trellis/spec/backend/directory-structure.md`
* Inspected: `.trellis/spec/backend/database-guidelines.md`
* Observed service sizes:
* `InterviewService.java`: 943 lines
* `ResumeService.java`: 453 lines
* `AiChatHistoryService.java`: 354 lines
* `TemplateCatalogService.java`: 339 lines
* `resume` refactor hotspots observed in `ResumeService`:
* list/query orchestration
* resume aggregate creation/update/delete
* section persistence mapping
* layout normalization/default generation
* snapshot/version workflows
* JSON serialization/deserialization helpers
* `interview` refactor hotspots observed in `InterviewService`:
* list/query orchestration
* session lifecycle transitions
* round progression
* message submission
* stream/regenerate stream orchestration
* AI workflow coordination
* Route-prefix migration notes:
* controllers currently hardcode `/api` in class-level or method-level mappings
* `ShareController` uses method-level `/api/**` mappings and also has public routes under `/api/public/**`
* `WebMvcConfig` interceptor rules currently hardcode `/api/**` and will need coordinated simplification
* Constant-centralization notes:
* backend extracted values include API pagination defaults, interview thresholds/status-related limits, auth/share token duration expressions, and validation limits
* frontend extracted values include shared page defaults, interview UI thresholds, and system/auth validation-related limits
