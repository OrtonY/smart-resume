# Type Safety

> Type safety patterns in this project.

---

## Overview

TypeScript should be used as a product design tool, not only as editor autocomplete.

The frontend will handle deeply nested resume data, dynamic sections, and AI-generated suggestions. That makes runtime validation and strict type ownership important from the beginning.

---

## Type Organization

* Keep feature-specific request and view model types inside the owning feature.
* Promote a type to `src/types/` only when multiple features depend on it.
* Keep API response types separate from UI state types when the UI needs richer derived fields.
* Prefer discriminated unions for section variants or workflow states.

The backend contract should be the source of truth for cross-layer DTO naming.

---

## Validation

Runtime validation tooling is still to be finalized, but the frontend must not trust AI-generated or backend-provided data blindly.

Initial direction:

* Use a schema-based validator for network boundaries and AI output normalization.
* Validate imported resume payloads before putting them into editable state.
* Keep Ant Design form rules for field-level UX, but do not treat them as sufficient domain validation.

Recommended MVP option to confirm later: `zod`

---

## Common Patterns

* Use explicit DTO types for API calls instead of `Record<string, unknown>`.
* Use `as const` only when it improves literal inference and does not hide a modeling problem.
* Prefer helper functions that transform backend models into UI view models over mutating objects inline.
* Model async request state explicitly when a flow has loading, success, and failure branches.

AI suggestion lists and resume section collections should favor typed mappers over ad hoc object reshaping in JSX.

---

## Forbidden Patterns

* `any` in feature code unless there is a temporary migration note.
* Double assertions like `value as unknown as X`.
* Untyped API helper return values.
* Passing partially validated AI output straight into form state.

---

## Scenario: Dynamic Resume Template Catalog

### 1. Scope / Trigger
- Trigger: resume templates are now loaded across layers through an API-first catalog with frontend manifest fallback.
- Why this needs code-spec depth: the same template metadata drives picker cards, preview theming, and persisted `templateKey` resolution.

### 2. Signatures
- Frontend loader: `loadResumeTemplateCatalog(): Promise<ResumeTemplateDefinition[]>`
- Frontend management loader: `listManagedResumeTemplates(): Promise<ManagedResumeTemplateDefinition[]>`
- Frontend mutations:
  - `createResumeTemplate(payload: ResumeTemplateCreatePayload): Promise<ManagedResumeTemplateDefinition>`
  - `updateResumeTemplate(templateKey: string, payload: ResumeTemplateUpdatePayload): Promise<ManagedResumeTemplateDefinition>`
  - `deleteResumeTemplate(templateKey: string): Promise<void>`
  - `restoreBuiltInTemplatesFromBackup(): Promise<ManagedResumeTemplateDefinition[]>`
- Frontend hook: `useResumeTemplateCatalog(): { templates: ResumeTemplateDefinition[]; loading: boolean; error: Error | null }`
- Backend APIs:
  - public read: `GET /api/public/templates`
  - authenticated management: `GET /api/templates`
  - authenticated mutations: `POST /api/templates`, `PUT /api/templates/{templateKey}`, `DELETE /api/templates/{templateKey}`, `POST /api/templates/restore-from-backup`

### 3. Contracts
- Public catalog request: no body, unauthenticated, read-only.
- Management catalog request: authenticated; same catalog shape plus management metadata.
- Response item fields:
  - `key: string`
  - `name: string`
  - `summary: string`
  - `category: string`
  - `layout: 'classic' | 'two-column' | 'minimal' | 'editorial'`
  - `theme: { pageBackground, borderColor, mutedText, accent, accentSoft, accentText, heroBackground, heroText, heroMuted, railBackground, panelBackground }`
  - `preview: { canvasBackground, sheetBackground, heroBackground, asideBackground, lineColor }`
- Management-only response fields:
  - `builtIn: boolean`
  - `updatedAt: string | null`
- Management mutation payloads:
  - create adds `key`
  - update reuses the same metadata fields except `key`
- Frontend persistence contract:
  - resumes continue storing only `templateKey`
  - renderer resolves `templateKey` against the loaded catalog at runtime
  - template management UI may keep richer draft state, but network boundaries must normalize unknown payloads before entering edit state

### 4. Validation & Error Matrix
- Unknown `layout` -> reject the template item during normalization
- Missing required string field -> reject the template item during normalization
- Public `GET /api/public/templates` unavailable -> fall back to frontend `/templates/catalog.json`
- Backend and manifest both unavailable or invalid -> fall back to in-bundle `FALLBACK_RESUME_TEMPLATE_CATALOG`
- Management list payload missing `builtIn` / malformed `updatedAt` -> reject the item and fail the management refresh instead of silently entering edit mode
- Create mode template key blank after normalization -> reject save on the frontend before issuing the request

### 5. Good/Base/Bad Cases
- Good: backend returns a fully valid catalog entry for an existing layout family; picker and preview render without code changes.
- Base: public backend is unavailable, local manifest is valid; user can still select and preview templates.
- Bad: a template item is partially generated by AI and omits required theme tokens; the item must be discarded rather than entering editable UI state.
- Bad: management UI trusts a malformed authenticated payload and lets it become the live editor draft; this must fail fast instead.

### 6. Tests Required
- Frontend build/lint must pass after adding new catalog fields or layouts.
- API adapter assertions:
  - invalid catalog items do not reach UI state
  - fallback order remains API -> manifest -> bundled default
  - management endpoints reject malformed items instead of producing partial editor state
- Cross-layer assertion:
  - a persisted `templateKey` still resolves to a usable preview after catalog loading

### 7. Wrong vs Correct
#### Wrong
- Trust `/api/public/templates` or `/api/templates` as typed catalog items without checking field presence, layout membership, or management metadata.
- Scatter template color/layout constants through multiple components.

#### Correct
- Normalize unknown payloads at the API boundary before exposing them to hooks/components.
- Keep template metadata centralized in the catalog and pass layout-specific rendering through shared resolver helpers.

## Scenario: Resume Editor Layout Persistence

### 1. Scope / Trigger
- Trigger: resume editor module order and hidden-state are persisted across frontend state, backend DTOs, and database snapshots.
- Why this needs code-spec depth: treating layout as browser-local UI state causes reload/share/snapshot drift from the canonical resume model.

### 2. Signatures
- Frontend type:
  - `ResumeLayout = { sectionOrder: ResumeSectionKey[]; hiddenSections: ResumeSectionKey[] }`
  - `ResumeDetail.layout: ResumeLayout`
  - `normalizeResumeLayout(layout?): ResumeLayout`
- Frontend mutation:
  - `updateResume(resumeId, { title, templateKey, content, layout })`
- Backend DTOs:
  - `ResumeDetailResponse(..., ResumeContentPayload content, ResumeLayoutPayload layout, ...)`
  - `ResumeUpdateRequest(String title, String templateKey, ResumeContentPayload content, ResumeLayoutPayload layout)`
  - `ResumeLayoutPayload(List<String> sectionOrder, List<String> hiddenSections)`
- Database:
  - `resumes.layout_json text not null`
  - `resume_versions.layout_json text not null`

### 3. Contracts
- `layout.sectionOrder`:
  - ordered list of fixed section keys
  - allowed values: `summary`, `workExperience`, `projectExperience`, `education`, `skills`, `honors`, `certificates`
  - duplicates and unknown values must be normalized away
- `layout.hiddenSections`:
  - subset of the same allowed keys
  - order is not semantically important, but duplicates must be removed
- Backend response contract:
  - every resume detail payload must include a non-null `layout`
  - snapshot/public-share resume detail must include the persisted layout from `resume_versions.layout_json`
- Frontend editor contract:
  - module reorder/hide/show mutates `draft.layout`
  - autosave signature must include `layout`
  - preview should default to `resume.layout` when explicit overrides are not provided

### 4. Validation & Error Matrix
- Missing `layout` in update request -> reject with validation error
- Unknown/duplicated section keys from storage or API -> normalize to canonical fixed-section order
- Hidden section not present in normalized `sectionOrder` -> drop it during normalization
- Legacy resume row with null `layout_json` -> backend must return default layout instead of null

### 5. Good/Base/Bad Cases
- Good: user hides `skills`, moves `education` above `projects`, reloads the editor, and sees the same structure.
- Base: old resumes created before layout persistence still load with the default fixed-section order and no hidden sections.
- Bad: layout is only written to `localStorage`; another browser tab, share view, or snapshot sees a different resume structure.

### 6. Tests Required
- Frontend:
  - lint/build must pass after `ResumeDetail` and `updateResume` contract expansion
  - preview must compile for both live editor data and fallback/demo resume data with `layout`
- Backend:
  - app/test compile must pass after DTO/entity/migration changes
  - resume detail retrieval should return default layout when persisted value is missing or malformed
  - snapshot creation should carry `layout_json` into `resume_versions`
- Cross-layer assertion:
  - UI reorder/hide state survives `updateResume` -> database -> `getResume` round-trip

### 7. Wrong vs Correct
#### Wrong
- Store editor module order/hidden state as browser-only preferences while title/content/template save to the backend.
- Let preview invent its own default ordering independently of the canonical resume payload.

#### Correct
- Persist editor layout as part of the resume contract and include it in snapshots/public reads.
- Normalize layout at both API boundary and UI boundary so old or partial data still renders safely.

## Scenario: Resume Version Timeline And Restore

### 1. Scope / Trigger
- Trigger: resume snapshots are exposed through authenticated list/detail/create/restore APIs and consumed by a typed timeline UI.
- Why this needs code-spec depth: the restore action mutates the current resume contract across backend storage, API DTOs, frontend state, and autosave signatures.

### 2. Signatures
- Frontend API:
  - `createResumeSnapshot(resumeId: string): Promise<ResumeVersionSummary>`
  - `listResumeVersions(resumeId: string): Promise<ResumeVersionSummary[]>`
  - `getResumeVersion(resumeId: string, versionId: string): Promise<ResumeVersionDetail>`
  - `restoreResumeFromVersion(resumeId: string, versionId: string): Promise<ResumeDetail>`
- Frontend types:
  - `ResumeVersionSummary = { id, resumeId, versionNumber, title, templateKey, createdAt }`
  - `ResumeVersionDetail = { id, resumeId, versionNumber, createdAt, snapshot }`
- Backend APIs:
  - `POST /api/resumes/{resumeId}/versions`
  - `GET /api/resumes/{resumeId}/versions`
  - `GET /api/resumes/{resumeId}/versions/{versionId}`
  - `POST /api/resumes/{resumeId}/versions/{versionId}/restore`

### 3. Contracts
- Version list/detail/restore are authenticated and must verify both `resume_id` and `user_id`.
- Version summaries are ordered newest first by `versionNumber` and `createdAt`.
- Version detail returns a `snapshot` using the same `ResumeDetail` shape as the live editor, including normalized `layout` and resolved template metadata.
- Restore overwrites the current resume's `title`, `templateKey`, `layout`, section content, and `updatedAt`; it must not create a copy or change the resume id.
- Frontend restore must apply the returned `ResumeDetail` through the same normalization path as initial editor loading so `lastSavedSignature` matches the persisted state.

### 4. Validation & Error Matrix
- `resumeId` not owned by current user -> 404.
- `versionId` not owned by current user -> 404.
- `versionId` belongs to another resume -> 404.
- Restore against a deleted resume -> conflict via active-resume check.
- Missing or malformed snapshot layout JSON -> normalize to the default layout.
- Snapshot content JSON cannot be parsed -> backend returns content parse error.

### 5. Good/Base/Bad Cases
- Good: user creates a snapshot, edits the current resume, opens the timeline, reviews section-level diff, confirms restore, and the same resume id now contains the snapshot content.
- Base: snapshot layout is legacy or partial; the editor still opens with canonical section order and hidden-section normalization.
- Bad: restore calls a copy endpoint and creates a second resume, leaving the current editor state and resume list out of sync.

### 6. Tests Required
- Frontend build/type-check must pass after adding or changing version DTO fields.
- Backend test/compile must pass after adding version controller/service methods.
- API assertions should cover ownership filtering, resume/version mismatch, and deleted-resume restore rejection.
- UI assertions should cover mobile width, fixed desktop modal height, and internal scrolling for timeline/diff panes.

### 7. Wrong vs Correct
#### Wrong
- Treat restore as `copyFromVersion` and return a new resume id while the UI says it restored the current resume.
- Apply snapshot content locally without syncing the backend, then rely on autosave to eventually persist it.

#### Correct
- Call `restoreResumeFromVersion`, persist the restore in the backend transaction, and replace editor state with the returned current `ResumeDetail`.

## Scenario: Public Share Password Gate Preflight

### 1. Scope / Trigger
- Trigger: public resume shares can now be either open or password-protected, and the share page must decide which UI to render before attempting the main resume fetch.
- Why this needs code-spec depth: the share page now depends on a dedicated preflight API plus token-aware fallback behavior across backend service rules, frontend API types, and route-level UI state.

### 2. Signatures
- Frontend API:
  - `getPublicShareAccess(shareCode: string): Promise<PublicShareAccessInfo>`
  - `getPublicShare(shareCode: string, shareToken?: string): Promise<ResumeDetail>`
  - `verifySharePassword(shareCode: string, password: string): Promise<{ token: string }>`
- Frontend types:
  - `PublicShareAccessInfo = { hasPassword: boolean }`
  - `PublicSharePageState = { status: 'loading' } | { status: 'password' } | { status: 'ready'; resume: ResumeDetail } | { status: 'error'; message: string }`
- Backend APIs:
  - `GET /api/public/shares/{shareCode}/access`
  - `GET /api/public/shares/{shareCode}`
  - `POST /api/public/shares/{shareCode}/verify`
- Backend DTO:
  - `PublicShareAccessInfoResponse(boolean hasPassword)`

### 3. Contracts
- Preflight response returns only whether the active share requires a password; it must not leak resume content or password metadata beyond `hasPassword`.
- Public share page flow:
  - call `/access` first
  - if `hasPassword=false`, fetch the resume directly
  - if `hasPassword=true` and no cached token exists, render the password form immediately
  - if `hasPassword=true` and a cached token exists, attempt the protected fetch before showing the form
- Cached share token storage remains session-scoped via `sessionStorage` key prefix `smart-resume-share-token:`.
- If a protected fetch fails due to password/token/auth problems, the frontend must clear the cached token and return to the password state instead of staying on an opaque error screen.
- The password form is part of the public-share route UI and must remain usable on mobile widths (`<=480px`) without horizontal overflow.

### 4. Validation & Error Matrix
- `shareCode` not found or inactive -> `/access` and `/shares/{shareCode}` fail through the existing not-found/error path.
- `hasPassword=true` with no cached token -> render password form without attempting resume content fetch.
- Cached token expired/invalid -> clear token, transition to `password`, let the user retry.
- Non-auth fetch failure during preflight or content load -> transition to `error` and surface message feedback.
- Mobile viewport around 375px -> password card must fit within the page padding and keep controls tappable.

### 5. Good/Base/Bad Cases
- Good: protected share opens on mobile with no cached token, shows the password form immediately, then loads the resume after successful verification.
- Base: open share returns `hasPassword=false`; the page goes straight from `loading` to `ready` with no password UI flash.
- Bad: the page tries to fetch the protected resume first, receives a password error, and only then reveals the password field after showing a generic failure message.
- Bad: an expired cached token leaves the user stuck on a 404/error screen until they manually clear browser storage.

### 6. Tests Required
- Frontend lint/build must pass after state-union or mobile-style changes to the share page.
- Backend test/compile must pass after adding the preflight DTO/controller/service method.
- API assertion:
  - protected share preflight returns `hasPassword=true`
  - open share preflight returns `hasPassword=false`
- UI/manual assertion:
  - protected share with no token renders the password form first
  - invalid cached token falls back to password form
  - password card remains usable on a 375px-wide viewport

### 7. Wrong vs Correct
#### Wrong
- Infer whether a share is protected by attempting the main content request first and parsing error-message text as the primary control flow.
- Keep using a fixed-width password card that can overflow or feel cramped on small screens.

#### Correct
- Use the dedicated `/api/public/shares/{shareCode}/access` preflight contract to decide the initial UI state, then fall back cleanly when cached credentials expire.
- Keep the password gate in an explicit union state and give it its own responsive mobile layout rules.

## Scenario: Snapshot Share Invalid State

### 1. Scope / Trigger
- Trigger: snapshot deletion must invalidate associated snapshot share links without treating them as ordinary user-disabled links.
- Why this needs code-spec depth: the state crosses database storage, backend DTOs, public share access behavior, authenticated share management, and frontend UI tags/actions.

### 2. Signatures
- Backend constant: `ResumeShareEntity.INVALID_TARGET_VERSION_ID = "invalid"`
- Database column: `resume_share_links.target_version_id varchar(64) null` with no foreign key constraint
- Authenticated share DTO: `ShareLinkResponse(..., String targetVersionId, boolean invalid, boolean hasPassword, boolean active, ...)`
- Snapshot timeline DTO: `ResumeSnapshotShareLinkResponse(String title, String shareCode, String sharePath, boolean active, boolean invalid, LocalDateTime createdAt)`
- Frontend types:
  - `ShareLink.invalid: boolean`
  - `ResumeSnapshotShareLink.invalid: boolean`
- Delete snapshot API: `DELETE /api/resumes/{resumeId}/versions/{versionId}`
- Toggle share API: `PUT /api/resumes/{resumeId}/shares/{shareCode}/toggle`

### 3. Contracts
- Deleting a snapshot soft-deletes the `resume_versions` row and updates associated `resume_share_links` rows:
  - `target_version_id = "invalid"`
  - `active = false`
  - `updated_at = now`
- `resume_share_links.target_version_id` must not have a database foreign key to `resume_versions(id)` because it intentionally stores the `invalid` sentinel after snapshot deletion.
- `active=false` means the owner manually disabled the link and it can be enabled again.
- `invalid=true` means the snapshot target no longer exists and the link cannot be enabled again.
- Frontend share management must display an invalid tag separately from the disabled tag and disable the enable action for invalid links.
- Public snapshot share access for an invalid target must fail instead of attempting to load version id `invalid`.

### 4. Validation & Error Matrix
- Toggle inactive valid share -> active becomes `true`.
- Toggle active valid share -> active becomes `false`.
- Toggle inactive invalid snapshot share -> `409 Conflict` with `error.share.snapshotInvalid`.
- Public access/export for invalid snapshot share -> not-found style error with `error.share.snapshotInvalid`.
- Latest-mode shares never become invalid through snapshot deletion because they do not target a version id.

### 5. Good/Base/Bad Cases
- Good: owner deletes a snapshot, then sees its associated share links marked invalid; the enable button is disabled.
- Base: owner disables a live share link manually; it shows disabled and can be re-enabled later.
- Bad: deleting a snapshot only sets `active=false`, causing the UI to show a normal disabled link that appears re-enableable.
- Bad: frontend infers invalidity by comparing `targetVersionId === "invalid"` instead of consuming the typed `invalid` DTO field.
- Bad: keeping a database foreign key on `target_version_id`, which rejects the `invalid` sentinel during snapshot deletion.

### 6. Tests Required
- Backend unit test: deleting a snapshot writes `targetVersionId="invalid"`, `active=false`, and `updatedAt` on associated shares.
- Migration/schema check: `resume_share_links.target_version_id` allows `invalid` by not enforcing a version-id foreign key.
- Backend unit test: toggling an inactive invalid snapshot share throws `error.share.snapshotInvalid`.
- Frontend build/type-check must pass after adding `invalid` to share DTO types.
- UI assertion: share list renders invalid separately from disabled and prevents the enable action.

### 7. Wrong vs Correct
#### Wrong
- Treat invalid snapshot shares as ordinary disabled shares and let the frontend show the enable button.

#### Correct
- Persist the invalid target sentinel, expose a typed `invalid` flag, and make the UI action state follow `invalid` before `active`.

## Scenario: Resume JSON Import And Export

### 1. Scope / Trigger
- Trigger: Resume JSON import/export moves structured resume data between the editor, template catalog import flow, backend import service, and persisted resume sections.
- This needs code-spec depth because the JSON shape intentionally differs from the full `ResumeDetail` contract.

### 2. Signatures
- Frontend export helper: `exportResumeJson(resume: Pick<ResumeDetail, 'title' | 'content' | 'layout'>): void`
- Frontend filename helper: `createExportFilename(title: string, extension: 'pdf' | 'docx' | 'json'): string`
- Frontend import constants: `RESUME_IMPORT_ACCEPT` includes `.json`; `RESUME_IMPORT_ALLOWED_EXTENSIONS` includes `json`.
- Backend import endpoint remains the unified template catalog entry: `POST /api/resumes/import` with uploaded file plus selected `templateKey`.
- Backend service branch: `.json` files are parsed by `ResumeImportService` without AI parsing and create the resume through `ResumeService.createResumeFromContent(title, templateKey, content)`.

### 3. Contracts
- Exported JSON is lightweight business data only: `title`, `personalInfo`, and visible section content.
- Exported JSON must not include `schemaVersion`, server ids, timestamps, `templateKey`, template metadata, hidden-section metadata, or full layout metadata.
- Hidden editor sections are omitted from export.
- JSON import uses the template selected in the template catalog flow; any template identity inside the file is ignored because it is out of scope.
- Missing JSON modules are imported as empty strings or empty arrays and remain visible under the default resume layout.
- JSON import must not derive hidden sections from absent modules.

### 4. Validation & Error Matrix
- Uploaded file extension is not `pdf`, `docx`, `txt`, or `json` -> localized unsupported-file error.
- JSON root is not an object or cannot be parsed -> `error.resume.importInvalidJson`.
- JSON section field is absent or not an array -> imported as an empty list.
- JSON personal info is absent or not an object -> imported with default empty personal info.
- PDF/DOCX/TXT imports keep the existing text extraction plus AI parsing path.

### 5. Good/Base/Bad Cases
- Good: A resume with hidden `skills` exports no `skills` field; importing the JSON with another selected template creates a new resume where `skills` is visible and empty.
- Base: A JSON file with only `title` and `personalInfo` imports successfully with all list sections empty.
- Bad: Exporting `templateKey` or `layout.hiddenSections` makes the JSON look like a full persisted resume snapshot, which this feature intentionally is not.
- Bad: Treating absent JSON modules as hidden sections loses the user's ability to fill those modules after import.

### 6. Tests Required
- Backend unit test: JSON import does not call AI parsing and creates a resume from normalized content.
- Backend unit test: invalid JSON root returns `error.resume.importInvalidJson`.
- Backend assertion: missing sections are empty content, not hidden layout metadata.
- Frontend build/type-check must pass after adding JSON export menu actions and import extension constants.
- Lint should pass for changed files; unrelated existing lint failures must be reported separately.

### 7. Wrong vs Correct
#### Wrong
- Export `layout.hiddenSections` or derive `hiddenSections` during import from fields missing in the JSON file.

#### Correct
- Export only visible business content and let JSON import create the new resume with the selected template's default visible layout.
