# Smart Resume

[中文说明](./README.zh-CN.md)

Smart Resume is a private, multi-user resume workspace for creating, improving, sharing, exporting, and rehearsing resumes with AI. It combines a Spring Boot backend with a React + Vite frontend and covers the full resume workflow: account access, structured editing, live preview, templates, scoring, public sharing, PDF export, submissions, and interview practice.

## Highlights

- Multi-user login and registration with admin-controlled registration settings
- Resume hub for creating, editing, copying, deleting, recovering, versioning, and sharing resumes
- Structured editor with real-time preview, A4 preview, section settings, and template management
- AI provider configuration, resume chat, resume scoring, translation, and interview assistance
- Interview workspace with target company context, AI answer suggestions, chat history, and reports
- Submission tracking for job applications and resume delivery
- BOSS Zhipin browser extension for capturing job details, saving applications, and generating AI cover letters
- Two PDF export paths:
  - Quick export in the browser with `html2canvas` and `jspdf`
  - High-quality server-side export with Playwright and Chromium

## Product Screenshots

### Web Experience

#### Access and Workspace

| Login | Resume Homepage |
|---|---|
| <img src="./docs/web/login.png" alt="Web login" width="420"> | <img src="./docs/web/resume-homepage.png" alt="Web resume homepage" width="420"> |

| AI Configuration | Recycle Bin |
|---|---|
| <img src="./docs/web/AI-config.png" alt="Web AI configuration" width="420"> | <img src="./docs/web/Recycle.png" alt="Web recycle bin" width="420"> |

#### Resume Editing and Preview

| Resume Editor | A4 Preview |
|---|---|
| <img src="./docs/web/resume-edit.png" alt="Web resume editor" width="420"> | <img src="./docs/web/resume-a4-preview.png" alt="Web A4 resume preview" width="420"> |

| Resume Chat | Resume Translation |
|---|---|
| <img src="./docs/web/resume-chat.png" alt="Web resume chat" width="420"> | <img src="./docs/web/resume-translate.png" alt="Web resume translation" width="420"> |

| Score Overview | Score Details | Score Suggestions |
|---|---|---|
| <img src="./docs/web/resume-score1.png" alt="Web resume score overview" width="300"> | <img src="./docs/web/resume-score2.png" alt="Web resume score details" width="300"> | <img src="./docs/web/resume-score3.png" alt="Web resume score suggestions" width="300"> |

| Resume Version | Resume Share | Share Detail |
|---|---|---|
| <img src="./docs/web/resume-version.png" alt="Web resume version" width="300"> | <img src="./docs/web/resume-share.png" alt="Web resume share" width="300"> | <img src="./docs/web/resume-share-detail.png" alt="Web resume share detail" width="300"> |

#### Templates and Submissions

| Template Homepage | Template Editor | Resume Import |
|---|---|---|
| <img src="./docs/web/template-homepage.png" alt="Web template homepage" width="300"> | <img src="./docs/web/template-edit.png" alt="Web template editor" width="300"> | <img src="./docs/web/template-resume-import.png" alt="Web resume import from template" width="300"> |

| Submission Tracking |
|---|
| <img src="./docs/web/submission.png" alt="Web submission tracking" width="420"> |

#### Interview Practice

| Interview Homepage | Interview Chat |
|---|---|
| <img src="./docs/web/interview-homepage.png" alt="Web interview homepage" width="420"> | <img src="./docs/web/interview-chat.png" alt="Web interview chat" width="420"> |

| AI Answer | Interview Report 1 | Interview Report 2 |
|---|---|---|
| <img src="./docs/web/interview-ai-answer.png" alt="Web interview AI answer" width="300"> | <img src="./docs/web/interview-report1.png" alt="Web interview report overview" width="300"> | <img src="./docs/web/interview-report2.png" alt="Web interview report details" width="300"> |

### Mobile Experience

#### Access and Workspace

| Login | Resume Homepage | AI Configuration |
|---|---|---|
| <img src="./docs/mobile/login.png" alt="Mobile login" width="220"> | <img src="./docs/mobile/resume-homepage.png" alt="Mobile resume homepage" width="220"> | <img src="./docs/mobile/AI-config.png" alt="Mobile AI configuration" width="220"> |

| Recycle Bin | Submission Tracking | Resume Settings |
|---|---|---|
| <img src="./docs/mobile/Recycle.png" alt="Mobile recycle bin" width="220"> | <img src="./docs/mobile/submission.png" alt="Mobile submission tracking" width="220"> | <img src="./docs/mobile/resume-settings.png" alt="Mobile resume settings" width="220"> |

#### Resume Editing and Sharing

| Resume Editor | Resume Preview | Resume Chat |
|---|---|---|
| <img src="./docs/mobile/resume-edit.png" alt="Mobile resume editor" width="220"> | <img src="./docs/mobile/resume-preview.png" alt="Mobile resume preview" width="220"> | <img src="./docs/mobile/resume-chat.png" alt="Mobile resume chat" width="220"> |

| Score Overview | Score Details | Share Detail |
|---|---|---|
| <img src="./docs/mobile/resume-score1.png" alt="Mobile resume score overview" width="220"> | <img src="./docs/mobile/resume-score2.png" alt="Mobile resume score details" width="220"> | <img src="./docs/mobile/resume-share-detail.png" alt="Mobile resume share detail" width="220"> |

| Version List | Version Detail |
|---|---|
| <img src="./docs/mobile/resume-version1.png" alt="Mobile resume version list" width="220"> | <img src="./docs/mobile/resume-version2.png" alt="Mobile resume version detail" width="220"> |

#### Templates and Interviews

| Template Homepage | Template Editor |
|---|---|
| <img src="./docs/mobile/template-homepage.png" alt="Mobile template homepage" width="220"> | <img src="./docs/mobile/template-edit.png" alt="Mobile template editor" width="220"> |

| Interview Homepage | Target Company | Interview Chat |
|---|---|---|
| <img src="./docs/mobile/interview-homepage.png" alt="Mobile interview homepage" width="220"> | <img src="./docs/mobile/interview-target-company.png" alt="Mobile interview target company" width="220"> | <img src="./docs/mobile/interview-chat.png" alt="Mobile interview chat" width="220"> |

| AI Answer | Interview Report |
|---|---|
| <img src="./docs/mobile/interview-ai-answer.png" alt="Mobile interview AI answer" width="220"> | <img src="./docs/mobile/interview-report.png" alt="Mobile interview report" width="220"> |

### Browser Extension

| Login | Service URL |
|---|---|
| <img src="./docs/extension/login.png" alt="Browser extension login" width="220"> | <img src="./docs/extension/url-config.png" alt="Browser extension service URL configuration" width="220"> |

| Job Capture | AI Cover Letter |
|---|---|
| <img src="./docs/extension/control-page.png" alt="Browser extension BOSS job capture" width="420"> | <img src="./docs/extension/ai-cover-letter.png" alt="Browser extension AI cover letter" width="420"> |

## Tech Stack

### Backend

- Java 21
- Spring Boot 3.5.14
- PostgreSQL
- Flyway
- MyBatis-Flex
- Spring AI
- Playwright 1.60.0 for high-quality PDF export

### Frontend

- React 19.2
- TypeScript
- Vite 8
- Ant Design 6
- React Router 7
- `html2canvas` and `jspdf` for quick browser-side PDF export

### Browser Extension

- TypeScript
- Vite
- Chrome extension APIs

## Repository Layout

```text
smart-resume/
|-- backend/   Spring Boot API, database migrations, domain services, PDF export
|-- browser-extension/  BOSS Zhipin browser extension for job capture and cover letters
|-- docs/      README screenshots and supporting assets
|-- frontend/  React application for workspace, editor, sharing, templates, and interviews
`-- .trellis/  Project workflow, specs, and task records
```

## Getting Started

### Prerequisites

- Java 21
- Node.js 20.19+ and npm
- PostgreSQL

Optional for AI features:

- An OpenAI-compatible API key
- A DeepSeek API key
- Or a local Ollama instance

### 1. Clone the Repository

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

- Database URL: `jdbc:postgresql://localhost:5432/smart_resume`
- Username: `postgres`
- Password: `postgres`
- Backend port: `8080`

You can override them with environment variables:

```bash
export SMART_RESUME_DB_URL=jdbc:postgresql://localhost:5432/smart_resume
export SMART_RESUME_DB_USERNAME=postgres
export SMART_RESUME_DB_PASSWORD=postgres
export SMART_RESUME_BACKEND_PORT=8080
export SMART_RESUME_TOKEN_SECRET=change-this-secret
```

In PowerShell, use `$env:NAME='value'` instead of `export`.

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Run the Application

### Option A: One-command Script

From the project root:

```bash
./start.sh
```

The script checks Node.js and Java versions, installs frontend dependencies, builds the frontend, syncs `frontend/dist/` into the backend static resources, builds the backend JAR, installs Playwright Chromium when missing, and starts the server.

To build without starting the server:

```bash
./build.sh
```

### Option B: Development Mode

Start the backend:

```bash
cd backend
./mvnw spring-boot:run
```

Start the frontend in another terminal:

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

## Browser Extension Usage

The BOSS Zhipin helper is a local Chrome/Edge extension. It reads the active BOSS job page, sends the extracted job details to your Smart Resume service, and can create an application record or AI cover letter from a selected resume.

### Build and Install

1. Start Smart Resume first, either with the one-command script or with the backend running at `http://localhost:8080`.
2. Build the extension:

```bash
cd browser-extension
npm install
npm run build
```

3. Open `chrome://extensions` or `edge://extensions`.
4. Enable developer mode.
5. Choose "Load unpacked" and select `browser-extension/dist`.

### Use on BOSS Zhipin

1. Open a BOSS Zhipin job page, such as `https://www.zhipin.com/web/geek/job*` or `https://www.zhipin.com/job_detail/*`.
2. Open the Smart Resume BOSS Helper extension.
3. On first use, enter the Smart Resume service URL, for example `http://localhost:8080`, and save it.
4. Sign in with your Smart Resume account.
5. Select a resume. The extension fills company, position, JD, salary, education, and work-duration notes from the current job page.
6. When switching between jobs in the same BOSS page, click "Refresh" in the extension before saving or generating.
7. Click "Save application" to create or reuse a BOSS application record, or click "Generate cover letter" to create an AI cover letter.
8. After a cover letter is generated, use the Job/Cover letter tabs to switch back and review or copy the generated letter again.

## First-time Use

1. Open the frontend in your browser.
2. Log in with the default admin account: username `admin`, password `admin123`.
3. Change the default password immediately from system settings.
4. Other users can register new accounts when public registration is enabled.

## AI Providers

AI features are configured from the application UI. The backend supports OpenAI-compatible endpoints, DeepSeek, and Ollama. These providers are used by resume chat, resume scoring, translation, interview generation, AI answer suggestions, and interview reports.

## PDF Export Notes

- Public share pages can be open or password-protected.
- Quick export runs fully in the browser and produces an image-based PDF.
- High-quality export runs on the backend with Playwright and Chromium and produces a real-text, ATS-friendly PDF.
- In development mode, high-quality export may return 503 until `frontend/dist/` has been built and copied into backend static resources.
- The frontend has a package-level guide in [frontend/README.md](./frontend/README.md).

## License

Smart Resume is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for the full text and [NOTICE](./NOTICE) for attribution details.
