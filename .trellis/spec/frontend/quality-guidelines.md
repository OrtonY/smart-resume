# Quality Guidelines

> Code quality standards for frontend development.

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

### Don't: Duplicate Stable Magic Values In UI Code

**Problem**:

```tsx
// Don't do this
<ResponsiveModal width={720} />
autoSize={{ minRows: 3, maxRows: 8 }}
return target.scrollHeight - target.scrollTop - target.clientHeight <= 64
params.set('pageSize', String(query.pageSize ?? 6))
```

**Why it's bad**: Stable UI thresholds, validation bounds, pagination defaults, and sizing rules drift quickly when copied across components and helpers. This makes behavior inconsistent and increases the chance that frontend and backend contracts diverge silently.

**Instead**:

```tsx
// Do this instead
<ResponsiveModal width={INTERVIEW_MODAL_WIDTH} />
autoSize={{ minRows: INTERVIEW_COMPOSER_MIN_ROWS, maxRows: INTERVIEW_COMPOSER_MAX_ROWS }}
return target.scrollHeight - target.scrollTop - target.clientHeight <= INTERVIEW_SCROLL_BOTTOM_THRESHOLD
params.set('pageSize', String(query.pageSize ?? DEFAULT_PAGE_SIZE))
```

**Rule**:

* If a value has business meaning, validation meaning, interaction meaning, layout-system meaning, or cross-layer contract meaning, do not repeat it as an inline literal across files.
* One-off presentational values that are used once and have no reusable meaning may stay inline.
* Repeated values must be named and owned by the nearest stable scope.

---

## Required Patterns

### Convention: All User-Facing Text Must Be Internationalized

**What**: Every string visible to the user (labels, placeholders, messages, errors, tooltips) must go through `react-i18next`'s `t()` function. Hard-coded Chinese or English literals in JSX are forbidden.

**Why**: The project supports `zh-CN` and `en-US`. A single hard-coded string breaks the experience for one locale and is easy to miss in review.

**How to apply**:

1. Import the hook with the correct namespace:

   ```tsx
   import { useTranslation } from 'react-i18next'
   const { t } = useTranslation('workspace') // pick the feature namespace
   ```

2. Add keys to **both** locale files simultaneously:
   - `frontend/src/i18n/locales/zh-CN/<namespace>.json`
   - `frontend/src/i18n/locales/en-US/<namespace>.json`

3. Namespace selection:

   | Feature area | Namespace |
   |---|---|
   | Login / password | `auth` |
   | Resume editor & preview | `workspace` |
   | Template picker & styling | `template` |
   | AI chat & scoring | `ai` |
   | Interview practice | `interview` |
   | Share links | `share` |
   | App-level (nav, settings, errors) | `common` / `system` |

4. Key naming: use dot-separated paths matching the UI hierarchy, e.g. `editor.exportPdf`, `feedback.exportPdfFailed`.

5. For non-component code (e.g. utility functions), import the i18n instance directly:

   ```ts
   import i18n from '../../../i18n'
   i18n.t('export.noPreviewError', { ns: 'template' })
   ```

**Validation**: Run `grep -rn ">[^<{]*[一-鿿]" frontend/src --include="*.tsx"` to detect hard-coded Chinese in JSX. Any match is a violation.

**Wrong vs Correct**:

```tsx
// Wrong: hard-coded string
<Button>导出 PDF</Button>

// Correct: internationalized
<Button>{t('editor.exportPdf')}</Button>
```

---

### Convention: Repeated Business And Interaction Thresholds Must Be Centralized Nearby

**What**: Repeated numeric thresholds with stable business or interaction meaning must be extracted into nearby constants instead of being copied across components, hooks, and API helpers.

**Why**: Shared defaults such as pagination sizes, password-length limits, modal widths, and scroll/composer thresholds change over time. Centralizing them reduces drift between pages, features, and backend contracts.

**How to apply**:

1. Put cross-feature HTTP defaults in shared modules under `frontend/src/lib/`.
2. Put feature-specific thresholds in that feature's `constants.ts`.
3. Prefer names that describe intent, such as `DEFAULT_PAGE_SIZE`, `PASSWORD_MIN_LENGTH`, or `INTERVIEW_SCROLL_BOTTOM_THRESHOLD`.
4. Do not extract one-off presentational values with no reuse or domain meaning.

**Ownership rule**:

* Cross-feature request defaults belong in shared modules such as `frontend/src/lib/http/pageDefaults.ts`.
* Feature-specific interaction/layout thresholds belong in that feature's `constants.ts`.
* Validation limits mirrored from backend contracts should use the same named constant family on the frontend instead of repeating raw numbers in form rules.

**Examples**:

```ts
// Wrong: duplicated defaults
params.set('page', String(query.page ?? 1))
params.set('pageSize', String(query.pageSize ?? 6))

// Correct: centralized defaults
params.set('page', String(query.page ?? DEFAULT_PAGE))
params.set('pageSize', String(query.pageSize ?? DEFAULT_PAGE_SIZE))
```

**Good/Base/Bad cases**:

* Good: put interview modal width, scroll thresholds, report score cutoffs, and composer row counts into `features/interview/constants.ts`.
* Base: extract shared pagination defaults used by multiple features into `lib/http/pageDefaults.ts`.
* Bad: keep `6`, `64`, `720`, `80`, or `3/8` repeated across API files, components, and form rules after the second usage appears.

---

### Convention: All New Features Must Adapt to Mobile (≤ 480px)

**What**: Every user-facing feature must be usable on a 375px-wide viewport. This includes layout, interaction, and navigation — not just "doesn't overflow."

**Why**: A significant portion of users access the app on phones. Features that only work on desktop create a broken experience and generate bug reports.

**How to apply**:

1. **Detect mobile** via the shared hook:

   ```tsx
   import { useIsMobile } from '../../lib/hooks/useIsMobile'
   const isMobile = useIsMobile()
   ```

   Breakpoint: `max-width: 480px` (defined in `useIsMobile.ts`).

2. **Modals → bottom Drawer on mobile**: Use `ResponsiveModal` (`frontend/src/components/shared/ResponsiveModal.tsx`) instead of raw `Modal`. It renders a bottom `Drawer` on mobile automatically.

   ```tsx
   <ResponsiveModal open={open} title="..." onCancel={close} onOk={submit}>
     {content}
   </ResponsiveModal>
   ```

3. **Layout patterns**:
   - Multi-column grids → single column on mobile (use `@media (max-width: 480px)` in `index.css`)
   - Desktop action bars → collapsed into `Dropdown` or mobile-specific action row
   - Sticky headers/footers → respect `env(safe-area-inset-bottom)` for notched devices

4. **Touch targets**: Buttons and interactive elements must be at least 40px tall on mobile (enforced by the global rule `.ant-btn:not(.ant-btn-sm):not(.ant-btn-link):not(.ant-btn-text) { min-height: 40px }`).

5. **Conditional rendering pattern** (desktop vs mobile variants):

   ```tsx
   <div className="actions--desktop">{/* full toolbar */}</div>
   <div className="actions--mobile">{/* collapsed dropdown */}</div>
   ```

   Then in CSS:
   ```css
   .actions--mobile { display: none !important; }
   @media (max-width: 480px) {
     .actions--desktop { display: none !important; }
     .actions--mobile { display: flex !important; }
   }
   ```

6. **Off-screen rasterization sources** (PDF export, share cards): Must be insulated from mobile media queries. See [Component Guidelines → Styling Patterns](./component-guidelines.md#styling-patterns).

**Validation checklist** (before marking a feature complete):

- [ ] Open the page on a 375px viewport (Chrome DevTools → iPhone SE)
- [ ] All content is reachable without horizontal scroll
- [ ] All buttons/links are tappable (≥ 40px touch target)
- [ ] Modals appear as bottom drawers
- [ ] Text is readable without zooming (≥ 14px body text)
- [ ] No layout overflow or overlapping elements

**Common Mistakes**:

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Using raw `Modal` instead of `ResponsiveModal` | Modal is clipped or unreachable on mobile | Replace with `ResponsiveModal` |
| Adding a new `@media (max-width: …)` rule without checking export source | PDF export layout breaks on mobile | Add matching override in `.resume-export-source` scope |
| Forgetting `display: none` toggle for desktop/mobile action variants | Both variants render simultaneously | Add the CSS toggle pair |
| Using `vw` units in template styles | Export source renders at wrong size on mobile | Use fixed `px` values or override in export scope |

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

## Scenario: BOSS Browser Extension Extraction

### 1. Scope / Trigger
- Trigger: the standalone `browser-extension/` package extracts visible BOSS Zhipin job data and sends user-confirmed values to Smart Resume.
- This needs code-spec depth because it depends on a third-party SPA DOM, Chrome MV3 messaging, and application payload fields.

### 2. Signatures
- Content request: `{ type: 'GET_JOB_SNAPSHOT' }`
- Content response: `{ company: string; position: string; jobDescription: string; url: string; warnings: string[] }`
- Popup fallback: if `chrome.tabs.sendMessage` fails, inject `content-script.js` with `chrome.scripting.executeScript`, then retry the same request.
- Application create payload from extension: `channel: 'Boss直聘'`, `status: 'applied'`, selected `resumeId`, and notes containing the source URL plus JD summary.

### 3. Contracts
- Extraction reads only the current visible page DOM in the user's active tab.
- Prefer specific BOSS selectors such as `.job-name`, `.boss-name`, `.company-name`, and `.job-detail-body .desc`.
- Do not use broad selectors such as `[class*="company"] [class*="name"]` when a narrower BOSS-specific selector exists, because they can match entire mixed company/location/card sections.
- Normalize extracted position text by removing salary ranges before it enters popup state.
- The extension must keep extracted fields editable before any Smart Resume write or AI request.

### 4. Validation & Error Matrix
- Content script is not loaded -> popup injects `content-script.js` and retries once.
- Company missing after extraction -> return `company_missing` in `warnings`.
- Position missing after extraction -> return `position_missing` in `warnings`.
- JD missing after extraction -> return `job_description_missing` in `warnings`.
- BOSS security/verification page is visible instead of job DOM -> extraction may return warnings; the popup remains a manual-edit form.

### 5. Good/Base/Bad Cases
- Good: a list/detail page returns company from `.boss-name` or `.company-name`, position from `.job-name`, and JD from `.job-detail-body .desc`.
- Base: selectors fail but the document title provides a partial company or position, with warnings for fields still missing.
- Bad: position includes salary text such as `15-25K`, causing application records to store salary inside the job title.
- Bad: a broad company selector returns company plus location, financing, industry, or job-card text.

### 6. Tests Required
- `browser-extension` type-check must pass after changing content script, popup messaging, or Chrome API typings.
- `browser-extension` build must pass so `dist/manifest.json`, `dist/content-script.js`, `dist/popup.js`, and `dist/service-worker.js` stay loadable.
- Manual assertion on a logged-in BOSS job page: refresh updates company, position, JD, and URL from the active tab.

### 7. Wrong vs Correct
#### Wrong
```typescript
const company = firstText(['[class*="company"] [class*="name"]'])
const position = firstText(['[class*="job"] h1'])
```

#### Correct
```typescript
const company = firstText(['.job-detail-company .company-name', '.company-name', '.boss-name'])
const position = cleanPosition(firstText(['.job-name', 'a.job-name', '.job-title']))
```

---

## Code Review Checklist

* Repeated user-facing thresholds or defaults are not left as copied inline literals.
* Shared pagination, validation, or API defaults use named constants with clear ownership.
* Feature-specific layout and interaction values are centralized in the feature constants module when reused.
* Frontend values that mirror backend contracts do not silently drift from backend defaults.
