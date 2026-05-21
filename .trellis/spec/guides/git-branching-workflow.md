# Git Branching Workflow Guide

## Required Policy

- `develop` is the long-lived integration branch for daily development.
- Every task starts from a new branch created off `develop`.
- Never make a normal development commit directly on `master` or `develop`.
- Merge task branches back into `develop` when they are done, then delete the task branch.
- Merge `develop` into `master` only when preparing a release.
- Never delete `develop`.

## Operational Checklist

Before you start work:

1. Confirm the current branch is either `develop` or a task branch created from `develop`.
2. If you are still on `master`, stop and switch to `develop` first.
3. If the work is a new requirement, create a fresh branch from `develop` before editing code.

Before you finish work:

1. Make sure the changes are merged back into `develop`, not `master`.
2. Delete the task branch after the merge is complete.
3. Leave `develop` in place for the next task.

## Release Rule

- `master` should only move forward from `develop`.
- If a merge target is `master`, the source branch must be `develop`.
