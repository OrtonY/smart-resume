## Git Branch Policy

- `develop` is the default long-lived branch for everyday development.
- Start every new requirement from a dedicated branch created off `develop`.
- Recommended task-branch prefixes: `feature/*`, `fix/*`, `chore/*`, or `codex/*`.
- Never make a normal development commit directly on `master` or `develop`.
- Never merge locally into `develop` — push the task branch and open a PR instead.
- PRs targeting `develop` use rebase merge (linear history required).
- After PR merges, sync local develop: `git checkout develop && git pull --rebase`.
- Delete the local task branch after PR merge.
- Merge `develop` into `master` only when preparing a release.
- Never delete `develop`.
- If the current branch does not follow these rules, fix the branch setup before editing, committing, or merging.

<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
