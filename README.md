# Smart Resume

[中文说明](./README.zh-CN.md)

Smart Resume is a private, multi-user resume workspace for writing, refining, sharing, and practicing with AI. The repository combines a Spring Boot backend with a React + Vite frontend and focuses on one complete workflow: account registration and login, structured editing, live preview, template switching, scoring, sharing, PDF export, and mock interviews.

## Highlights

- Multi-user account system with registration and login, admin-controlled registration toggle
- Resume hub for creating, copying, deleting, and recovering multiple resumes
- Structured editor with live preview, section visibility, and layout customization
- Built-in and custom template support
- AI configuration, resume assistant chat, resume scoring, and interview simulation
- Public share links with optional password protection
- Two PDF export modes:
  - Quick export: client-side screenshot (`html2canvas` + `jspdf`), pixel-perfect to the preview
  - High-quality export: server-side rendering via Playwright + Chromium, producing real-text, ATS-friendly PDFs that match the preview pixel-for-pixel

## Product Tour

### Access and workspace

![Login](./docs/login.png)

Register a new account or log in with username and password to enter your private workspace.

![System configuration](./docs/System-Config.png)

Manage system settings from the workspace: toggle public registration (admin only), change your password, and configure AI providers.

![Resume workspace](./docs/Resume-Homepage.png)

Manage multiple resumes, jump to templates, interviews, AI settings, and the recycle bin from the main hub.

![Recycle bin](./docs/Resume-Recycle-Bin.png)

Recover deleted resumes from the recycle bin without leaving the same workspace flow.

### Editing and templates

![Resume editor](./docs/Resume-Edit.png)

Edit structured resume sections on the left and watch the rendered preview update in real time on the right.

![Standard A4 preview](./docs/Resume-Preview.png)

Open a clean A4 preview to inspect layout details before exporting or sharing.

![Template gallery](./docs/Resume-Template.png)

Switch between built-in templates or start from a custom template variant.

### AI-assisted workflow

![AI configuration](./docs/AI-Config.png)

Configure OpenAI-compatible providers, DeepSeek, or Ollama from the UI instead of hard-coding provider details in the frontend.

![AI resume chat](./docs/Resume-Edit-AI-Chat.png)

Use the in-editor AI assistant to review resume content, continue the conversation, and apply targeted suggestions.

![Resume scoring](./docs/Resume-Score.png)

Score a resume against general quality or a target job description and review structured feedback.

### Sharing and interviews

![Resume sharing](./docs/Resume-Share.png)

Create public share links, choose the share mode, and optionally protect the link with a password.

![Interview center](./docs/Interview-Hompage.png)

Create interview sessions, track progress, and review generated interview reports in the interview center.

![Interview in progress](./docs/Interview2.png)

Run timed interview rounds, view company context, and answer directly inside the interview workspace.

![Interview history view](./docs/Interview.png)

Review earlier rounds in read-only mode when you want to revisit a previous question and answer exchange.

![Interview report](./docs/Interview-Report.png)

Inspect the generated report with overall score, dimension breakdown, strengths, and improvement suggestions.

## Tech Stack

### Backend

- Java 21
- Spring Boot 3.5
- PostgreSQL
- Flyway
- MyBatis-Flex
- Spring AI

### Frontend

- React 19
- TypeScript
- Vite
- Ant Design
- React Router 7
- `html2canvas` + `jspdf` for the client-side quick PDF export

### PDF Export Pipeline (optional, server-side)

- Playwright + headless Chromium for high-quality, ATS-friendly PDF export
- Renders the same React preview component used in the editor, so server-side PDFs are pixel-identical to the live preview

## Repository Layout

```text
smart-resume/
|-- backend/   Spring Boot API, database migrations, domain services
|-- docs/      README screenshots and supporting assets
|-- frontend/  React application for the workspace, editor, sharing, and interviews
`-- .trellis/  Project workflow, specs, and task records
```

## Getting Started

### Prerequisites

- Java 21
- Node.js 20.19+ and npm
- PostgreSQL

Optional for AI features:

- an OpenAI-compatible API key
- a DeepSeek API key
- or a local Ollama instance

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd smart-resume
```

### 2. Prepare PostgreSQL

Create a database named `smart_resume`:

```sql
CREATE DATABASE smart_resume;
```

Default backend settings:

- database URL: `jdbc:postgresql://localhost:5432/smart_resume`
- username: `postgres`
- password: `postgres`
- backend port: `8080`

You can override them with environment variables:

```bash
export SMART_RESUME_DB_URL=jdbc:postgresql://localhost:5432/smart_resume
export SMART_RESUME_DB_USERNAME=postgres
export SMART_RESUME_DB_PASSWORD=postgres
export SMART_RESUME_BACKEND_PORT=8080
export SMART_RESUME_TOKEN_SECRET=change-this-secret
```

If you use PowerShell, set them with `$env:NAME='value'` instead of `export`.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

## Run the Application

You have two options: an all-in-one script for production-style runs, or two terminals for development.

### Option A: One-command script (production-style)

From the project root:

```bash
./start.sh
```

The script will:

1. Check Node.js (>= 20) and Java (>= 21) versions and abort with a clear message if either is missing or out of date — it will not switch versions for you, please run `nvm use 20` (or equivalent) first.
2. Install frontend dependencies and build the frontend (multi-entry: `index.html` for the app, `export.html` for server-side PDF rendering).
3. Sync the built frontend `dist/` into `backend/src/main/resources/static/` so Spring Boot can serve it.
4. Build the backend JAR.
5. Install Playwright's bundled Chromium (required for high-quality PDF export).
6. Launch the backend, which now serves both the API and the frontend on the configured port.

If you only want to build without launching, use:

```bash
./build.sh
```

### Option B: Two terminals (development)

Use this when you are actively iterating on the frontend with hot reload.

#### Terminal 1: start the backend

```bash
cd backend
./mvnw spring-boot:run
```

Flyway migrations run automatically on startup.

#### Terminal 2: start the frontend

```bash
cd frontend
npm run dev
```

Then open the Vite URL shown in the terminal, usually `http://localhost:5173`.

The frontend uses `http://localhost:8080` by default. To point it to another backend:

```bash
cd frontend
echo 'VITE_API_BASE_URL=http://localhost:8080' > .env.local
npm run dev
```

In dev mode, the **high-quality (server-side) PDF export** will be unavailable because the backend cannot find `static/export.html`; the API returns a friendly 503 with a localized message. The **quick (client-side) PDF export** keeps working in dev. To exercise the server-side path during development, run `./build.sh` once and start the backend from the produced JAR.

## First-Time Setup

After both services are running:

1. Open the frontend in your browser.
2. Log in with the default admin account: username `admin`, password `admin123`.
3. Change the default password immediately from the system settings.
4. Other users can register new accounts when public registration is enabled (default).

## AI Providers

AI features are configured from the application UI. The current backend supports:

- OpenAI-compatible endpoints
- DeepSeek
- Ollama

Typical use cases include resume chat, resume scoring, interview generation, and interview report generation.

## Notes

- Public share pages can be open or password-protected. Logged-in viewers and public share visitors can both download the high-quality PDF if the server is configured for it.
- PDF export has two paths:
  - **Quick export** (client-side, `html2canvas` + `jspdf`): always available, generated entirely in the browser. The output is image-based, so the text inside is not selectable or ATS-parsable.
  - **High-quality export** (server-side, Playwright + Chromium): produces real-text, ATS-friendly PDFs that match the live preview pixel-for-pixel. Requires the steps performed by `start.sh` / `build.sh` (frontend `dist/` synced into `static/` and Chromium installed).
  - If the server is missing either piece, the backend still starts normally and only the high-quality export endpoint returns a 503 with a localized message; all other features keep working.
- The frontend has its own package-level guide in [frontend/README.md](./frontend/README.md).

## License

Smart Resume is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for the full text and [NOTICE](./NOTICE) for attribution details.
