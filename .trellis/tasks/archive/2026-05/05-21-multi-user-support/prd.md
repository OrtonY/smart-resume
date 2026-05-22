# brainstorm: support multi-user accounts and data isolation

## Goal

Convert the current single-user application into a multi-user product with account-based authentication, so each user logs in with a username and password, sees only their own business data, and manages a private AI configuration.

## What I already know

* The user wants to switch the current mode from single-user to multi-user.
* The login page must support user registration.
* Login must use username + password instead of the current global password-only flow.
* All authenticated data should gain a `userId` ownership field.
* AI configuration must belong to each individual user.
* Custom resume templates should also belong to individual users, while built-in templates can remain shared.
* Existing data should be preserved by seeding a default legacy account.
* The seeded legacy account should use username `admin` with `userId = 1` as the historical owner.
* The seeded legacy account should inherit the current configured system password instead of using a new fixed default password.
* Self-service registration should stay open by default, but the backend should reserve a switch to disable public registration later.
* The frontend should expose an admin-only control for enabling/disabling public registration.
* `SPRING_AI_CHAT_MEMORY` does not need a separate `user_id` migration as long as ownership is enforced through related conversation/business records and it is not queried independently by user scope.
* The current backend `system` module is still built around a singleton credential (`system_credentials`) and token validation tied to one global password.
* The current frontend routes users between `SetupPage` and `UnlockPage`, which also assume a one-time global password bootstrap.
* Current core persisted business data is user-agnostic: resumes, resume sections, resume versions, share links, interview sessions/messages/topics, AI chat conversations, and AI configuration are not explicitly owned by a user.
* AI conversation ids are currently generated from `resumeId` + feature code + timestamp, without user context.

## Assumptions (temporary)

* This is an MVP multi-user change, not a full organization/team tenancy model.
* Username is a unique login identifier across the whole system.
* Public share pages can remain publicly accessible, but any edit/admin action must still enforce ownership through the logged-in user.
* Existing single-user bootstrap pages will be replaced or repurposed by account registration/login pages.
* Historical single-user records can be migrated to a seeded legacy user with id `1`.
* The existing global password hash can be migrated into the seeded legacy user record during schema/data migration.

## Open Questions

* None currently.

## Requirements (evolving)

* Introduce a user account model that supports registration and login with username + password.
* Replace the current global password bootstrap/unlock flow with account-oriented authentication UX and API contracts.
* Add user ownership to all authenticated business data and enforce isolation on read/write operations.
* Scope AI configuration to the owning user instead of a singleton global record.
* Scope custom resume templates to the owning user while keeping built-in templates shared across users.
* Preserve public sharing behavior where appropriate without exposing unrelated private data.
* Migrate historical single-user data to a seeded legacy user account so existing data remains available after the upgrade.
* Reuse the current global password as the initial password for the seeded legacy user account during migration.
* Support public self-service registration in MVP, with a backend-controlled switch that can disable future public registration.
* Show the registration switch in the authenticated frontend only for the `admin` user.

## Acceptance Criteria (evolving)

* [ ] A new user can register with username + password and receive a valid login token.
* [ ] An existing user can log in with username + password from the frontend.
* [ ] Authenticated API requests resolve the current user and reject unauthorized access.
* [ ] Resumes, interviews, shares, AI conversations, and AI configuration are isolated by user ownership.
* [ ] Custom templates are visible and editable only by their owner, while built-in templates remain available to everyone.
* [ ] The application no longer depends on a singleton global password bootstrap flow.
* [ ] Historical data created before the migration remains accessible through the seeded legacy account.
* [ ] The seeded legacy user can log in with the migrated existing password after the upgrade.
* [ ] When registration is enabled, a visitor can create a new personal account from the login page.
* [ ] When the future registration switch is disabled, public registration requests are rejected cleanly.
* [ ] The authenticated frontend shows the registration toggle only to the `admin` user.
* [ ] Non-admin users cannot see or change the registration toggle.

## Technical Approach

* Add a real `users` table and migrate authentication from singleton system password verification to per-user credential verification.
* Seed legacy user `admin` with id `1`, migrate the current system password hash into that account, and backfill historical rows to `user_id = 1`.
* Add `user_id` ownership columns to authenticated business tables and enforce filtering by current authenticated user in service/query layers.
* Replace the frontend bootstrap/unlock flow with account registration/login screens and token-backed current-user authentication.
* Move AI configuration from singleton storage to user-scoped storage keyed by the authenticated user.
* Add ownership to user-created template records while preserving shared built-in template behavior.
* Add a registration-settings capability in the backend and surface it in the workspace frontend as an admin-only control, likely alongside other workspace-level actions such as AI configuration.
* Leave `SPRING_AI_CHAT_MEMORY` schema unchanged for MVP and rely on conversation-level ownership plus guarded access paths instead of duplicating `user_id` there.

## Decision (ADR-lite)

**Context**: The current product was built for a single local user with one global password and globally shared data. The new requirement is multi-user isolation without losing existing records.

**Decision**: Introduce per-user accounts, migrate historical data to a seeded `admin` user with id `1`, reuse the existing global password as that user's initial password, keep public self-registration enabled by default, reserve a backend switch for disabling registration later, and expose that switch in the frontend only to the `admin` user. Historical backfill may use `user_id = 1`, but new writes must resolve the authenticated user explicitly instead of relying on a permanent database default. User-created templates become private per user, while `SPRING_AI_CHAT_MEMORY` stays schema-stable and is protected through upstream ownership checks.

**Consequences**: This keeps old data accessible while moving safely to real account isolation. It also avoids a silent long-term fallback to user `1`, which would otherwise hide ownership bugs and weaken multi-user guarantees.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* Role-based access control, admin consoles, or organization/workspace membership
* Social login, email verification, password reset, or MFA unless later required
* Cross-user collaboration on the same resume

## Technical Notes

* Auth flow today:
  * `backend/src/main/java/com/smartresume/system/controller/SystemAccessController.java`
  * `backend/src/main/java/com/smartresume/system/service/SystemAccessService.java`
  * `backend/src/main/java/com/smartresume/common/security/AuthTokenInterceptor.java`
  * `frontend/src/app/router/AppRouter.tsx`
  * `frontend/src/pages/SetupPage.tsx`
  * `frontend/src/pages/UnlockPage.tsx`
  * `frontend/src/features/system/api/systemApi.ts`
* AI configuration today:
  * `backend/src/main/java/com/smartresume/ai/service/AiConfigurationService.java`
  * `backend/src/main/java/com/smartresume/ai/domain/AiConfigurationEntity.java`
  * `backend/src/main/resources/db/migration/V5__create_ai_configuration.sql`
* Persistence areas impacted:
  * `backend/src/main/resources/db/migration/V1__init_schema.sql`
  * `backend/src/main/resources/db/migration/V6__create_ai_chat_messages.sql`
  * `backend/src/main/resources/db/migration/V8__create_ai_chat_conversations.sql`
  * `backend/src/main/resources/db/migration/V9__share_password_and_access_logs.sql`
  * `backend/src/main/resources/db/migration/V10__create_interview_sessions.sql`
  * `backend/src/main/resources/db/migration/V2__create_resume_templates.sql`
* Domain ownership will likely touch `resume`, `share`, `interview`, `ai`, and `system` backend modules plus frontend auth routing and API typing.
* Likely migration strategy:
  * create a real `users` table
  * seed legacy user id `1`
  * backfill `user_id = 1` into historical business rows
  * migrate the existing `system_credentials` password hash into the seeded legacy user
  * avoid relying on a permanent DB default for new authenticated writes unless explicitly chosen
* frontend auth UX will likely replace `SetupPage` and `UnlockPage` with username/password login + registration entry points
* likely frontend placement for the admin-only registration toggle: workspace hub action area near other workspace-level settings, instead of a separate admin console for MVP
* template ownership likely affects:
  * `backend/src/main/java/com/smartresume/template/domain/ResumeTemplateEntity.java`
  * `backend/src/main/java/com/smartresume/template/service/TemplateCatalogService.java`
* `SPRING_AI_CHAT_MEMORY` can remain unchanged because the app reaches it through conversation ids tied to already-owned records rather than through standalone user listings.
