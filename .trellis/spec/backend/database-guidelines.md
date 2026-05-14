# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

PostgreSQL is the system of record for resume content and workflow state.

The database design should favor normalized core resume data with explicit version tracking, while AI request/response artifacts should be stored only when they provide product or audit value.

Migration tooling is still to be finalized during implementation. Until then, every schema change must be treated as migration-driven and reproducible.

---

## Query Patterns

* Use MyBatis-Flex as the default persistence layer for CRUD, pagination, and conditional query building.
* Keep mapper interfaces focused on persistence concerns. Do not move business decisions into SQL conditions unless the rule is inherently data-centric.
* Keep custom SQL explicit and isolated when performance or PostgreSQL-specific behavior requires it.
* Avoid building dynamic SQL strings in service classes.
* Batch writes should be used for section reordering, version snapshots, and import pipelines when record counts justify it.
* Read models for resume preview or dashboard views can use dedicated projection DTOs instead of loading full aggregates.

When export, share, or future AI processing updates multiple related records, the service layer should define the transaction boundary clearly.

---

## Migrations

* Every schema change must be represented as a checked-in migration.
* Do not modify an already-applied migration in place.
* Seed data should be minimal and environment-safe.
* Migration naming should describe the business change, for example `create_resume_tables` or `add_resume_version_snapshot`.

Tool choice pending confirmation:

* Preferred MVP direction: Flyway
* Alternative if the team prefers richer change-set metadata: Liquibase

---

## Naming Conventions

* Tables use `snake_case` and plural names when representing collections, such as `resumes`, `resume_sections`, `resume_versions`.
* Primary keys should be consistent across the project, with UUID preferred if distributed creation matters.
* Foreign keys use `<entity>_id`.
* Timestamps use `created_at`, `updated_at`, and `deleted_at` when soft delete is needed.
* Unique indexes and secondary indexes should use descriptive names such as `uk_resume_user_title` or `idx_resume_section_resume_id`.

The exact ID strategy remains open until the MVP concurrency and integration needs are confirmed.

---

## Common Mistakes

* Storing the entire resume only as a single blob too early, which makes editing and analytics harder.
* Mixing AI prompt logs with user-facing domain data without a retention rule.
* Letting controller code decide transaction boundaries.
* Relying on ORM defaults for index strategy instead of designing for resume search and ownership lookups.

---

## Scenario: Resume Template Catalog Persistence

### 1. Scope / Trigger
- Trigger: resume template metadata now needs CRUD management, database persistence, and backup-based rollback.

### 2. Signatures
- Public read API: `GET /api/public/templates`
- Authenticated management APIs:
  - `GET /api/templates`
  - `POST /api/templates`
  - `PUT /api/templates/{templateKey}`
  - `DELETE /api/templates/{templateKey}`
  - `POST /api/templates/restore-from-backup`
- Database table: `resume_templates`

### 3. Contracts
- `resume_templates` columns:
  - `key` primary key
  - `name`, `summary`, `category`, `layout`
  - `theme_json`, `preview_json`
  - `built_in`, `deleted`
  - `created_at`, `updated_at`, `deleted_at`
- Backup source of truth for rollback:
  - classpath file: `src/main/resources/templates/catalog.json`
- Runtime behavior:
  - public list reads active templates from database
  - when no active templates exist, built-in templates are restored from backup automatically
  - restore endpoint overwrites built-in rows from backup but preserves custom rows

### 4. Validation & Error Matrix
- Unsupported `layout` -> `400 Bad Request`
- Duplicate `key` on create -> `409 Conflict`
- Delete request for built-in template -> `409 Conflict`
- Missing or deleted template on update/delete -> `404 Not Found`
- Backup file missing / malformed -> `500 Internal Server Error`

### 5. Good/Base/Bad Cases
- Good: custom template is created in DB, appears in both authenticated and public list responses.
- Base: DB template rows are lost; first public read or explicit restore repopulates built-in templates from backup file.
- Bad: operator deletes a built-in template directly from DB without backup restore; service must rehydrate when the active catalog becomes empty.

### 6. Tests Required
- Migration applies successfully with new `resume_templates` table and indexes.
- Service assertions:
  - create/update/delete custom template
  - reject delete for built-in template
  - restore endpoint rewrites built-in templates from backup
  - empty catalog triggers built-in restore path
- API assertions:
  - unauthenticated access works only on `/api/public/templates`
  - authenticated CRUD remains under `/api/templates`

### 7. Wrong vs Correct
#### Wrong
- Treat the frontend manifest as the only mutable source while also expecting database-side template management.
- Store built-in backup templates only in memory, leaving no rollback artifact after data loss.

#### Correct
- Keep one checked-in backup catalog under `resources/templates/` and treat database rows as the operational catalog.
- Separate public read access from authenticated management APIs so share pages can resolve templates without exposing write access.
