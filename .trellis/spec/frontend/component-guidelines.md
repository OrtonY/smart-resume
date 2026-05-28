# Component Guidelines

> How components are built in this project.

---

## Overview

<!--
Document your project's component conventions here.

Questions to answer:
- What component patterns do you use?
- How are props defined?
- How do you handle composition?
- What accessibility standards apply?
-->

(To be filled by the team)

---

## Component Structure

<!-- Standard structure of a component file -->

(To be filled by the team)

---

## Shared Input Components

### Convention: MarkdownComposer Enter Behavior

**What**: `MarkdownComposer` is an editing surface by default. Pressing Enter should insert a newline unless a caller explicitly opts into submit behavior with `submitOnEnter`.

**Why**: The component is used both for long-form resume content and chat-style inputs. Default newline behavior prevents accidental sends in AI resume chat and interview chat, while still allowing future command-style inputs to opt in intentionally.

**Example**:

```tsx
// Chat or long-form editing: Enter inserts a newline; send buttons submit explicitly.
<MarkdownComposer value={draft} onChange={setDraft} onSubmit={sendMessage} />

// Command-style input: Enter submits only when the caller opts in.
<MarkdownComposer value={draft} onChange={setDraft} onSubmit={sendMessage} submitOnEnter />
```

**Contract**: Any chat composer that must send only via button click should omit `submitOnEnter`.

### Convention: Shared Markdown Rendering Must Apply Bold Compatibility Normalization

**What**: All markdown rendering entry points must run the same bold compatibility normalization before parsing markdown.

**Why**: CommonMark delimiter rules can treat `**...**` as plain text when bold is adjacent to other text and the inner content starts/ends with quotes, CJK characters, or punctuation. This showed up as inconsistent user-visible behavior across interview/chat/resume views.

**Example**:

```tsx
import { normalizeMarkdownBoldForCjk } from '../../lib/markdown/boldCompatibility'

const normalized = normalizeMarkdownBoldForCjk(content)
```

**Contract**:
- If a renderer parses markdown from raw user/AI text, it must normalize bold markers first.
- This compatibility scope is currently limited to `**...**` (bold only), not italic marker families.
- Any temporary compatibility markers introduced during preprocessing must be stripped before final render text output.

---

## Streaming API Components

### Convention: Authenticated SSE Uses Fetch Helpers

**What**: Authenticated Server-Sent Events should use the shared fetch-based SSE helpers from `lib/sse/streamEvents.ts`, not native `EventSource`.

**Why**: Native `EventSource` cannot attach the project's `X-Access-Token` header and relative URLs such as `/api/...` hit the Vite dev server unless a proxy is configured. The fetch helper applies `VITE_API_BASE_URL` / the default backend base URL and sends the access token consistently.

**Example**:

```tsx
// Good: goes to the backend API base URL and includes X-Access-Token.
streamGetEvents('/api/interviews/123/report/events', onReportEvent, { signal })

// Bad: in dev this requests localhost:5173/api/... and cannot send X-Access-Token.
new EventSource('/api/interviews/123/report/events')
```

**Contract**: Components that consume protected SSE endpoints must call a feature API wrapper that delegates to `streamEvents` or `streamGetEvents`.

---

## Props Conventions

<!-- How props should be defined and typed -->

(To be filled by the team)

---

## Styling Patterns

### Convention: Preview Scaling Must Be Container-Driven, Not Layered

**What**: Components that already compute preview/page scale from their container size (for example `ResumePreview`) must be the single source of truth for the rendered scale. Do not add an extra responsive `transform: scale(...)` or `100vw`-based width calculation on top of the preview paper in page-level CSS.

**Why**: Layering component-level scale with viewport-based CSS scale causes double shrinking, device-width-specific distortion, and subtle horizontal overflow on real phones. The preview should follow the width of its actual container, not a second approximation derived from the viewport.

**Wrong vs Correct**:

```css
/* Wrong: the preview component already scales internally; this applies a second scale. */
.resume-editor-preview .resume-preview-paper {
  transform: scale(calc((100vw - 48px) / 794));
}

/* Correct: let ResumePreview own the scale and only constrain the outer container. */
.resume-editor-preview .resume-preview-stage {
  overflow-x: hidden;
}

.resume-editor-preview .resume-preview-pages {
  width: 100%;
}
```

**Related**: This is especially important for mobile editor preview, template gallery preview, and any off-screen export source that renders A4-sized content.

### Convention: Insulate Off-screen Rasterization Sources from Responsive Media Queries

**What**: Any DOM subtree rendered solely to be rasterized off-screen (e.g., the PDF export source `.resume-export-source` in `frontend/src/index.css`, captured by `html2canvas` in `frontend/src/features/resume/export/pdfExport.ts`) must override every responsive rule that would otherwise mutate its layout based on the actual device viewport. Treat the rasterization container as an isolated styling scope, not a free-form preview.

**Why**: `html2canvas` captures whatever the browser computes for the live DOM. The device's actual viewport still drives:

- Responsive media queries (`@media (max-width: 480px / 900px / 1280px)`) — even when the container itself is fixed at 794px (A4 width at 96dpi).
- Viewport units (`vw`, `vh`) — `4vw` resolves against the device viewport, not the container width.
- The mobile body font-size cascade (`body { font-size: 15px }` under `max-width: 480px`).
- iOS Safari `text-size-adjust` auto-boost.

Without explicit overrides, a phone exports a "mobile-shaped" PDF (single-column masthead, shrunken padding, smaller headline, centered identity) instead of matching the desktop result.

**How to apply**:

1. Pin the container's base font-size and disable text-size-adjust:

   ```css
   .resume-export-source {
     width: 794px;
     font-size: 16px;
     -webkit-text-size-adjust: 100%;
     text-size-adjust: 100%;
   }
   ```

2. Re-declare every desktop value that mobile media queries override inside the rasterization scope: grid columns, `flex-direction`, padding, font-size, avatar size, sidebar borders, etc.

3. Replace `vw`/`vh` clamps with their desktop maxima inside the scope (e.g., `clamp(28px, 4vw, 38px)` -> `font-size: 38px`).

4. **Match selector specificity** when overriding rules with modifier classes. A two-class selector `.scope .foo` (specificity 0,2,0) silently beats single-class modifier `.foo--compact` (0,1,0). Use `:not(.foo--compact)` in the override so the modifier still wins.

**Wrong vs Correct**:

```css
/* Wrong: forces every hero variant into two columns, breaking the editorial
   "compact" template that should stack vertically. */
.resume-export-source .resume-template__hero {
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
}

/* Correct: preserves the --compact modifier's single-column layout. */
.resume-export-source .resume-template__hero:not(.resume-template__hero--compact) {
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
}
```

**When to revisit this convention**:

- Introducing a new off-screen rasterization source (PDF, image export, share card).
- Adding a new `@media (max-width: …)` rule that touches any selector used inside `.resume-export-source`.
- Adding a new template variant whose layout differs from the base template (audit `:not()` guards).

**Validation**: After any of the above, generate the PDF on a 375px-wide viewport (mobile) and a >=1280px viewport (desktop) and diff page-1 visually. The two outputs must be layout-identical (text wrapping may differ if fonts haven't fully loaded; structural layout must not).

**Related**: `frontend/src/features/resume/export/pdfExport.ts` rasterizes pages queried via `.resume-preview-paper--page` inside the export root passed by `WorkspacePage` (`exportPreviewRef`).

---

## Accessibility

<!-- A11y requirements and patterns -->

(To be filled by the team)

---

## Common Mistakes

<!-- Component-related mistakes your team has made -->

(To be filled by the team)
