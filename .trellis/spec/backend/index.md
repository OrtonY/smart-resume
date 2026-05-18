# Backend Development Guidelines

> Backend conventions for the Smart Resume service.

---

## Overview

This project uses a Spring Boot backend with PostgreSQL and MyBatis-Flex for persistence. Spring AI related dependencies may be introduced later, but they are not part of the first-version delivery scope.

The backend should start as a modular monolith with clear domain boundaries so we can move fast during MVP without coupling every feature together.

At the current bootstrap stage, these documents define the initial engineering baseline. They should be updated once the real codebase establishes stronger conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Bootstrap baseline |
| [Database Guidelines](./database-guidelines.md) | PostgreSQL schema, persistence, migrations | Bootstrap baseline |
| [AI Chat Service](./ai-chat-service.md) | Shared AI invocation layer (stream/call/callStructured), conversation id format, retry policy | Active |
| [AI Chat History](./ai-chat-history.md) | Resume chat memory persistence, conversation id rules per feature | Active |
| [AI Resume Scoring](./ai-resume-scoring.md) | Resume scoring API and AI-backed response contract | Active |
| [Error Handling](./error-handling.md) | Error types, handling strategies | To refine |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To refine |
| [Logging Guidelines](./logging-guidelines.md) | Structured logging, log levels | To refine |

---

## Confirmed Stack

* Framework: Spring Boot
* Persistence: MyBatis-Flex
* Database: PostgreSQL
* Architecture target: modular monolith
* API style: REST-first for MVP unless a later requirement forces another interface

## Expected Backend Domains

The first implementation pass should reserve room for these business areas:

* `resume`: resume aggregate, sections, versioning
* `export`: document export pipeline and format adapters
* `share`: share links, publication state, access control if required
* `system`: single-user password settings and application bootstrap state
* `common`: shared exceptions, config, infrastructure utilities

Future-facing but out of MVP runtime scope:

* `ai`: prompt orchestration, model calls, output normalization

---

**Language**: All documentation should be written in **English** and updated as real project conventions emerge.
