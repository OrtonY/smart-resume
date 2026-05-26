---
name: trellis-finish-work
description: "Wrap up the current session: verify quality gate passed, archive completed tasks, record session progress, push branch, and create PR. Use when done coding and ready to end the session."
---

# Finish Work

Wrap up the current session: archive the active task, record the session journal, push the task branch to remote, and create a PR targeting `develop`. Code commits are NOT done here — those happen in workflow Phase 3.4 before you invoke this command.

## Step 1: Survey current state

```bash
python ./.trellis/scripts/get_context.py --mode record
```

This prints:

- **My active tasks** — review whether any besides the current one are actually done (code merged, AC met) and should be archived this round.
- **Git status** — quick visual on what's dirty.
- **Recent commits** — you'll need their hashes in Step 4 for `--commit`.

If `--mode record` surfaces other completed tasks not tied to the current session, surface them to the user with a one-shot confirmation: "These N tasks look done — archive them too in this round? [y/N]". Default is no; the current active task is always archived in Step 3 regardless.

## Step 2: Sanity check — classify dirty paths

Run:

```bash
git status --porcelain
```

Filter out paths under `.trellis/workspace/` and `.trellis/tasks/` — those are managed by `add_session.py` and `task.py archive` auto-commits and will appear dirty as part of this skill's own work.

For each remaining dirty path, decide whether it belongs to **the current task** or to **other parallel work** (e.g., another terminal window editing the same repo). Heuristics:

- Paths referenced in the current task's `prd.md` / `implement.jsonl` / `check.jsonl` → current task
- Paths in code areas matching the task's stated scope, or that you remember editing this session → current task
- Paths in unrelated areas you have no recollection of touching this session → other parallel work

Then route:

- **Any remaining path looks like current-task work** — bail out with:
  > "Working tree has uncommitted code changes from this task: `<list>`. Return to workflow Phase 3.4 to commit them before running `finish-work`."

  Do NOT run `git commit` here. Do NOT prompt the user to commit. The user goes back to Phase 3.4 and the AI drives the batched commit there.
- **All remaining paths look unrelated** (other parallel-window work) — report them once and continue to Step 3:
  > "FYI, dirty files outside this task's scope — leaving them for the other window: `<list>`."
- **Genuinely unsure** — ask the user once: "Are `<list>` this task's work I forgot to commit, or another window's? (commit / ignore)" — then route per their answer.

## Step 3: Archive task(s)

```bash
python ./.trellis/scripts/task.py archive <task-name>
```

At minimum: the current active task (if any). Plus any extra tasks the user confirmed in Step 1. Each archive produces a `chore(task): archive ...` commit via the script's auto-commit.

If there is no active task and the user did not confirm any cleanup archives, skip this step.

## Step 4: Record session journal

```bash
python ./.trellis/scripts/add_session.py \
  --title "Session Title" \
  --commit "hash1,hash2" \
  --summary "Brief summary"
```

Use the work-commit hashes produced in Phase 3.4 (visible in Step 1's `Recent commits` list, or via `git log --oneline`) for `--commit`. Do not include the archive commit hashes from Step 3. This produces a `chore: record journal` commit.

Final git log order on the task branch: `<work commits from 3.4>` → `chore(task): archive ...` (one or more) → `chore: record journal`.

## Step 5: Push branch and create PR

After all commits are in place on the task branch:

1. **Push the task branch to origin**:
   ```bash
   git push -u origin <current-branch>
   ```

2. **Create a PR targeting `develop`**:
   ```bash
   gh pr create --base develop --title "<PR title>" --body "<summary>"
   ```
   - PR title: use the task title or a concise summary of the work (under 70 chars).
   - PR body: brief summary of what changed + link to the task if relevant.

3. **Report to user**:
   > "PR created: <URL>. After it merges (rebase merge), sync local develop with:
   > ```
   > git checkout develop && git pull --rebase && git branch -d <branch>
   > ```"

**Rules**:
- Always push to a new branch, never directly to `develop` or `master`.
- The PR merge strategy is **rebase merge** (configured on the remote to enforce linear history).
- Do NOT auto-merge or wait for merge — just create the PR and report the URL.
- If `git push` fails (e.g., branch already exists on remote), report the error and let the user decide.

## Release merge (develop → master)

When merging `develop` into `master` for a release, use **Create a merge commit** (not squash or rebase). This ensures:
- Git correctly recognizes that `master` contains all of `develop`'s commits.
- GitHub does not show "N commits behind develop" on the master branch.
- The merge commit itself serves as a clear release marker in the history.

Steps:
1. Create a `release/vX.Y.Z` branch from `develop`, commit version bump, PR into `develop` (rebase merge).
2. After merge, create a PR from `develop` → `master`, merge with **Create a merge commit**.
3. Create tag `vX.Y.Z` from the merge commit on `master`.
4. Create a GitHub Release from the tag with release notes.
