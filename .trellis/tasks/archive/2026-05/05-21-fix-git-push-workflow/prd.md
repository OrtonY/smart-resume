# Fix Git Push Workflow

## Goal

修复 Trellis workflow 中的 git 提交推送流程，使其兼容 GitHub 远端 `develop` 分支保护规则（要求 PR、线性历史、禁止 force push）。当前 workflow 在本地 merge 后无法 push，需要改为 push 分支 + 开 PR 的模式。

## Requirements

### 远端约束（已确认）

- `develop` 分支保护：必须通过 PR 合并
- 要求线性历史（required_linear_history = true）：禁止 merge commit
- PR 合并策略：Rebase merge（保留多 commit）
- 禁止 force push
- PR 审批数 = 0（不需要他人 approve）

### 核心规则（不变）

- 禁止直接在 `develop` 和 `master` 上开发
- 每个需求从 `develop` 创建新分支
- `develop` → `master` 仅用于 release

### 新流程

1. 在任务分支上完成代码 commit（Phase 3.4，不变）
2. 在同一任务分支上执行 archive + journal commit（`/trellis:finish-work` 改造）
3. Push 任务分支到 origin
4. 用 `gh pr create --base develop` 创建 PR
5. PR 通过 rebase merge 合并到 develop
6. 本地同步：`git checkout develop && git pull --rebase`
7. 删除本地任务分支

### 需要修改的组件

1. **workflow.md** — 更新 Phase 3.4 后续步骤 + `[workflow-state:*]` breadcrumb 中的 git branch policy 文本
2. **`.claude/commands/trellis/finish-work.md`** — 重构流程：archive + journal 在任务分支上完成，然后 push + 创建 PR
3. **`.trellis/spec/guides/git-branching-workflow.md`** — spec 文档同步更新，移除"merge 回 develop"描述，改为"push 分支 + 开 PR + rebase merge"
4. **`.claude/hooks/inject-workflow-state.py`** 中的 `GIT_BRANCH_POLICY_NOTICE` — 同步更新
5. **`.codex/hooks/inject-workflow-state.py`** 中的 `GIT_BRANCH_POLICY_NOTICE` — 同步更新
6. **`.claude/hooks/session-start.py`** 中的 `<git-branch-policy>` — 同步更新

### 不需要修改的

- `task.py` 脚本本身（archive/journal 的文件操作逻辑不变，只是不再自动 commit 到 develop）
- Phase 1/2 的 workflow 流程

## Acceptance Criteria

- [ ] 任务分支 commit 后，可以成功 push 到 origin 并创建 PR
- [ ] PR 使用 rebase merge 合并后，远端 develop 保持线性历史
- [ ] `/trellis:finish-work` 在任务分支上完成 archive + journal，然后推送 + 开 PR
- [ ] 所有 `[workflow-state:*]` breadcrumb 中的 git policy 文本一致更新
- [ ] 本地不再执行 `git merge` 到 develop（改为 PR 后 pull --rebase 同步）
- [ ] `develop` 和 `master` 上仍然禁止直接开发

## Definition of Done

- workflow.md 更新完成
- finish-work skill 更新完成
- hook 脚本中的 policy 文本更新完成
- 端到端验证：在任务分支 commit → push → 创建 PR 成功

## Out of Scope

- `task.py create-pr` 子命令实现（直接在 skill 中调用 `gh pr create`）
- GitHub Actions / CI 配置
- master 分支的 release 流程改造
- PR 自动合并（auto-merge）

## Technical Notes

- gh CLI 已认证：`gh version 2.92.0`，账户 OrtonY
- 远端：`https://github.com/OrtonY/smart-resume.git`
- 当前无 git hooks（`.git/hooks/` 只有 sample 文件）
- branch-policy 逻辑在 AI hook 层面（`inject-workflow-state.py`、`session-start.py`），不是 git hook
