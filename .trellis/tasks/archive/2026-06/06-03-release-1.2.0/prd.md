# Release 1.2.0

## Goal

Prepare and publish Smart Resume version `1.2.0` from the current `develop` state, following the existing release workflow used for `v1.1.2`.

## What I already know

* User requested publishing version `1.2.0`.
* Current branch is `codex/release-1.2.0`, created from `develop`.
* Working tree was clean before creating this task.
* Current application version is `1.1.2`.
* Existing release tags include `v1.1.2`, `v1.1.1`, `v1.1.0`, and `v1.0.0`.
* The previous `v1.1.2` release updated backend/frontend version metadata and root build/start script JAR references.

## Assumptions

* Release `1.2.0` should align backend and frontend application versions only; dependency upgrades are out of scope.
* The release should create the `v1.2.0` tag after the release commit exists.
* The task branch should be pushed and merged via PR to `develop`; no local merge into `develop`.

## Requirements

* Update project-visible release versions from `1.1.2` to `1.2.0`.
* Keep backend and frontend package versions aligned.
* Keep build/start scripts pointing at the generated `1.2.0` backend JAR.
* Verify the release build before publishing.
* Prepare the release branch and tag workflow without changing unrelated code.

## Acceptance Criteria

* [x] `backend/pom.xml` uses version `1.2.0`.
* [x] `frontend/package.json` and `frontend/package-lock.json` use version `1.2.0` for the root app package.
* [x] `build.sh` and `start.sh` reference `backend-1.2.0.jar`.
* [x] Release build completes successfully.
* [ ] Release commit is created on the task branch.
* [ ] Git tag `v1.2.0` is created and pushed after the release commit is available.

## Definition of Done

* Version bump is committed on the release task branch.
* Minimal release verification has been run and recorded.
* Release branch/tag are pushed to origin.

## Out of Scope

* New product functionality.
* Unrelated documentation changes.
* Dependency upgrades unrelated to the application release version.
* Local merges into `develop` or `master`.

## Technical Notes

* Relevant branch guide: `.trellis/spec/guides/git-branching-workflow.md`.
* Relevant version references found in `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `build.sh`, and `start.sh`.
* Prior release reference: `.trellis/tasks/archive/2026-06/06-01-release-1-1-2/prd.md`.
* Verification run:
  * `npm install --silent` in `frontend/` passed.
  * `npm run build` in `frontend/` passed.
  * `npm run lint` in `frontend/` passed.
  * Synced `frontend/dist/` into `backend/src/main/resources/static`.
  * `mvn package "-DskipTests" "-Dmaven.repo.local=D:\Project\Maven\NuMaxCloud-9000\repository" -q` in `backend/` passed and generated `backend/target/backend-1.2.0.jar`.
  * `mvn test "-Dmaven.repo.local=D:\Project\Maven\NuMaxCloud-9000\repository" -q` in `backend/` passed.
* `bash ./build.sh` is parseable after LF line endings, but Git Bash in this environment cannot locate Java on `PATH`; release build was verified through equivalent PowerShell steps.
