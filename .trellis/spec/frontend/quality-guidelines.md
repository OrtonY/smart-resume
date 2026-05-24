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

<!-- Patterns that should never be used and why -->

(To be filled by the team)

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

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
