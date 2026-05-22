# Git Branching Workflow Guide

## Required Policy

- `develop` is the long-lived integration branch for daily development.
- Every task starts from a new branch created off `develop`.
- Never make a normal development commit directly on `master` or `develop`.
- Task branches are merged into `develop` via GitHub PR (rebase merge, linear history).
- Never merge locally into `develop` — always push the branch and open a PR.
- Merge `develop` into `master` only when preparing a release.
- Never delete `develop`.

## Remote Branch Protection (GitHub)

- `develop`: requires PR, requires linear history (no merge commits), 0 approvals needed.
- PR merge strategy: **Rebase merge** (preserves individual commits).
- Force push disabled on `develop` and `master`.

## Operational Checklist

Before you start work:

1. Confirm the current branch is either `develop` or a task branch created from `develop`.
2. If you are still on `master`, stop and switch to `develop` first.
3. If the work is a new requirement, create a fresh branch from `develop` before editing code.

Before you finish work:

1. Push the task branch to origin: `git push -u origin <branch>`.
2. Create a PR targeting `develop`: `gh pr create --base develop`.
3. After PR merges (rebase merge), sync local: `git checkout develop && git pull --rebase`.
4. Delete the local task branch: `git branch -d <branch>`.

## Release Rule

- `master` should only move forward from `develop`.
- If a merge target is `master`, the source branch must be `develop`.
