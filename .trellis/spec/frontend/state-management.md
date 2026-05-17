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

## Scenario: Resume Content Field Addition

### 1. Scope / Trigger
- Trigger: adding a new field to the resume content model (e.g. `PersonalInfo.age`, `PersonalInfo.headline`) that the user edits in the form and that appears in both the on-screen preview and the DOCX export.
- Why this needs spec depth: the field flows through three consumers (editor form, preview model, DOCX export) plus the backend DTO, and skipping any one of them produces silent visual drift between preview and export.

### 2. Signatures
- Frontend type: `frontend/src/features/resume/types.ts` — new field on the relevant interface (e.g. `PersonalInfo`), typed `string` to match sibling fields.
- Default seed: `createEmptyResumeContent()` in the same file — must include the new field with empty-string default.
- Editor form: `frontend/src/pages/WorkspacePage.tsx` SectionGrid — antd `Input` bound through `updateDraft`, placeholder mirrors existing fields (Chinese label).
- Preview model: `frontend/src/features/resume/components/ResumePreview.tsx` — when the field is rendered as a contact-line entry, push `{ label, value }` to the contact array via `createPreviewModel`.
- DOCX export: `frontend/src/features/resume/export/docxExport.ts` — same logic on the contact line.
- Backend DTO: `backend/src/main/java/com/smartresume/resume/dto/ResumeDtos.java` — add `String <field>` to the corresponding record. Update `ResumeService.defaultContent()` positional arg.

### 3. Contracts
- Field type is `string` on both sides (not `number`, `LocalDate`, etc.) for visual consistency with the rest of the form and to keep DTO/JSON shape uniform.
- Empty string represents "not filled"; nullable on the backend side via Jackson default.
- Validation/formatting happens at render time, not input time. The editor accepts any string; consumers (preview + DOCX) own the format/validation.
- Preview and DOCX must use the **same** formatter. If no shared utils module exists, an identical local copy in both files is acceptable but must be kept in lockstep.
- Backend record field order is positional. Adding a field ⇒ update every `new <Record>(...)` call site (e.g. `defaultContent()`).

### 4. Validation & Error Matrix
- Field missing from preview but present in editor → preview drifts from form; treat as a bug, not a feature.
- Field present in preview but missing in DOCX → export silently loses data. Always update both.
- Backend record updated but `defaultContent()` not updated → compile error (good, surface immediately).
- Old JSON in `content_json` lacks the new field → Spring Boot Jackson default (`FAIL_ON_UNKNOWN_PROPERTIES=false` and missing-field tolerance) deserializes the field as `null`. Verified by a unit test that round-trips legacy JSON.
- Render-time validation rejects input → entry is silently skipped (no inline error), consistent with every other personal-info field.

### 5. Good/Base/Bad Cases
- Good: `age` flows editor → preview → DOCX with one shared validation rule (`formatAge`). Legacy JSON without `age` opens as null.
- Base: only the rendered output changes; no migration script, no schema bump (`content_json` is opaque text).
- Bad: adding the field to `types.ts` and the editor only — preview/DOCX silently stay on the old shape; users see their input "vanish" on export.

### 6. Tests Required
- Frontend `tsc --noEmit` + lint green.
- Backend Jackson deserialization unit test:
  - legacy JSON (no new field) → record with that field `null`, other fields intact.
  - new JSON (with field) → field populated.
  - round-trip serialize → deserialize stable.
- Manual: edit the field → reload → value persists; export DOCX → value matches preview.

### 7. Wrong vs Correct
#### Wrong
- Type a numeric-looking field as `number` on the frontend just because it's a number — breaks visual parity with sibling string fields and forces InputNumber handling.
- Validate at input time (block bad input in the form) — diverges from the project-wide "accept anything, render-time validate" convention.
- Implement the formatter in `ResumePreview.tsx` only and reach for it from `docxExport.ts` via a quick import that creates a circular dependency. Prefer duplicating the small helper if no shared utils module exists yet.
- Skip the legacy-JSON deserialization test "because the field is just a string" — silent regressions in stored resumes are the most common failure here.

#### Correct
- Type as `string`, default `''`, validate at render time, fall back to skipping the entry on invalid input.
- Update all four touch points in one PR: types + editor + preview + DOCX (+ backend DTO + defaultContent).
- Add a Jackson round-trip test for the new field whenever a backend record gains a property.

## Scenario: Inline Markdown for Resume Description Fields

### 1. Scope / Trigger
- Trigger: a small markdown subset (`**bold**`, `*italic*`, `***bold-italic***`) is parsed inline for the 5 multi-line description fields and rendered consistently across Web preview, public share page, DOCX export, and PDF export.
- Why this needs spec depth: the same string passes through four consumers, and each consumer must use the same parser contract or the rendered output drifts (e.g. preview shows bold, DOCX shows literal `**...**`).

### 2. Signatures
- Whitelisted fields (only these parse markdown):
  - `personalSummary`
  - `education[].description`
  - `workExperience[].description`
  - `projectExperience[].description`
  - `honors[].description`
- Single-line fields (`fullName`, `headline`, `phone`, `email`, `city`, `website`, `expectedSalary`, `age`, `school`, `degree`, `major`, `company`, `role`, `name`, `title`, `issuer`, `awardedAt`, `credentialId`, etc.) MUST NOT parse markdown; they render verbatim.
- Parser entry: `parseInlineMarkdown(input: string): InlineNode[]` in `frontend/src/features/resume/markdown/parseInlineMarkdown.ts`.
- Inline node shape:
  ```ts
  type InlineNode =
    | { type: 'text'; text: string }
    | { type: 'bold'; children: InlineNode[] }
    | { type: 'italic'; children: InlineNode[] }
  ```
- Web rendering: `renderInlineMarkdown(text: string): ReactNode` near the top of `ResumePreview.tsx`. Outputs `<strong>` / `<em>` / text fragments.
- DOCX rendering: `inlineMarkdownToTextRuns(text, baseStyle, docx)` in `docxExport.ts`. Emits `docx.TextRun[]` with `bold` / `italics` flags propagated per leaf, preserving the surrounding base style (color, font).
- PDF rendering: inherits from the rendered Web preview DOM via `html2canvas` + `jspdf`. No PDF-specific parser is required.
- Editor component: `MarkdownTextArea` in `features/resume/components/MarkdownTextArea.tsx` wraps antd `Input.TextArea` and exposes a small floating B / I toolbar that wraps or unwraps the current selection with `**` / `*` (toggle behavior).

### 3. Contracts
- Storage stays as plain `string` with markdown tokens visible inline. No new DTO field, no migration. Backend `content_json` is opaque text.
- Parser disables HTML, links, images, code blocks, lists, headings. Encountering any of these node types flattens to plain text (formatting dropped, text content preserved).
- Empty input returns `[]`. Multi-paragraph input flattens to one inline-node array, paragraph breaks become `\n` text nodes.
- Nested `***xx***` recursively maps to `bold { italic { text } }` (or `italic { bold { text } }`, both acceptable as long as both styles are applied).
- All 4 consumers (Web preview, public share page, DOCX, PDF) MUST use the same parser; share page reuses `ResumePreview`, so it inherits Web behavior. PDF captures the rendered preview DOM, so it inherits Web behavior.
- XSS boundary: HTML pass-through is disabled in the parser, and React renders text nodes via `<Fragment>` (auto-escaped). No additional sanitization is needed.

### 4. Validation & Error Matrix
- Field listed in the whitelist but rendered without `renderInlineMarkdown` / `inlineMarkdownToTextRuns` in any consumer -> bold/italic vanishes silently in that consumer; treat as a bug.
- Single-line field accidentally piped through the parser -> user sees `**foo**` ambiguously rendered or stripped; restrict parser usage to the 5 whitelisted fields only.
- Legacy resumes with literal `**...**` or `*...*` in description fields -> these now render as bold / italic. PRD calls this out as expected behavior. Users wanting literal asterisks must use `\*` / `\*\*`.
- HTML / link / image / list / heading syntax in input -> parser flattens to plain text; never reaches the DOM as a tag, link, or list bullet.

### 5. Good/Base/Bad Cases
- Good: user wraps `销售额提升 30%` with `**...**` via the toolbar; preview, share page, DOCX, and PDF all render the segment in bold.
- Base: legacy description with no markdown tokens renders unchanged across all four consumers.
- Bad: a new description-style field is added but only Web rendering is wired; export drops the formatting silently.
- Bad: parser is wired to a single-line field (e.g. `fullName`); user sees `**张三**` parsed as bold and cannot type literal `**` without escaping.

### 6. Tests Required
- Parser unit tests cover: empty, plain text, single bold, single italic, nested bold-italic, escape preservation, HTML drop, link-target drop, list flatten, heading flatten, mixed-segment input.
- Frontend `tsc --noEmit` + lint + build green after parser, renderer, and component changes.
- Manual: edit the 5 whitelisted fields in the workspace, verify bold / italic appear in preview, DOCX export, and PDF export; verify single-line fields stay literal.

### 7. Wrong vs Correct
#### Wrong
- Add markdown parsing to a new description-style field without updating all four consumers; preview will diverge from export silently.
- Pass through HTML or sanitize separately. The parser already drops HTML, and React text nodes are auto-escaped — adding a second sanitizer creates a double-escape bug.
- Use a different parser library per consumer (e.g. micromark in Web, regex in DOCX). The output drifts as edge cases pile up.

#### Correct
- Whitelist the field in `parseInlineMarkdown` consumers in lockstep: ResumePreview render path, docxExport TextRun helper, and (transitively) the PDF capture path.
- Treat the parser as the single source of truth for inline formatting. New formatting (e.g. underline) requires a parser update, not per-consumer regex.
- Keep the storage type as `string`. Do not introduce a structured AST in backend DTOs.
