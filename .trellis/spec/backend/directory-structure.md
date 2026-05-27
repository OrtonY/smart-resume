# Directory Structure

> How backend code is organized in this project.

---

## Overview

The backend should use a feature-oriented package layout inside a single Spring Boot application.

Business logic belongs to domain modules, not to controllers or infrastructure adapters. AI orchestration should stay isolated behind application services so model vendor choices do not leak across the codebase.

---

## Directory Layout

```text
src/
├─ main/
│  ├─ java/
│  │  └─ com/example/smartresume/
│  │     ├─ SmartResumeApplication.java
│  │     ├─ common/
│  │     │  ├─ config/
│  │     │  ├─ exception/
│  │     │  └─ util/
│  │     ├─ ai/
│  │     │  ├─ controller/
│  │     │  ├─ service/
│  │     │  ├─ model/
│  │     │  └─ prompt/
│  │     ├─ resume/
│  │     │  ├─ controller/
│  │     │  ├─ service/
│  │     │  ├─ domain/
│  │     │  ├─ mapper/
│  │     │  └─ dto/
│  │     ├─ export/
│  │     ├─ share/
│  │     └─ system/
│  └─ resources/
│     ├─ application.yml
│     ├─ db/
│     │  └─ migration/
│     └─ prompts/
└─ test/
   └─ java/
```

---

## Module Organization

Use these placement rules:

* `controller/`: REST endpoints, request mapping, request/response DTO mapping, no business rules.
* `service/`: application orchestration, transactions, export/share coordination.
* `domain/`: core entities, value objects, and domain rules that should not depend on web or database APIs.
* `mapper/`: MyBatis-Flex mappers and persistence-facing models.
* `dto/`: external transport models and command/query payloads.
* `common/`: only truly shared concerns. Do not dump feature logic here.

When a feature grows beyond one or two services, prefer introducing its own package instead of extending `common`.

### Refactor Baseline (Resume / Interview)

The current extensibility baseline keeps feature boundaries unchanged (`resume`, `interview`) while splitting oversized services into narrower collaborators.

`resume` module service roles:

* `ResumeService`: feature entry orchestration used by controllers.
* `ResumeLookupService`: owned-resume lookup and active-state validation.
* `ResumeContentService`: section payload read/write, layout normalization, JSON conversion.
* `ResumeVersionService`: snapshot capture and version-detail reconstruction.

`interview` module service roles:

* `InterviewService`: workflow orchestration for create, pause, continue, next-round, submit, stream, and end.
* `InterviewQueryService`: list/detail query composition and response assembly.
* `InterviewSessionSupportService`: shared session/message/round-topic persistence helpers and status guards.
* `InterviewAiOrchestrationService`: AI prompt composition, normal call/stream call, topic/context extraction.
* `InterviewConstants`: feature-local business thresholds and enumerated status values.

Boundary rule:

* Controllers call only feature entry/orchestration services; they do not compose mapper-level details directly.
* Feature-local constants stay inside the feature package unless reused across features.
* Cross-feature defaults (for example common paging defaults) should live under `common` with explicit ownership.

### Routing Convention

* External API examples in specs continue to use `/api/...` paths.
* Backend controllers should declare feature-local mappings only, for example `@RequestMapping("/resumes")`, and should not hardcode the shared `/api` prefix.
* The shared API prefix is configured through `app.api-prefix` in `application.yml` and applied centrally by `common/config/WebMvcConfig`.
* Interceptor path patterns that protect API routes must derive from the same configured prefix instead of duplicating literal `/api/**` strings.

--- 

## Naming Conventions

* Packages use lowercase singular nouns where practical: `resume`, `user`, `job`.
* For MVP, prefer package names that match actual scope such as `resume`, `share`, `export`, and `system`.
* Controllers end with `Controller`.
* Application services end with `Service`.
* MyBatis-Flex mapper interfaces end with `Mapper`.
* Database entity classes should reflect domain concepts, not UI labels.
* Prompt templates should use task-oriented names such as `resume-polish.st`.

Avoid generic names like `Manager`, `Handler`, or `Helper` unless the role is genuinely cross-cutting.

---

## Examples

There are no implementation examples yet. The first backend scaffold should follow this document and then update it with real package names.
