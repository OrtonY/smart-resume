# Directory Structure

> How frontend code is organized in this project.

---

## Overview

The frontend should use a feature-first structure with a small shared layer. Resume editing flows should be easy to find, and page-level orchestration should stay separate from reusable section components.

---

## Directory Layout

```text
src/
├─ app/
│  ├─ router/
│  ├─ providers/
│  └─ styles/
├─ pages/
│  ├─ dashboard/
│  ├─ resume-editor/
│  └─ resume-preview/
├─ features/
│  ├─ resume/
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ schemas/
│  │  └─ types/
│  ├─ ai/
│  └─ job/
├─ components/
│  ├─ layout/
│  └─ shared/
├─ lib/
│  ├─ http/
│  ├─ utils/
│  └─ constants/
└─ types/
```

---

## Module Organization

* `pages/` owns route composition and page-specific layout.
* `features/` owns business-facing UI and logic per domain.
* `components/shared/` is for reusable presentational blocks with broad value.
* `lib/` holds framework-neutral helpers and infrastructure wrappers.
* `types/` is only for truly global contracts. Prefer feature-local types first.

Do not move feature-specific forms or hooks into `components/` just because they render UI.

---

## Naming Conventions

* Feature folders use lowercase kebab-case or lowercase singular nouns consistently.
* React component files use `PascalCase.tsx`.
* Hooks use `useXxx.ts`.
* API modules use task-oriented names such as `resumeApi.ts` or `aiRewriteApi.ts`.
* Schemas and types should align with backend DTO naming where practical.

Keep names close to the user workflow. Prefer `ResumeSectionForm` over vague names like `InfoPanel`.

---

## Examples

There are no implementation examples yet. The first scaffold should update this file with real directories once they exist.
