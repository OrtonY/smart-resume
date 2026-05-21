# Smart Resume

[中文说明](./README.zh-CN.md)

Smart Resume is a full-stack resume workspace for creating, editing, sharing, and improving resumes with AI-assisted workflows. The repository contains a Spring Boot backend and a React + Vite frontend.

## What This Project Does

Smart Resume is designed as a private, single-user resume studio:

- Set up a password on first launch and unlock the workspace with that password later.
- Create and manage multiple resumes.
- Edit resume content in a structured workspace with live preview.
- Reorder sections and customize layouts.
- Switch between built-in resume templates and create custom templates.
- Export the current resume to PDF from the browser.
- Generate public share links, including password-protected shares.
- Use an AI resume assistant with conversation history and one-click suggestions.
- Score a resume against general quality or a target job description.
- Run mock interviews with AI-generated responses and interview reports.

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
- `html2canvas` + `jspdf` for client-side PDF export

## Project Structure

```text
smart-resume/
├── backend/   # Spring Boot API, database migrations, AI services
├── frontend/  # React application and resume workspace UI
└── .trellis/  # Project workflow, specs, and task records
```

## Prerequisites

Install these first:

- Java 21
- Node.js 20.19+ and npm
- PostgreSQL

Optional for AI features:

- An OpenAI-compatible API key
- DeepSeek API key
- Or a local Ollama instance

## Installation

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

The backend defaults are:

- DB URL: `jdbc:postgresql://localhost:5432/smart_resume`
- DB user: `postgres`
- DB password: `postgres`
- Backend port: `8080`

Override them with environment variables if needed:

```bash
export SMART_RESUME_DB_URL=jdbc:postgresql://localhost:5432/smart_resume
export SMART_RESUME_DB_USERNAME=postgres
export SMART_RESUME_DB_PASSWORD=postgres
export SMART_RESUME_BACKEND_PORT=8080
export SMART_RESUME_TOKEN_SECRET=change-this-secret
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

## Running the Project

Open two terminals.

### Terminal 1: start the backend

```bash
cd backend
./mvnw spring-boot:run
```

Flyway migrations will run automatically on startup.

### Terminal 2: start the frontend

```bash
cd frontend
npm run dev
```

Then open the URL shown by Vite in your terminal. It is usually `http://localhost:5173`.

The frontend talks to `http://localhost:8080` by default. To point it somewhere else:

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

This project is currently built around a single-user workflow rather than a multi-account system.

## AI Configuration

AI features use the in-app AI configuration screen. The backend includes vendor support for:

- OpenAI-compatible endpoints
- DeepSeek
- Ollama

You can configure the base URL, API key, and model from the UI after entering the workspace.

## Notes

- Public share pages can be open or password-protected.
- PDF export is currently handled in the frontend, not by a server-side rendering pipeline.
- The repo already includes package-level docs such as [frontend/README.md](./frontend/README.md), but this root README is the main project entry point.

## License

Smart Resume is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for the full text and [NOTICE](./NOTICE) for attribution details.
