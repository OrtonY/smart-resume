# Research: BOSS Zhipin extraction and apply behavior

- Query: Practical constraints for extracting job information from BOSS Zhipin pages and whether the extension should auto-click apply/deliver buttons.
- Scope: mixed
- Date: 2026-06-04

## Findings

### Files found

- `.trellis/tasks/06-04-boss-browser-extension/prd.md` - Current task PRD; defines the MVP as a BOSS Zhipin browser extension that extracts company, position, job description, and page URL, lets the user choose a Smart Resume resume, creates a Smart Resume application record, and can generate a cover letter linked to that record.
- `frontend/src/features/application/api/applicationApi.ts` - Existing frontend API wrapper for listing, creating, updating, and deleting Smart Resume job application records.
- `frontend/src/features/application/types.ts` - Frontend application DTOs; create payload accepts company, position, status, channel, resumeId, appliedAt, and notes.
- `frontend/src/features/resume/api/resumeApi.ts` - Existing frontend API wrapper for listing resumes.
- `frontend/src/features/ai/api/aiApi.ts` - Existing frontend API wrapper for AI cover-letter generation.
- `frontend/src/lib/http/apiClient.ts` - Shared authenticated JSON request helper using `X-Access-Token`.
- `frontend/src/lib/auth/tokenStorage.ts` - Main-site token storage key and change event convention.
- `backend/src/main/java/com/smartresume/application/controller/JobApplicationController.java` - Backend application CRUD controller.
- `backend/src/main/java/com/smartresume/application/dto/JobApplicationDtos.java` - Backend request/response DTO validation for application records.
- `.trellis/spec/backend/ai-cover-letter.md` - Cross-layer contract for persisted cover-letter generation and optional `applicationId` linkage.
- `.trellis/spec/frontend/index.md` - Frontend stack and feature organization guidelines.
- `.trellis/spec/frontend/quality-guidelines.md` - Frontend quality requirements, including i18n, mobile usability, and centralized repeated constants.

### Code patterns

- Smart Resume already exposes the MVP application write API from the frontend: `createApplication(payload)` posts to `/api/applications` with JSON body in `frontend/src/features/application/api/applicationApi.ts:24`.
- Application creation payload requires `company`, `position`, and `status`, with `channel`, `resumeId`, `appliedAt`, and `notes` optional in `frontend/src/features/application/types.ts:32`.
- Backend request validation mirrors that minimal contract: `company`, `position`, and `status` are `@NotBlank`; `channel`, `resumeId`, `appliedAt`, and `notes` are nullable in `backend/src/main/java/com/smartresume/application/dto/JobApplicationDtos.java:12`.
- The backend application controller maps create through `@PostMapping` in `backend/src/main/java/com/smartresume/application/controller/JobApplicationController.java:41`.
- Resume selection can reuse the existing shape: `listResumes(includeDeleted, page, pageSize)` calls `/api/resumes` in `frontend/src/features/resume/api/resumeApi.ts:14`.
- Cover-letter generation can reuse `generateAiCoverLetter(resumeId, payload)`, which posts to `/api/ai/resumes/{resumeId}/cover-letters` in `frontend/src/features/ai/api/aiApi.ts:71`.
- The cover-letter spec explicitly supports optional `applicationId`, and when present it must belong to the current user and match the resume if the application is already bound in `.trellis/spec/backend/ai-cover-letter.md:39`.
- Authenticated frontend requests currently attach `X-Access-Token` from `getAccessToken()` in `frontend/src/lib/http/apiClient.ts:25`; the AI wrapper has the same header behavior in `frontend/src/features/ai/api/aiApi.ts:192`.
- Main-site token storage uses localStorage key `smart-resume-access-token` in `frontend/src/lib/auth/tokenStorage.ts:1`; a browser extension will not be able to read the Smart Resume origin's localStorage from a BOSS page, so token transfer/login must be designed explicitly instead of assuming reuse.

### BOSS Zhipin extraction constraints

- BOSS job detail pages should be treated as an unstable, third-party DOM surface. The extension can read visible DOM through a content script, but selectors/classes can change without notice and may differ by login state, A/B tests, city, job availability, anti-bot state, or mobile/desktop layout.
- A direct BOSS job detail URL tested during this research redirected to a security verification page (`/web/passport/zp/security.html?...callbackUrl=/job_detail/...`), showing that unauthenticated or automated-looking access can trigger a slider/security flow before the job DOM is available. External reference: `https://www.zhipin.com/job_detail/066e8b8427b9473703Nz2tu8ElJS.html`.
- MVP extraction should therefore be best-effort and user-confirmed:
  - Extract from visible text and known selectors when available.
  - Store the source URL.
  - Show company, position, and job description in editable fields before any Smart Resume API call.
  - Treat missing or suspicious extraction as a normal state, not an error.
  - Prefer semantic fallbacks such as `document.title`, headings, visible JD containers, and URL over brittle single-selector logic.
- Do not fetch BOSS pages from a background service or backend crawler for MVP. That increases anti-automation exposure and loses the user's current authenticated/visible browser context.

### Auto-click apply / deliver constraint

- BOSS's published user agreement restricts third-party tools and non-normal browsing/data acquisition. Relevant official page: `https://www.zhipin.com/web/common/protocol/protocol-2019-09-30.html`.
  - The agreement states users should use BOSS services through BOSS software and should not use unpermitted third-party tools for actions such as logging in, browsing jobs, sending/receiving resumes, etc. See lines 52 and 94.
  - It also describes illegal acquisition as including spider/crawler/simulated-human programs or abnormal browsing methods to read/copy/store platform information. See line 97.
- Auto-clicking a real BOSS apply/deliver/open-chat button would likely look like third-party automation of a platform workflow. It also has product risk: the extension may submit an unintended application, duplicate a submission, use the wrong BOSS resume, or trigger anti-abuse controls.
- MVP recommendation: do not auto-click BOSS site apply/deliver buttons. Define "apply" in this task as "create/update a Smart Resume application record" unless the user later makes a separate, explicit compliance decision.
- If a later phase explores real BOSS submission, gate it behind an explicit opt-in, per-action confirmation, clear copy that the action happens on BOSS, no bypass of captchas/security prompts, and no background/bulk operation. Even then, legal/platform review is recommended before implementation.

### User-consent UX

- The extension should use an explicit review-and-confirm step before sending data to Smart Resume:
  - Show source site (`BOSS Zhipin`) and source URL.
  - Show extracted company, position, and JD fields as editable.
  - Require resume selection before enabling Smart Resume write/generation actions.
  - Label the first write action as "Save to Smart Resume" or "Add application record" rather than "Apply" if no BOSS site submission happens.
  - For cover letters, make the sequence visible: create/reuse Smart Resume application record, then generate cover letter linked to it.
- Chrome extension policy references support this stance:
  - Content scripts can read and modify page DOM and message the extension, but they run in isolated worlds and must handle untrusted page data carefully: `https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts`.
  - Use the narrowest permissions necessary; `activeTab` gives temporary access through user gesture: `https://developer.chrome.com/docs/extensions/reference/permissions-list`.
  - Chrome Web Store policies require transparent user-data handling and affirmative informed consent when user data collection/use is not obvious from the product UI: `https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements`.
  - If the extension handles user data, Chrome Web Store requires an accurate privacy policy disclosing collection, use, and sharing: `https://developer.chrome.com/docs/webstore/program-policies/privacy`.

### MVP recommendation

- Implement a manual-confirmed Smart Resume ingestion extension, not a BOSS automation bot.
- Scope the content script to BOSS job detail URLs and only extract visible data from the active tab after user action.
- Use a resilient extraction adapter that returns `{ company, position, jobDescription, url, confidence/warnings }`.
- Always render an editable fallback form.
- Save `channel = "BOSS Zhipin"` and put source URL/JD summary in `notes` unless backend fields are later extended for `sourceUrl` and `jobDescription`.
- For "generate cover letter", first create or reuse the Smart Resume application record, then call `generateAiCoverLetter(resumeId, { applicationId, company, position, jobDescription, outputLanguage })`.
- Avoid any MVP behavior that clicks BOSS apply/deliver/chat buttons, bypasses verification, repeatedly scans pages, or operates without a visible user confirmation.

### Related specs

- `.trellis/spec/frontend/index.md` - Frontend is TypeScript + Ant Design and should stay feature-organized.
- `.trellis/spec/frontend/quality-guidelines.md` - New user-facing extension UI text should follow i18n if implemented inside the existing frontend stack; mobile-width usability still applies if the extension panel is narrow.
- `.trellis/spec/backend/ai-cover-letter.md` - Cover-letter generation must keep backend-owned resume lookup and optional `applicationId` validation.

## Caveats / Not Found

- No existing browser extension code, manifest, BOSS extractor, or extension build target was found under `frontend/src` during file inspection.
- Local `rg` execution failed with "Access is denied"; PowerShell file listing/reads were used instead.
- The local semantic code search tool timed out; findings rely on direct file inspection and the PRD's listed target files.
- BOSS's current agreement page at `https://about.zhipin.com/agreement/?id=registerprotocol` was not readable through the browser tool, so the accessible official 2019 agreement page and current BOSS agreement search results were used for platform-risk assessment.
- The tested BOSS job URL redirected to a security verification page, so this research did not capture stable live DOM selectors from an authenticated normal browser session. Selector design should be validated manually in a real logged-in browser before implementation.
