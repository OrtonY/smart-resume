# Smart Resume

[中文说明](./README.zh-CN.md)

Smart Resume is a private, single-user resume workspace for writing, refining, sharing, and practicing with AI. The repository combines a Spring Boot backend with a React + Vite frontend and focuses on one complete workflow: secure access, structured editing, live preview, template switching, scoring, sharing, PDF export, and mock interviews.

## Highlights

- First-run password setup and later unlock flow for a private workspace
- Resume hub for creating, copying, deleting, and recovering multiple resumes
- Structured editor with live preview, section visibility, and layout customization
- Built-in and custom template support
- AI configuration, resume assistant chat, resume scoring, and interview simulation
- Public share links with optional password protection
- Browser-side PDF export for the current resume

## Product Tour

### Access and workspace

![Unlock screen](./docs/login.png)

Set a workspace password once, then unlock the studio on later visits.

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
- `html2canvas` + `jspdf` for client-side PDF export

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

Open two terminals.

### Terminal 1: start the backend

```bash
cd backend
./mvnw spring-boot:run
```

Flyway migrations run automatically on startup.

### Terminal 2: start the frontend

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

## First-Time Setup

After both services are running:

1. Open the frontend in your browser.
2. Set the workspace password on the first-launch screen.
3. Use that password to unlock the app on later visits.

The current product is intentionally designed around a single-user workspace instead of a multi-account system.

## AI Providers

AI features are configured from the application UI. The current backend supports:

- OpenAI-compatible endpoints
- DeepSeek
- Ollama

Typical use cases include resume chat, resume scoring, interview generation, and interview report generation.

## Notes

- Public share pages can be open or password-protected.
- PDF export currently happens in the frontend rather than through a server-side rendering pipeline.
- The frontend has its own package-level guide in [frontend/README.md](./frontend/README.md).

## License

Smart Resume is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for the full text and [NOTICE](./NOTICE) for attribution details.
