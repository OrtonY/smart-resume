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
