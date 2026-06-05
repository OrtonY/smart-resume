# Release v1.3.0

## Goal

Prepare and publish Smart Resume version `1.3.0` from the current `develop` state, following the existing release workflow used for `v1.2.0`.

## What I already know

* User requested publishing version `v1.3.0`.
* Current branch is `codex/release-v1.3.0`, created from `develop`.
* Working tree was clean before creating this task.
* Current application version is `1.2.0` in `backend/pom.xml` and `frontend/package.json`.
* Current browser extension version is `0.1.0` in `browser-extension/package.json`.
* Existing release tags include `v1.0.0`, `v1.1.0`, `v1.1.1`, `v1.1.2`, and `v1.2.0`.
* Previous release task `06-03-release-1.2.0` updated `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `build.sh`, and `start.sh`.
* Previous release commit `d576276` did not update `browser-extension/package.json`.

## Assumptions (temporary)

* Release `v1.3.0` should align backend, frontend, and browser extension versions together for this release.
* The release should create the `v1.3.0` tag after the release commit exists.
* The task branch should be pushed and merged via PR to `develop`; no local merge into `develop`.
* After `v1.3.0` is published and merged back to `develop`, `develop` should be merged into `master` as the release promotion step.

## Open Questions

* None currently.

## Requirements (evolving)

* Update project-visible release versions from `1.2.0` to `1.3.0`.
* Keep backend, frontend, and browser extension package versions aligned for this release.
* Keep build/start scripts pointing at the generated `1.3.0` backend JAR.
* Verify the release build before publishing.
* Prepare the release branch and tag workflow without changing unrelated code.
* Include a release promotion step from `develop` to `master` after the `v1.3.0` release is completed on `develop`.

## Acceptance Criteria (evolving)

* [ ] `backend/pom.xml` uses version `1.3.0`.
* [ ] `frontend/package.json` and `frontend/package-lock.json` use version `1.3.0` for the root app package.
* [ ] `browser-extension/package.json`, `browser-extension/package-lock.json`, and `browser-extension/public/manifest.json` use version `1.3.0`.
* [ ] `build.sh` and `start.sh` reference `backend-1.3.0.jar`.
* [ ] Release build completes successfully.
* [ ] Release commit is created on the task branch.
* [ ] Git tag `v1.3.0` is created and pushed after the release commit is available.
* [ ] A `develop -> master` release merge is prepared/performed after `v1.3.0` lands on `develop`.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* New product functionality.
* Unrelated documentation changes.
* Dependency upgrades unrelated to the application release version.
* Local merges into `develop` or `master`.

## Technical Notes

* Relevant branch guide: `.trellis/spec/guides/git-branching-workflow.md`.
* Relevant version references found in `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `build.sh`, and `start.sh`.
* Browser extension version references were confirmed in `browser-extension/package.json`, `browser-extension/package-lock.json`, and `browser-extension/public/manifest.json`.
* This release explicitly includes the browser extension version bump, unlike prior release `v1.2.0`.
* Prior release reference: `.trellis/tasks/archive/2026-06/06-03-release-1.2.0/prd.md`.
* Release promotion constraint: after this release is merged into `develop`, promote `develop` to `master`.
