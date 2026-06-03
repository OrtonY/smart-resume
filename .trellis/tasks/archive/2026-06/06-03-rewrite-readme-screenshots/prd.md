# brainstorm: rewrite bilingual README screenshots

## Goal

Rewrite the root English and Chinese README files so they describe the project clearly and only reference screenshots from `docs/web` and `docs/mobile`.

## What I already know

* The user added `docs/mobile` and `docs/web`.
* The README screenshots must only use images from those two directories.
* Every image in both `docs/mobile` and `docs/web` must be included.
* Root README files are `README.md` and `README.zh-CN.md`.
* Existing Chinese README output appears garbled in the terminal, so rewriting it also restores readable Chinese content.

## Requirements

* Rewrite `README.md` in English.
* Rewrite `README.zh-CN.md` in Simplified Chinese.
* Do not reference legacy screenshots directly under `docs/`.
* Include all 23 images from `docs/web`.
* Include all 21 images from `docs/mobile`.
* Keep setup, run, tech stack, AI provider, PDF export, and license sections.

## Acceptance Criteria

* [x] `README.md` contains no image references outside `docs/web` and `docs/mobile`.
* [x] `README.zh-CN.md` contains no image references outside `docs/web` and `docs/mobile`.
* [x] Every image file under `docs/web` appears in both README files.
* [x] Every image file under `docs/mobile` appears in both README files.
* [x] Markdown image/link syntax is valid enough for GitHub rendering.

## Definition of Done

* Docs updated.
* Minimal verification run with a script or command that checks image references.
* Git branch follows project rules.

## Out of Scope

* Moving or renaming screenshot assets.
* Editing frontend/backend behavior.
* Changing build scripts or dependency versions.

## Technical Notes

* Branch created from `develop`: `codex/rewrite-readme-screenshots`.
* `rg.exe` is unavailable in this environment due to `Access is denied`; PowerShell native commands are used instead.
* Frontend version checked from `frontend/package.json`: React 19.2.6, Vite 8.0.14, Ant Design 6.4.3.
* Backend version checked from `backend/pom.xml`: Spring Boot 3.5.14, Java 21, Playwright 1.60.0.
