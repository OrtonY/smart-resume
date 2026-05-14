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
