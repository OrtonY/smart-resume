# Research: MV3 extension architecture

- Query: Chrome/Edge Manifest V3 architecture for a BOSS Zhipin page helper that calls the Smart Resume backend.
- Scope: mixed
- Date: 2026-06-04

## Findings

### Files found

- `.trellis/tasks/06-04-boss-browser-extension/prd.md` - Current task requirements for the BOSS browser extension MVP.
- `.trellis/workflow.md` - Trellis workflow; research artifacts must be persisted under the active task directory.
- `.trellis/spec/backend/index.md` - Backend stack and REST-first modular-monolith baseline.
- `.trellis/spec/backend/auth-multi-user.md` - Current auth/token and per-user data isolation contract.
- `.trellis/spec/backend/ai-cover-letter.md` - Cover-letter API contract, including optional application linkage.
- `.trellis/spec/frontend/index.md` - Frontend stack and feature-oriented TypeScript baseline.
- `.trellis/spec/frontend/quality-guidelines.md` - Frontend conventions relevant if extension UI shares code style, especially i18n and stable constants.
- `backend/src/main/java/com/smartresume/system/controller/SystemAccessController.java` - Current login/session endpoints.
- `backend/src/main/java/com/smartresume/common/security/AuthTokenInterceptor.java` - Token header extraction.
- `backend/src/main/java/com/smartresume/common/config/WebMvcConfig.java` - API prefix, CORS, and auth interceptor exclusions.
- `backend/src/main/java/com/smartresume/application/controller/JobApplicationController.java` - Application CRUD REST endpoints.
- `backend/src/main/java/com/smartresume/application/dto/JobApplicationDtos.java` - Application create/update/response DTO fields.
- `backend/src/main/java/com/smartresume/application/service/JobApplicationService.java` - Application creation/list ownership behavior.
- `backend/src/main/java/com/smartresume/ai/controller/AiController.java` - AI cover-letter REST endpoints.
- `backend/src/main/java/com/smartresume/ai/dto/AiDtos.java` - Cover-letter request/response DTO fields.
- `backend/src/main/java/com/smartresume/ai/service/AiCoverLetterService.java` - Cover-letter generation ownership and application-link validation.
- `frontend/src/lib/http/apiClient.ts` - Shared frontend API wrapper and token header shape.
- `frontend/src/lib/auth/tokenStorage.ts` - Current web app localStorage token key.
- `frontend/src/features/resume/api/resumeApi.ts` - Existing resume list API shape.
- `frontend/src/features/application/api/applicationApi.ts` - Existing application API shape.
- `frontend/src/features/application/types.ts` - Frontend application payload/status types.
- `frontend/src/features/ai/api/aiApi.ts` - Existing AI cover-letter API wrapper.
- `frontend/src/features/ai/types.ts` - Frontend cover-letter request/response types.

No existing browser-extension package/directory was found in the inspected project root.

### Current Smart Resume API contracts

- Backend controllers are auto-prefixed with `/api` by `WebMvcConfig.configurePathMatch`, so controller `@RequestMapping("/system")`, `@RequestMapping("/applications")`, and `@RequestMapping("/ai")` resolve to `/api/system/*`, `/api/applications`, and `/api/ai/*` (`backend/src/main/java/com/smartresume/common/config/WebMvcConfig.java:54`).
- Current auth endpoints are `/api/system/login`, `/api/system/register`, and `/api/system/session`; the implementation does not use the `/api/access/*` path named in the auth spec (`backend/src/main/java/com/smartresume/system/controller/SystemAccessController.java:31`, `backend/src/main/java/com/smartresume/system/controller/SystemAccessController.java:36`, `backend/src/main/java/com/smartresume/system/controller/SystemAccessController.java:49`).
- Authenticated requests must send `X-Access-Token`; the interceptor reads that exact header and authenticates it (`backend/src/main/java/com/smartresume/common/security/AuthTokenInterceptor.java:12`, `backend/src/main/java/com/smartresume/common/security/AuthTokenInterceptor.java:25`).
- Backend CORS currently allows all origins, methods, and headers, exposes `X-Access-Token`, and does not use credentials (`backend/src/main/java/com/smartresume/common/config/WebMvcConfig.java:45`). This is compatible with extension `fetch` plus a header token for MVP.
- Frontend API clients mirror the same token behavior: `apiClient` injects `X-Access-Token` from `getAccessToken()` (`frontend/src/lib/http/apiClient.ts:25`), and `aiApi` repeats the same header in its local `requestJson` helper (`frontend/src/features/ai/api/aiApi.ts:192`).
- The web app token is stored under `smart-resume-access-token` in page `localStorage` (`frontend/src/lib/auth/tokenStorage.ts:1`). That storage belongs to the Smart Resume web origin, not the extension origin.
- Resume list exists as `GET /api/resumes?includeDeleted=false&page=...&pageSize=...` (`frontend/src/features/resume/api/resumeApi.ts:14`).
- Application creation exists as `POST /api/applications` (`backend/src/main/java/com/smartresume/application/controller/JobApplicationController.java:41`, `frontend/src/features/application/api/applicationApi.ts:24`).
- Application create payload requires `company`, `position`, and `status`; optional fields are `channel`, `resumeId`, `appliedAt`, and `notes` (`backend/src/main/java/com/smartresume/application/dto/JobApplicationDtos.java:12`, `frontend/src/features/application/types.ts:32`).
- Valid application statuses are `applied`, `interviewing`, `offered`, `rejected`, and `withdrawn`; create normalizes status and applies current time when `appliedAt` is absent (`backend/src/main/java/com/smartresume/application/service/JobApplicationService.java:31`, `backend/src/main/java/com/smartresume/application/service/JobApplicationService.java:86`).
- Cover-letter generation exists as `POST /api/ai/resumes/{resumeId}/cover-letters` (`backend/src/main/java/com/smartresume/ai/controller/AiController.java:117`, `frontend/src/features/ai/api/aiApi.ts:71`).
- Cover-letter generation accepts optional `applicationId`, required `company`, required `position`, optional `jobDescription`, optional `extraNotes`, and required `outputLanguage` (`backend/src/main/java/com/smartresume/ai/dto/AiDtos.java:98`, `frontend/src/features/ai/types.ts:114`).
- Cover-letter generation validates current-user resume ownership, selected application ownership, and resume/application compatibility (`backend/src/main/java/com/smartresume/ai/service/AiCoverLetterService.java:68`, `backend/src/main/java/com/smartresume/ai/service/AiCoverLetterService.java:166`).

### Recommended MV3 MVP architecture

Use three extension contexts with strict responsibilities:

- Content script: runs only on BOSS Zhipin job pages; extracts `company`, `position`, `jobDescription`, and page URL from the DOM; observes SPA navigation/DOM changes; returns extracted data to the popup. It should not call the Smart Resume backend.
- Popup: primary user UI; asks content script for current page data; lets the user edit extracted fields, select a resume, choose output language, and click "record application" or "generate cover letter".
- Service worker: owns backend API calls, token storage access, request retry/401 handling, and cross-origin `fetch` to Smart Resume. Popup sends commands such as `GET_SESSION`, `LIST_RESUMES`, `CREATE_APPLICATION`, and `GENERATE_COVER_LETTER`.

This split matches MV3 constraints: content scripts can read/modify the DOM but run in an isolated environment, message passing is the official coordination mechanism between content scripts, extension pages, and the service worker, and cross-origin API calls should be made from extension contexts with host permissions rather than from the content script.

Suggested MVP flow:

1. User opens a BOSS job detail page.
2. Static content script is injected on BOSS URL patterns and builds a normalized job snapshot.
3. User opens the extension popup.
4. Popup requests `GET_JOB_SNAPSHOT` from the active tab content script.
5. Popup requests `GET_SESSION` and `LIST_RESUMES` from service worker.
6. If unauthenticated, popup shows Smart Resume login form or a "connect backend" state.
7. On "record application", popup sends the edited job snapshot and selected `resumeId` to service worker.
8. Service worker calls `POST /api/applications` with `status: "applied"`, `channel: "BOSS Zhipin"`, selected `resumeId`, and a notes field containing source URL and optional JD summary.
9. On "generate cover letter", service worker first creates or reuses an application record, then calls `POST /api/ai/resumes/{resumeId}/cover-letters` with `applicationId`, `company`, `position`, `jobDescription`, optional `extraNotes`, and `outputLanguage`.

### Manifest / permissions sketch

Use static content script injection for MVP, because the extension only targets a known set of BOSS pages and does not need runtime `chrome.scripting.executeScript`.

```json
{
  "manifest_version": 3,
  "name": "Smart Resume BOSS Helper",
  "version": "0.1.0",
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.zhipin.com/*",
    "https://*.zhipin.com/*",
    "http://localhost:8080/*",
    "https://<smart-resume-host>/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://www.zhipin.com/job_detail/*",
        "https://www.zhipin.com/web/geek/job*"
      ],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Notes:

- `storage` is needed for extension-owned token/backend settings.
- `activeTab` is sufficient for popup-initiated interaction with the current tab in many MVP cases; add `tabs` only if implementation needs broader tab metadata/history beyond the active user gesture.
- `scripting` is only needed if the implementation switches from static `content_scripts` to dynamic injection.
- Keep BOSS match patterns narrow to avoid unnecessary install warnings. Confirm actual production BOSS URL patterns during implementation.
- Keep backend host permissions configurable for local (`http://localhost:8080/*`) and hosted environments.

### Token and CORS recommendation

Do not scrape the Smart Resume web app's `localStorage` token from another origin for MVP. The token currently lives under `smart-resume-access-token` in the Smart Resume page origin (`frontend/src/lib/auth/tokenStorage.ts:1`), while the extension has its own origin and BOSS pages have a different origin. Reusing that web storage would require extra host permissions/content scripts for the Smart Resume app and creates avoidable coupling.

Preferred MVP:

- Popup has a small login/connect form.
- Service worker calls `POST /api/system/login`.
- Store the returned access token in `chrome.storage.local` for persistence across browser restarts, or `chrome.storage.session` if the team accepts re-login after browser restart.
- Every service-worker backend call sends `X-Access-Token`.
- On HTTP 401, clear the stored token and return an auth-required error to popup, mirroring the web API clients (`frontend/src/lib/http/apiClient.ts:40`, `frontend/src/features/ai/api/aiApi.ts:182`).
- Store backend base URL separately in extension storage, defaulting to `http://localhost:8080` in development.

Current backend CORS accepts extension-origin requests with custom headers because `allowedHeaders("*")` and `allowedOriginPatterns("*")` are enabled (`backend/src/main/java/com/smartresume/common/config/WebMvcConfig.java:45`). For hosted production, consider tightening CORS, but extension IDs differ between dev/unpacked/store installs, so token-based auth plus host-permission narrowing is the practical MVP control.

### BOSS page extraction pattern

The BOSS page is a dynamic third-party SPA. Use a defensive extraction strategy:

- Read from semantic text blocks and likely stable page sections first.
- Use `MutationObserver` and URL-change detection because job details can change without full reload.
- Normalize whitespace and cap `jobDescription` length before sending to backend/AI.
- Always show extracted company/position/JD in editable fields before submission.
- Include source URL in `notes` for the application record because the current `job_applications` model has no first-class URL field (`backend/src/main/java/com/smartresume/application/domain/JobApplicationEntity.java:14`).
- Treat selector failures as a normal state: show manual fields rather than blocking.

### External references

- Chrome "Update the manifest": MV3 separates `host_permissions` from `permissions`, while content script match patterns remain under `content_scripts.matches`. https://developer.chrome.com/docs/extensions/develop/migrate/manifest
- Chrome "Declare permissions": `permissions`, `optional_permissions`, `content_scripts.matches`, `host_permissions`, and `optional_host_permissions` are distinct permission categories. https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Chrome "Manifest - content scripts": content scripts are injected by URL matches and run in an isolated execution environment by default. https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
- Chrome "Message passing": use message passing between service worker, extension pages, and content scripts. https://developer.chrome.com/docs/extensions/mv3/messaging
- Chrome "Migrate to a service worker": MV3 replaces background pages with service workers; persistent global state should move to storage. https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers
- Chrome `chrome.storage` API: prefer extension storage over web `localStorage`; service workers cannot use Web Storage. https://developer.chrome.com/docs/extensions/reference/api/storage
- Chromium "Changes to Cross-Origin Requests in Chrome Extension Content Scripts": content-script cross-origin requests use page-origin CORS; privileged cross-origin requests should be made from extension background/extension pages and relayed. https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/
- Microsoft Edge MV3 migration docs: Edge supports MV3 migration with Chromium extension concepts. https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/migrate-your-extension-from-manifest-v2-to-v3
- Microsoft Edge extension overview: Edge extension development is Chromium-compatible for common Chrome extension architecture. https://learn.microsoft.com/en-us/microsoft-edge/extensions/

### Related specs

- `.trellis/spec/backend/auth-multi-user.md` - token header, session behavior, and per-user ownership.
- `.trellis/spec/backend/ai-cover-letter.md` - cover-letter generation and optional application linkage.
- `.trellis/spec/backend/error-handling.md` - should be consulted when adding any backend support endpoint or changing error messages.
- `.trellis/spec/frontend/type-safety.md` - should be consulted if the extension is implemented as a TypeScript package.
- `.trellis/spec/frontend/quality-guidelines.md` - i18n and stable constants apply if extension UI is built with the same frontend conventions.

## Caveats / Not Found

- `rg` was unavailable in this environment with "Access is denied"; PowerShell file enumeration and `Select-String` were used instead.
- No existing extension source tree was found, so architecture recommendations assume a new package/directory.
- Actual BOSS Zhipin DOM selectors and final URL patterns were not verified against a live authenticated BOSS page. Implementation should treat selectors as brittle and keep manual correction in the popup.
- The backend application create path currently sets `resumeId` directly from the request and does not appear to validate that the selected resume belongs to the current user during application creation (`backend/src/main/java/com/smartresume/application/service/JobApplicationService.java:86`). Cover-letter generation later validates resume ownership and application compatibility, but the application creation endpoint itself may need hardening if the extension is exposed to untrusted input.
- The auth spec names `/api/access/*`, but the current code uses `/api/system/*`; implementation should follow code unless the API is intentionally renamed.
- MV3 service workers are event-driven and can be stopped between events; do not rely on in-memory token/session/global state.
