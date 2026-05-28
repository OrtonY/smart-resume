# Upgrade frontend and backend versions to v1.1.1

## Goal

Align the Smart Resume frontend and backend project versions to `v1.1.1` and update the local build/start script references so generated backend artifacts are referenced consistently.

## What I already know

* Backend project version is currently `1.1.0` in `backend/pom.xml`.
* Frontend project version is currently `1.1.0` in `frontend/package.json` and `frontend/package-lock.json`.
* `build.sh` and `start.sh` previously referenced `backend-1.0.0.jar`, which was stale relative to the project version.
* This task touches both frontend and backend configuration, plus root shell scripts.

## Requirements

* Update backend version metadata from `1.1.0` to `1.1.1`.
* Update frontend version metadata from `1.1.0` to `1.1.1`.
* Update script references to the backend JAR so they match the upgraded backend version.
* Keep the change minimal and avoid unrelated refactors.

## Acceptance Criteria

* [ ] `backend/pom.xml` declares version `1.1.1`.
* [ ] `frontend/package.json` and root package entry in `frontend/package-lock.json` declare version `1.1.1`.
* [ ] `build.sh` and `start.sh` reference `backend-1.1.1.jar`.
* [ ] Frontend build passes.
* [ ] Backend package build passes.

## Definition of Done

* Minimal required files are updated.
* Verification commands are executed and results are recorded in the session response.

## Technical Approach

Update only the explicit version-entry files and the shell script JAR references discovered by repository search.

## Out of Scope

* Dependency upgrades unrelated to the application version.
* API, UI, or business logic changes.
* Release tagging, publishing, or changelog generation.

## Technical Notes

* Relevant specs read before implementation:
  * `.trellis/spec/guides/index.md`
  * `.trellis/spec/guides/git-branching-workflow.md`
  * `.trellis/spec/guides/code-reuse-thinking-guide.md`
  * `.trellis/spec/backend/index.md`
  * `.trellis/spec/backend/quality-guidelines.md`
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
* Relevant version references found during inspection:
  * `backend/pom.xml`
  * `frontend/package.json`
  * `frontend/package-lock.json`
  * `build.sh`
  * `start.sh`
