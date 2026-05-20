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

<!-- How styles are applied (CSS modules, styled-components, Tailwind, etc.) -->

(To be filled by the team)

---

## Accessibility

<!-- A11y requirements and patterns -->

(To be filled by the team)

---

## Common Mistakes

<!-- Component-related mistakes your team has made -->

(To be filled by the team)
