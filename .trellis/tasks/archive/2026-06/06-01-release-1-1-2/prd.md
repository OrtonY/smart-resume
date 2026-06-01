# Release 1.1.2

## Goal

Prepare and publish Smart Resume version 1.1.2 from the current `develop` state.

## Requirements

* Update project-visible release versions from `1.1.1` to `1.1.2`.
* Keep backend and frontend package versions aligned.
* Keep build/start scripts pointing at the generated 1.1.2 backend JAR.
* Verify the release build before publishing.

## Acceptance Criteria

* [x] `backend/pom.xml` uses version `1.1.2`.
* [x] `frontend/package.json` and `frontend/package-lock.json` use version `1.1.2` for the root app package.
* [x] `build.sh` and `start.sh` reference `backend-1.1.2.jar`.
* [x] Release build completes successfully.
* [ ] Git tag `v1.1.2` is created and pushed after the release commit is available on the release branch.

## Definition of Done

* Version bump is committed on the release task branch.
* Minimal release verification has been run and recorded.
* Release branch/tag are pushed to origin.

## Out of Scope

* New product functionality.
* Unrelated documentation or dependency upgrades.
* Local merges into `develop`.

## Technical Notes

* Current branch: `codex/release-1-1-2`, based on `develop`.
* Previous release tag: `v1.1.1`.
* Version references found in `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `build.sh`, and `start.sh`.
