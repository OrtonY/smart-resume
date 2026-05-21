# Optimize project readmes

## Goal

Refresh the repository's two primary README files so they present Smart Resume clearly to visitors and contributors. The root README should act as the polished project entry point with feature overview, setup guidance, and curated screenshots from `docs/`. The frontend README should stop being the default Vite template and become a practical guide for frontend developers working on the React app.

## What I already know

* The user explicitly asked to optimize two `README.md` files and noted that all required images are already available under `docs/`.
* The target files are `README.md` and `frontend/README.md`.
* The current root README already describes the product, stack, and startup flow, but it does not showcase the UI with screenshots and can be structured more clearly.
* The current frontend README is still the stock Vite template and does not describe the actual app.
* The app is a single-user resume workspace with setup/unlock flow, resume management, template selection, AI configuration, resume scoring, sharing, recycle bin, and interview features.
* The frontend route surface includes setup, unlock, workspace, template gallery, interview center, and public share pages.

## Assumptions (temporary)

* Keep the root README as the main landing document and preserve the link to `README.zh-CN.md`.
* Use the existing screenshots in `docs/` rather than creating or editing image assets.
* Limit this task to the two requested `README.md` files unless an adjacent change is required to keep links or markdown correct.

## Open Questions

* None blocking at the moment.

## Requirements (evolving)

* Rewrite the root `README.md` into a clearer project landing page.
* Add a concise feature-oriented screenshot section to the root README using images from `docs/`.
* Keep installation and local startup instructions accurate to the current repo structure.
* Rewrite `frontend/README.md` so it documents the actual React frontend rather than the default Vite template.
* Include frontend-specific structure, scripts, and key feature modules in `frontend/README.md`.

## Acceptance Criteria (evolving)

* [ ] `README.md` clearly explains what Smart Resume is, what it includes, and how to run it locally.
* [ ] `README.md` embeds relevant images from `docs/` with sensible captions/order.
* [ ] `frontend/README.md` no longer contains template boilerplate and instead reflects the real frontend stack and structure.
* [ ] Both README files are internally consistent with the current project layout and commands.

## Definition of Done (team quality bar)

* Docs updated with accurate commands and paths
* Markdown structure is readable on GitHub
* Links and image paths resolve correctly

## Out of Scope (explicit)

* Rewriting `README.zh-CN.md`
* Changing application code, UI behavior, or screenshot assets
* Adding new images outside the existing `docs/` directory

## Technical Notes

* Relevant files inspected: `README.md`, `README.zh-CN.md`, `frontend/README.md`, `frontend/package.json`, `frontend/src/app/router/AppRouter.tsx`
* Relevant directories inspected: `docs/`, `frontend/src/`, `backend/`
* Feature evidence came from current UI screenshots and frontend/backend code structure, not only from existing README text.
