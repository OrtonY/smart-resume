# Authentication & Multi-User Data Isolation

> Contracts for user authentication, session management, and per-user data ownership.

---

## Scenario: Multi-User Authentication System

### 1. Scope / Trigger

- Trigger: The application moved from single-user global password to per-user account authentication with data isolation across all business domains.

### 2. Signatures

**Controller**: `SystemAccessController` (`/api/access`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/bootstrap-status` | Public | Check if users exist + registration enabled |
| POST | `/register` | Public | Create account (first user becomes admin) |
| POST | `/login` | Public | Authenticate and receive token |
| GET | `/session` | Authenticated | Get current user info + settings |
| PUT | `/password` | Authenticated | Change own password |
| PUT | `/registration-settings` | Admin-only | Toggle public registration |

**Service**: `SystemAccessService`

**Security infrastructure**:
- `CurrentUserContext` — ThreadLocal holder, set/cleared by interceptor per request
- `AuthTokenService` — HMAC-based token with `userId` + `credentialVersion` + expiry
- `AuthTokenInterceptor` — extracts token, calls `authenticateAccessToken`, sets context

### 3. Contracts

**Request DTOs**:

```java
record RegisterRequest(
    @NotBlank @Size(min=3, max=80) String username,
    @NotBlank @Size(min=6, max=64) String password
)

record LoginRequest(
    @NotBlank @Size(min=3, max=80) String username,
    @NotBlank String password
)

record ChangePasswordRequest(
    @NotBlank String currentPassword,
    @NotBlank @Size(min=6, max=64) String newPassword
)

record RegistrationSettingsRequest(boolean registrationEnabled)
```

**Response DTOs**:

```java
record BootstrapStatusResponse(boolean hasUsers, boolean registrationEnabled)
record SessionUserResponse(long userId, String username, boolean admin)
record AccessTokenResponse(String accessToken, SessionUserResponse user)
record SessionResponse(SessionUserResponse user, boolean registrationEnabled)
record RegistrationSettingsResponse(boolean registrationEnabled)
```

**Token payload**:

```java
record TokenPayload(
    long issuedAtEpochSecond,
    long expiresAtEpochSecond,
    long userId,
    long credentialVersion,
    String nonce
)
```

**Frontend types** (`features/system/types.ts`):
- `BootstrapStatus { hasUsers, registrationEnabled }`
- `SessionUser { userId, username, admin }`
- `AccessTokenResponse { accessToken, user }`
- `SessionResponse { user, registrationEnabled }`

**Token storage** (`lib/auth/tokenStorage.ts`):
- localStorage key: `smart-resume-access-token`
- Cross-tab sync via `CustomEvent` + `StorageEvent`
- `subscribeAccessToken(listener)` for reactive changes

### 4. Validation & Error Matrix

| Condition | HTTP Status | Error Message |
|-----------|-------------|---------------|
| Register with existing username | 409 Conflict | "Username already exists" |
| Register when registration disabled (non-first user) | 403 Forbidden | "Registration is currently disabled" |
| Login with wrong credentials | 401 Unauthorized | "Incorrect username or password" |
| Token expired or credential version mismatch | 401 Unauthorized | "Access token is no longer valid" |
| No token on authenticated endpoint | 401 Unauthorized | "Authentication is required" |
| Non-admin calls admin-only endpoint | 403 Forbidden | "Admin access is required" |
| Change password with wrong current password | 400 Bad Request | "Current password is incorrect" |
| Username < 3 or > 80 chars | 400 Bad Request | Jakarta validation message |
| Password < 6 or > 64 chars (register/change) | 400 Bad Request | Jakarta validation message |

### 5. Good/Base/Bad Cases

- **Good**: First user registers → becomes admin automatically. Subsequent users register when enabled → non-admin. Admin disables registration → new registrations rejected.
- **Base**: Legacy single-user data migrated to seeded `admin` user (id=1). Old password hash preserved. User logs in with existing credentials.
- **Bad**: Token issued before password change → rejected on next request (credentialVersion mismatch, even if login and password change happen within the same second). Service code calls `CurrentUserContext.requireUserId()` without interceptor having run → 401.

### 6. Tests Required

- **Unit** (`SystemAccessServiceTest`):
  - Register first user → admin flag true
  - Register second user → admin flag false
  - Register when disabled → 403
  - Login success → valid token
  - Login wrong password → 401
  - Change password → old token invalidated
  - Registration toggle → admin-only enforcement
- **Integration**:
  - Full request lifecycle: register → login → session → authenticated API call
  - Token invalidation after password change
  - Interceptor sets/clears `CurrentUserContext` correctly

### 7. Wrong vs Correct

#### Wrong
```java
// Hardcoding user_id = 1 in service layer
long userId = 1L;
resumeMapper.selectByUserId(userId);
```

#### Correct
```java
// Always resolve from authenticated context
long userId = CurrentUserContext.requireUserId();
resumeMapper.selectByUserId(userId);
```

#### Wrong
```java
// Checking admin in controller with manual flag
if (!request.getHeader("X-Admin").equals("true")) { ... }
```

#### Correct
```java
// Using CurrentUserContext which is set by interceptor from verified token
CurrentUserContext.requireAdmin();
```

---

## Scenario: Per-User Data Isolation

### 1. Scope / Trigger

- Trigger: All business tables require `user_id` ownership column. Every query must filter by authenticated user.

### 2. Signatures

**Affected tables** (all have `user_id bigint NOT NULL`):
- `resumes`, `resume_sections`, `resume_versions`
- `resume_share_links`, `share_access_logs`
- `ai_configurations` (unique per user)
- `ai_chat_messages`, `ai_chat_conversations`
- `interview_sessions`, `interview_messages`, `interview_round_topics`
- `resume_templates` (user-created only; built-in templates have `user_id = NULL` allowed)

**Index pattern**: composite indexes lead with `user_id` for ownership queries:
```sql
CREATE INDEX idx_<table>_user_<sort> ON <table> (user_id, <sort_column> DESC);
```

### 3. Contracts

**Service layer rule**: Every service method that reads/writes user data must:
1. Call `CurrentUserContext.requireUserId()` to get the authenticated user
2. Include `user_id = ?` in all queries (read and write)
3. Set `entity.setUserId(userId)` on all new inserts

**Exception**: Public share reads and verification endpoints (`GET /api/public/shares/{shareCode}/access`, `GET /api/public/shares/{shareCode}`, `POST /api/public/shares/{shareCode}/verify`) bypass `CurrentUserContext` user filtering; they resolve by share code and enforce `active` plus password/token checks in share-domain service logic.

### 4. Validation & Error Matrix

| Condition | Behavior |
|-----------|----------|
| Query without user_id filter | Must not happen — service layer enforces |
| User A tries to access User B's resume | Returns empty result or 404 (not 403, to avoid leaking existence) |
| Built-in template query | Filter by `built_in = true` regardless of user_id |
| Custom template query | Filter by `user_id = currentUser` |

### 5. Good/Base/Bad Cases

- **Good**: Each user sees only their own resumes, interviews, AI config. Admin has no special data access (admin flag is for system settings only, not data visibility).
- **Base**: Legacy data migrated to user_id=1 (admin). New users start with empty workspace.
- **Bad**: A service method forgets `user_id` filter → data leak across users.

### 6. Tests Required

- Service tests must verify that queries include user_id filtering
- Create data as User A, query as User B → empty result
- AI configuration is unique per user (uk_ai_configurations_user_id)

### 7. Wrong vs Correct

#### Wrong
```java
// Querying without user scope
List<ResumeEntity> resumes = resumeMapper.selectAll();
```

#### Correct
```java
long userId = CurrentUserContext.requireUserId();
List<ResumeEntity> resumes = resumeMapper.selectListByQuery(
    QueryWrapper.create()
        .where(RESUME_ENTITY.USER_ID.eq(userId))
        .orderBy(RESUME_ENTITY.UPDATED_AT.desc())
);
```

---

## Design Decision: Single-to-Multi-User Migration Strategy

**Context**: Existing single-user app has data in all business tables without ownership.

**Decision**: Three-phase migration in a single Flyway script:
1. Add `user_id` as nullable to all tables
2. Backfill from related records (sections from resumes, messages from sessions, etc.)
3. Set `NOT NULL` constraint after backfill

**Why**: Avoids data loss, keeps migration atomic, and ensures no row is left without ownership.

**Seed strategy**: First user (admin) inherits existing `system_credentials` password hash. All orphan data assigned to user_id=1.

**Consequences**: New writes must always resolve user from `CurrentUserContext` — never fall back to a default user_id. The migration default of `1` is a one-time backfill, not a runtime behavior.

