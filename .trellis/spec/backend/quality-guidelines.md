# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

### Don't: Duplicate Stable Magic Values

**Problem**:

```java
// Don't do this
params.set("pageSize", String.valueOf(6));
if (score >= 80) { ... }
tokenExpiresAt = now.plusSeconds(24 * 60 * 60);
```

**Why it's bad**: Stable defaults, thresholds, and limits drift easily when copied across controllers, services, DTO validation, and frontend clients. It also hides ownership of business rules.

**Instead**:

```java
// Do this instead
@RequestParam(defaultValue = ApiPageDefaults.DEFAULT_PAGE_SIZE) int pageSize
if (score >= InterviewConstants.SCORE_EXCELLENT_THRESHOLD) { ... }
tokenExpiresAt = now.plusSeconds(Duration.ofHours(24).getSeconds());
```

**Rule**:

* If a value has business meaning, validation meaning, interaction meaning, or cross-layer contract meaning, do not inline it in multiple places.
* Prefer a feature-local constant first.
* Promote to shared constants only when the same default is intentionally reused across features.
* Do not create an unowned global constants dump.

---

## Required Patterns

### Centralize Repeated Business Limits

- If a numeric limit or default value carries business meaning and is reused across methods or files, define it once in the closest reasonable scope:
  - feature-local constants for feature rules, such as interview score bounds or summary limits
  - shared constants for cross-feature defaults, such as common API pagination defaults
- Do not create a catch-all global constants class. Keep ownership close to the feature or shared concern that uses the value.

### Prefer Typed Time Units

- For time arithmetic, prefer `Duration` / `ChronoUnit` style expressions over raw multiplications such as `24 * 60 * 60`.
- This applies especially to token validity, cache TTL, and timeout calculations.

### Convention: Place Constants Near Their Ownership

**What**: Repeated values must be owned by the smallest stable scope that explains their meaning.

**How to place them**:

* Use feature-local constants for feature rules, such as `InterviewConstants`.
* Use DTO-local or API-local constants for shared validation or pagination defaults, such as `SystemAccessDtos` or `ApiPageDefaults`.
* Keep UI interaction thresholds in frontend feature/shared constants, not copied back into backend specs unless they define a backend contract.

**Wrong vs Correct**:

```java
// Wrong: repeated literals spread across layers
@Size(min = 6, max = 64)
params.set("pageSize", String.valueOf(6))
```

```java
// Correct: named, owned constants
@Size(min = PASSWORD_MIN_LENGTH, max = PASSWORD_MAX_LENGTH)
params.set("pageSize", String.valueOf(DEFAULT_PAGE_SIZE))
```

### Scenario: Refactor-Only Service Splitting

#### 1. Scope / Trigger

* Trigger: large backend services were split for extensibility without changing external API behavior.

#### 2. Signatures

* External controller routes remain `/api/...` from the client perspective.
* Controller-local mappings should stay feature-local, such as `/resumes`, `/interviews`, `/system`.
* Shared prefix ownership is `app.api-prefix` plus `common/config/WebMvcConfig`.

#### 3. Contracts

* Service splitting must not change request DTO fields, response DTO fields, route shapes, or paging defaults.
* Internal collaborators may move responsibilities, but controller-facing method behavior must remain compatible.

#### 4. Validation & Error Matrix

* Same request + same persisted state -> same success path and same response shape.
* Same invalid input -> same HTTP status and equivalent error meaning.
* Same ownership/deleted-state checks -> same conflict/not-found behavior.

#### 5. Good/Base/Bad Cases

* Good: split a large service into query/support/version/orchestration services while keeping DTOs, routes, and defaults unchanged.
* Base: move repeated values into named constants with identical values and ownership.
* Bad: refactor service structure and quietly change page size, route prefix behavior, validation bounds, or status semantics.

#### 6. Tests Required

* Service tests covering moved lifecycle flows still pass after the split.
* Route/build verification confirms old external URLs still resolve through centralized prefix configuration.
* When defaults are centralized, tests or assertions should cover the shared constant value at the consuming boundary.

#### 7. Wrong vs Correct

##### Wrong

* Split internals and also change a controller default from `6` to `10` because "it is a better default".
* Move `/api` handling into each controller differently after removing the shared prefix.

##### Correct

* Split internals, extract constants, and preserve the same route contract, validation limits, and defaults.

--- 

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)

### Scenario: PDF Export Content-Disposition Filename Encoding

#### 1. Scope / Trigger

* Trigger: Any backend endpoint returning downloadable files with `Content-Disposition`, especially PDF export endpoints that use user-controlled resume titles.

#### 2. Signatures

* Internal builder: `ExportController.buildPdfResponse(byte[] pdfBytes, String title)`.
* Response header: `Content-Disposition: attachment; filename="<ascii-fallback>"; filename*=UTF-8''<percent-encoded-utf8>`.

#### 3. Contracts

* `filename` must contain only header-safe ASCII characters. Do not place Chinese or other Unicode characters directly in this parameter.
* `filename*` must carry the UTF-8 percent-encoded real filename, including the `.pdf` extension.
* If the ASCII fallback becomes blank after sanitization, use `resume.pdf`.
* Shared/public export flows must use the same response builder so header behavior stays consistent.

#### 4. Validation & Error Matrix

* Unicode title such as `????` -> `filename="resume.pdf"` and `filename*=UTF-8''%E6%88%91%E7%9A%84%E7%AE%80%E5%8E%86.pdf`.
* ASCII title such as `Resume 2026` -> `filename="Resume 2026.pdf"` and `filename*=UTF-8''Resume%202026.pdf`.
* Blank/null/unsafe-only title -> `filename="resume.pdf"`.

#### 5. Good/Base/Bad Cases

* Good: build both `filename` and `filename*`, with ASCII fallback and UTF-8 encoded real filename.
* Base: plain ASCII titles keep a readable ASCII fallback.
* Bad: `filename="????.pdf"`; Tomcat rejects the response header because it cannot encode Unicode outside the permitted header byte range.

#### 6. Tests Required

* Unit test `ExportController.buildPdfResponse(...)` with a Unicode title and assert the exact `Content-Disposition` header.
* Unit test with an ASCII title and assert the readable fallback remains intact.
* Export route tests may reuse the shared builder contract instead of duplicating header assembly assertions.

#### 7. Wrong vs Correct

##### Wrong

```java
headers.set(HttpHeaders.CONTENT_DISPOSITION,
    "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
```

##### Correct

```java
headers.set(HttpHeaders.CONTENT_DISPOSITION,
    "attachment; filename=\"" + asciiFilename + "\"; filename*=UTF-8''" + encodedFilename);
```
