# brainstorm: ai resume tool

## Goal

Build a resume management application with a Spring Boot backend and an Ant Design + TypeScript frontend. The first version should focus on resume CRUD, export, and share workflows, while leaving room for AI features in later phases.

## What I already know

* The product is an AI resume tool.
* Backend stack: Spring Boot + Spring AI + Spring AI Alibaba + PostgreSQL.
* Frontend stack: Ant Design + TypeScript.
* Data access layer: MyBatis-Flex.
* The repository is still in bootstrap stage and does not yet contain app code.
* Trellis backend/frontend spec files are mostly templates and need initial project-specific content.
* The first version should ignore AI capability and focus on resume management basics.
* The project is for personal use as a single-user application.

## Assumptions (temporary)

* We will build a web application rather than a mobile-first native app.
* The initial delivery will be a modular monolith instead of microservices.
* Resume data will be persisted in PostgreSQL.
* AI-related dependencies may stay in the long-term architecture, but first-version business flows will not depend on model calls.

## Open Questions

* None currently. Requirements are ready for confirmation.

## Requirements (evolving)

* Define the product goal and MVP boundary for the first-version resume tool.
* Support creating, editing, deleting, exporting, and sharing resumes.
* Support public link sharing for resumes in MVP.
* Support both share modes in MVP: links that always show the latest resume content, and links that lock to a snapshot generated at share time.
* Support PDF export only in MVP.
* Use a single-user access model in MVP.
* If no password is configured, the app should guide the user to set one before entering the workspace.
* If a password is configured, the app should require password entry without a username.
* Support these resume sections in MVP: personal info, education, work experience, project experience, skills, personal summary, honors/awards, and certificates.
* Support multiple selectable resume templates/themes in MVP.
* Use soft delete for resumes in MVP and allow recovery.
* Use auto-save for resume editing in MVP.
* Capture initial backend conventions for a Spring Boot + MyBatis-Flex + PostgreSQL service.
* Capture initial frontend conventions for an Ant Design + TypeScript application.
* Keep architecture decisions lightweight and explicit so later implementation can start from a stable baseline.
* Preserve extension points for future AI-assisted resume features without making them part of MVP delivery.

## Acceptance Criteria

* [ ] On first visit, if no password is configured, the user is guided to set a password before entering the workspace.
* [ ] After a password is configured, the user can enter the application using password-only authentication with no username.
* [ ] The user can create, view, edit, soft-delete, and recover resumes.
* [ ] Resume editing covers personal info, education, work experience, project experience, skills, personal summary, honors/awards, and certificates.
* [ ] Resume editing uses auto-save and exposes clear save status to the user.
* [ ] The user can switch among multiple resume templates while reusing the same structured resume content.
* [ ] The user can export a resume as PDF.
* [ ] The user can create public share links that always display the latest resume content.
* [ ] The user can create public share links that display a fixed snapshot version.
* [ ] Deleted resumes are excluded from the default list view but remain recoverable.
* [ ] Backend and frontend Trellis specs are aligned with Spring Boot + MyBatis-Flex + PostgreSQL and Ant Design + TypeScript.

## Definition of Done (team quality bar)

* Tests added/updated when code implementation starts
* Lint / typecheck / CI green when code implementation starts
* Docs/notes updated if behavior or conventions change
* Risky architecture decisions recorded before coding

## Out of Scope (explicit)

* Final UI design details
* AI generation, optimization, or JD tailoring
* Password-protected or private-token share control beyond basic public links
* Word or other non-PDF export formats
* Multi-user accounts, roles, or team collaboration
* Production deployment topology
* Full resume template library
* Arbitrary custom resume sections unless added later by explicit scope expansion

## Technical Approach

Start with a documented modular-monolith baseline:

* Backend owns resume domain logic, local access control, export/share orchestration, and MyBatis-Flex persistence.
* Frontend owns password gate flow, resume editing flows, template selection, preview/export entry points, and workspace-style page composition.
* PostgreSQL stores system access settings, resumes, resume sections, template selection, version history, and public share/export metadata once the schema is confirmed.
* Future AI capabilities should integrate as a later module instead of shaping the first-version API surface.

## Implementation Plan

* PR1: scaffold backend and frontend projects, establish single-user password gate, and define the core resume data model
* PR2: implement resume CRUD, soft delete/recovery, and auto-save editing flows for the confirmed resume sections
* PR3: implement multi-template preview rendering plus PDF export
* PR4: implement public sharing for latest-content links and snapshot links, then polish verification and documentation

## Decision (ADR-lite)

**Context**: The MVP needs a lightweight but usable sharing model.
**Decision**: Share is defined as public link sharing in the first version.
**Consequences**: The backend should model publishable resume snapshots or public visibility metadata, while stronger share controls such as passwords or scoped permissions stay out of MVP.

**Context**: Export formats strongly affect implementation cost and document rendering complexity.
**Decision**: Export is limited to PDF in the first version.
**Consequences**: The export module can focus on one rendering pipeline first, and Word compatibility remains a later extension.

**Context**: The product is intended for personal use and does not need a full account system.
**Decision**: MVP uses a single-user password gate. If no password exists, the first visit should lead to password setup. If a password exists, entry requires password only and no username.
**Consequences**: The backend needs lightweight settings/auth state instead of a full user model, and the frontend needs an initialization gate before the main workspace.

**Context**: Resume section scope determines both the editing UI and the underlying persistence shape.
**Decision**: MVP includes personal info, education, work experience, project experience, skills, personal summary, honors/awards, and certificates.
**Consequences**: The schema and frontend forms should optimize for these structured sections first, while arbitrary custom sections stay out of scope for now.

**Context**: Template strategy affects rendering architecture for preview, export, and share pages.
**Decision**: MVP supports multiple selectable resume templates.
**Consequences**: The system should separate resume content from presentation configuration so multiple templates can render the same structured resume data.

**Context**: Public sharing has two valid use cases: keeping one stable public profile and sharing a fixed version for a specific opportunity.
**Decision**: MVP supports both latest-content share links and snapshot share links.
**Consequences**: The backend should distinguish dynamic share references from version-bound share records, and the frontend should let the user choose the share mode explicitly.

**Context**: Resume deletion is risky because the product is single-user and stores personal long-lived content.
**Decision**: MVP uses soft delete with recovery instead of permanent deletion.
**Consequences**: The schema should include deletion markers, list queries should exclude deleted resumes by default, and the UI should provide a recovery path.

**Context**: Resume editing is form-heavy and the product is intended for personal daily use.
**Decision**: MVP uses auto-save instead of requiring manual save.
**Consequences**: The frontend should expose save status clearly, and the backend should support frequent idempotent updates without creating noisy history on every keystroke.

## Technical Notes

* Task directory: `.trellis/tasks/05-14-ai-resume-tool/`
* Relevant spec layers: `.trellis/spec/backend/`, `.trellis/spec/frontend/`
* Project currently has no application source tree, so spec content is an initial baseline rather than code-derived documentation.
