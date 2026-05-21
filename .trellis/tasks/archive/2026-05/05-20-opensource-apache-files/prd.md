# brainstorm: open source apache-2.0 files

## Goal

Prepare the repository for open-source release under Apache License 2.0, using Orton Yang as the copyright holder / principal subject, and add the minimum project files and documentation updates needed so the licensing status is clear to future users and contributors.

## What I already know

* The user wants this project to be open sourced under Apache License 2.0.
* The user identified the principal subject as "orton yang".
* The repository currently has root documentation in `README.md` and `README.zh-CN.md`.
* The repository currently does not have root `LICENSE`, `NOTICE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, or `SECURITY` files.

## Assumptions (temporary)

* A standard Apache 2.0 license text is acceptable without custom addenda.
* A root `NOTICE` file should be included alongside Apache 2.0 metadata.
* README files should mention the open-source license explicitly.
* Community process files such as `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` may be useful but are not strictly required unless the user wants a more complete public-maintainer setup.

## Open Questions

* None currently.

## Requirements (evolving)

* Add the Apache License 2.0 text at the repository root.
* Add the minimum companion root-level notice file(s) for the selected Apache 2.0 release scope.
* Update `README.md` and `README.zh-CN.md` so the chosen license is visible.
* Keep the scope limited to the minimum licensing/documentation set; do not add contribution/security/community policy files in this task.
* Use `Orton Yang` as the holder name format in legal/documentation text.

## Acceptance Criteria (evolving)

* [ ] The repository contains an Apache 2.0 license file at the root.
* [ ] The repository contains the selected minimum companion notice/attribution file(s) for this scope.
* [ ] `README.md` and `README.zh-CN.md` state that the project is released under Apache 2.0.
* [ ] The wording identifies `Orton Yang` consistently where ownership/notice text is needed.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* Adding `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, or `SECURITY.md`
* Reviewing third-party dependency license compatibility in depth
* Setting up GitHub repository settings, templates, or release automation unless explicitly requested

## Technical Notes

* Inspected: `README.md`, `README.zh-CN.md`
* Missing today: `LICENSE`, `NOTICE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
* Scope decision made: use the minimum required set only
* No existing in-repo usage of `orton/Orton/yang/Yang` was found via text search
* Holder name decision made: use `Orton Yang`
