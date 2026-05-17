# State Management

> How state is managed in this project.

---

## Overview

This project is form-heavy and centered on a single-user resume editor, so state management should stay simple, explicit, and close to the feature that owns it.

The main state challenge in MVP is coordinating editor form state, template preview state, auto-save status, and server-synced resume data without introducing unnecessary global state.

---

## State Categories

* Local component state: transient UI interactions such as modal open state, tab selection, and inline editor controls.
* Feature state: resume section edit state, template selection, save status, and validation summaries inside the resume editor feature.
* Server state: resume lists, resume detail payloads, share records, export jobs or export metadata, and system password bootstrap state.
* URL state: active resume id, selected page or route, and public share token or share path.

---

## When to Use Global State

Promote state to a shared/global layer only when:

* multiple distant parts of the app need the same value at the same time
* the value must survive route changes
* the value represents app-wide bootstrap state, such as whether a password has been configured

Do not use global state for section form fields that belong to one editing screen.

---

## Server State

* Server state should be fetched and synchronized separately from local form editing state.
* The editor should load a canonical resume payload from the backend, then manage in-progress edits locally before auto-save sync.
* Auto-save should be debounced and should expose explicit UI states such as `saving`, `saved`, and `save_failed`.
* Share and export operations should not mutate local form state directly; they should work from persisted resume data or an explicit snapshot flow.

---

## Common Mistakes

* Mixing server payload objects directly into uncontrolled form mutations.
* Treating every keypress as a full save event without debounce or save-state feedback.
* Storing page-local editor state in a global store too early.
* Letting template preview state drift from the persisted resume content model.

## Scenario: Resume Grid Pagination and Thumbnail Entry

### 1. Scope / Trigger
- Trigger: the homepage now renders resume thumbnails in a fixed 6-slot horizontal grid, and the thumbnail itself is the editor entry point.

### 2. Signatures
- Homepage state:
  - active list pages through 6 items at a time
  - empty slots are rendered intentionally when fewer than 6 resumes exist on a page
- Resume card actions:
  - thumbnail click opens `/app/resumes/{resumeId}`
  - share dialog opens from the thumbnail card
- Recycle-bin state:
  - separate route consumes deleted-only resume data from the backend
  - reuse the same 6-slot thumbnail grid and pagination behavior as the homepage
  - the primary action on each card is restore, not edit

### 3. Contracts
- Page size is fixed at 6 for the homepage resume grid
- The grid must preserve a visible 6-column slot structure on desktop
- The editor affordance is the thumbnail itself; separate "open editor" buttons are not part of the primary card face
- Share and delete actions are secondary controls around the thumbnail, not the primary entry target

### 4. Validation & Error Matrix
- Fewer than 6 resumes on a page -> render empty slots instead of collapsing the grid
- More than 6 resumes -> paginate and advance on user action
- Deleted items must not leak into the active homepage grid

### 5. Good/Base/Bad Cases
- Good: five active resumes still occupy six stable slots, with one empty placeholder.
- Base: exactly six items render a complete row of preview cards.
- Bad: the homepage collapses to an auto-fit masonry grid, making visual density and paging unpredictable.

### 6. Tests Required
- Frontend build/lint for grid and card rendering changes.
- Route behavior for active list vs recycle bin vs editor entry.

### 7. Wrong vs Correct
#### Wrong
- Treat the homepage as a generic list and let the browser auto-pack cards.
#### Correct
- Fix the grid to six visible slots and make the thumbnail itself the primary navigation target.

## Scenario: Template Directory Preview Before Create

### 1. Scope / Trigger
- Trigger: users browse templates from the homepage template directory before creating a resume.

### 2. Signatures
- Template card click:
  - selects the template
  - updates the right-side preview
  - does not create a resume
- Create action:
  - available from the preview/action area after selection
  - calls resume creation only when the user explicitly clicks create
- Template management action:
  - available from the homepage template directory as catalog-level controls
  - does not create or apply a resume template by itself

### 3. Contracts
- The template directory without `resumeId` is a preview-first creation flow.
- The template directory with `resumeId` remains an apply-to-current-resume flow.
- Template card clicks only select the template and refresh preview/configuration state.
- Template management controls may create, update, or delete templates, but resume creation remains an explicit preview-side action.

### 4. Validation & Error Matrix
- Clicking multiple templates should only change preview state.
- A new resume is created only by the explicit create button.
- Creation failures should surface as a message without changing the selected preview.

## Scenario: Template Token Visual Editor

### 1. Scope / Trigger
- Trigger: theme/preview color tokens are edited via visual controls (`ColorPicker`, two-stop gradient editor) instead of raw text inputs on the template editor page.
- Why this needs spec depth: token classification must match the actual data shape stored in built-in templates, otherwise the editor silently degrades to a read-only fallback for the affected field.

### 2. Signatures
- Field metadata: `{ key, label, kind: 'color' | 'gradient' }` per `THEME_FIELDS` / `PREVIEW_FIELDS` in `TemplateGalleryPage.tsx`.
- Field components live under `features/resume/components/`:
  - `ColorField` — AntD `ColorPicker` wrapper, output via `color.toRgbString()`.
  - `GradientField` — two-stop linear-gradient editor (start color, end color, angle slider).
- Helpers in `features/resume/templateColorTokens.ts`:
  - `parseLinearGradient(value: string): { from: string; to: string; angleDeg: number } | null`
  - `stringifyLinearGradient(parts): string`

### 3. Contracts
- A field marked `kind: 'gradient'` must hold a 2-stop `linear-gradient(<deg>deg, <from>, <to>)` string in the canonical built-in templates. If any built-in stores it as a solid color, the field must be `kind: 'color'`.
- Color output is always `rgba(r, g, b, a)` (alpha=1 still emits `rgba(...,1)`) to keep one canonical format across persisted JSON.
- Gradient editor must NEVER auto-coerce a solid color into a fake 2-stop gradient. Unparseable input falls back to a read-only string display; the original value is preserved verbatim.
- Per-field reset (`↺`) restores the field to its currently-saved value (`selectedTemplate[group][key]`), not to a built-in default, and must isolate to one field — sibling unsaved edits in the same draft remain untouched.

### 4. Validation & Error Matrix
- Field declared `gradient` but built-in stores solid color → editor falls back to read-only Input → user cannot visually edit. Reclassify the field to `color`.
- `parseLinearGradient` returns null (non-linear-gradient, conic-gradient, CSS variable, multi-stop) → `GradientField` renders read-only fallback; do not overwrite the value.
- AntD ColorPicker fed an unparseable string → `ColorField` falls back to a writable plain `Input`; the original string round-trips unchanged until the user replaces it.
- Reset clicked but current value already equals saved value → reset button must be hidden (no-op affordance).

### 5. Good/Base/Bad Cases
- Good: editing `theme.heroBackground` (gradient) updates start color → `stringifyLinearGradient` recomposes → preview reflects new gradient instantly.
- Base: `pure-form.preview.heroBackground = '#eef2f7'` (solid stored in a `gradient`-kind field) renders read-only fallback; user can replace the entire string manually if they want a gradient.
- Bad: classifying `theme.accentSoft` as `gradient` when all built-ins store `rgba(...)` — every built-in template appears uneditable in the visual editor.

### 6. Tests Required
- Frontend lint + tsc + build green after schema-shape changes.
- Round-trip: every built-in template's gradient field values must satisfy `stringifyLinearGradient(parseLinearGradient(value)) === value` (modulo whitespace) for the 4 packaged templates.
- Manual sanity: each field's reset button only restores that one field; other unsaved edits in the same draft stay intact.

### 7. Wrong vs Correct
#### Wrong
- Classify a token as `gradient` purely by its semantic role (e.g. "panel backgrounds tend to be gradients") without grepping the actual values in `templateCatalog.ts` / `public/templates/catalog.json`.
- Coerce solid → 2-stop-same-color in `parseLinearGradient` to "make the editor work" — silently mutates persisted data.
- Mix hex / rgb / rgba freely in `ColorPicker` output; pick one canonical format and stick to it.

#### Correct
- Verify each field's actual stored shape across all built-in templates before assigning `kind`.
- Treat unparseable input as opaque: preserve verbatim, surface a read-only fallback, let the user explicitly overwrite.
- Force `rgba(...)` output for every color edit so the persisted JSON has one canonical shape.
