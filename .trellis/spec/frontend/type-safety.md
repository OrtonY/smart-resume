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
