# Smart Resume Frontend

This package contains the React 19 + TypeScript + Vite application for Smart Resume. It powers the private workspace, resume editor, template gallery, public share page, AI interactions, and interview flows.

## Stack

- React 19
- TypeScript
- Vite 8
- Ant Design 6
- React Router 7
- `@dnd-kit` for drag-and-drop section ordering
- `html2canvas` + `jspdf` for client-side PDF export
- `react-markdown` + `remark-gfm` for AI response rendering

## Scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build the production bundle |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Local Development

### Backend API base URL

The frontend reads `VITE_API_BASE_URL` and falls back to `http://localhost:8080`.

Create `frontend/.env.local` if your backend runs somewhere else:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

### Typical startup flow

```bash
cd backend
./mvnw spring-boot:run
```

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Route Surface

| Route | Purpose |
| --- | --- |
| `/share/:shareCode` | Public resume share page |
| `*` before setup | First-run password setup flow |
| `*` after setup but before unlock | Password unlock flow |
| `/app` | Resume workspace hub |
| `/app/resumes/:resumeId` | Resume editor and live preview |
| `/app/templates` | Template gallery and template customization |
| `/app/interviews` | Interview center |
| `/app/interviews/:interviewId` | Interview detail and session flow |
| `/app/recycle-bin` | Deleted resume recovery workspace |

## Source Layout

```text
frontend/
|-- public/                 Static assets copied as-is
|-- src/
|   |-- app/                Application providers and router
|   |-- assets/             Frontend image assets
|   |-- features/
|   |   |-- ai/             AI config, chat, scoring APIs and UI pieces
|   |   |-- interview/      Interview APIs, hooks, and components
|   |   |-- resume/         Resume editor, preview, export, templates
|   |   `-- system/         Bootstrap and access-related API calls
|   |-- lib/                Shared auth, HTTP, SSE, and markdown utilities
|   `-- pages/              Route-level pages
|-- package.json
`-- vite.config.ts
```

## Feature Areas

- `src/features/system`: bootstrap status, password setup, password verification, access token persistence
- `src/features/resume`: resume CRUD flows, editor UI, live preview, export helpers, template catalog, and share-related rendering
- `src/features/ai`: AI provider configuration, streaming resume chat, chat history, and structured resume scoring
- `src/features/interview`: interview list/detail flows, streaming responses, pause/continue behavior, and report generation
- `src/lib/http`: shared fetch wrapper and API base URL handling
- `src/lib/sse`: server-sent event helpers used by streaming AI flows
- `src/lib/markdown`: markdown composition and rendering for AI messages

## UI Snapshots

![Resume editor](../docs/Resume-Edit.png)

The core editor pairs structured forms with a live resume preview.

![Template gallery](../docs/Resume-Template.png)

Templates are first-class frontend features, including built-in and custom variants.

![Interview center](../docs/Interview-Hompage.png)

The interview experience lives in the same frontend app and shares the workspace design language.

## Notes for Contributors

- This app is feature-oriented: add new code under the relevant `src/features/*` area before creating new top-level buckets.
- The workspace is designed around a single-user flow, so setup, unlock, and local token storage are part of the main app surface.
- Keep this README aligned with the root [README](../README.md) whenever startup steps or route coverage change.
