# 合并简历编辑页面试入口

## Goal

在简历编辑页面中，将当前分开的“发起面试”和“相关面试”两个操作整合到一个按钮入口下，减少顶部操作区按钮数量，同时保持用户可以快速发起与当前简历绑定的新面试，以及查看当前简历的相关面试列表。

## What I already know

* 当前任务来自用户需求：“当前简历编辑页面的发起面试和相关面试放在一个按钮下面”。
* 简历编辑页位于 `frontend/src/pages/WorkspacePage.tsx`。
* 当前编辑页顶部操作区有两个独立入口：
* `Link to="/app/interviews?create=1&resumeId=${draft.id}"`，按钮文案为“发起面试”。
* `Link to="/app/interviews?resumeId=${draft.id}"`，按钮文案为“相关面试”。
* 同一文件中已经使用了 Ant Design `Dropdown` 组件作为“导出”按钮的菜单交互。
* 项目前端使用 TypeScript + Ant Design。

## Assumptions (temporary)

* 这次改动仅涉及简历编辑页面的顶部操作区，不调整面试中心页面逻辑。
* 这次改动不变更现有路由参数和跳转目标，只调整入口展示方式。
* 合并后的交互更适合使用一个下拉按钮承载两个动作。

## Requirements (evolving)

* 简历编辑页顶部不再同时展示两个独立的面试按钮。
* 用户仍可从同一处入口访问“发起面试”和“相关面试”两个动作。
* 两个动作继续携带当前简历 `draft.id` 作为关联参数。
* 合并后的入口采用单个“面试”下拉按钮。

## Acceptance Criteria (evolving)

* [ ] 打开任意简历编辑页时，顶部只出现一个面试入口按钮。
* [ ] 用户可从该入口触发“发起面试”，并跳转到 `/app/interviews?create=1&resumeId=<当前简历ID>`。
* [ ] 用户可从该入口触发“相关面试”，并跳转到 `/app/interviews?resumeId=<当前简历ID>`。
* [ ] 现有其他顶部操作按钮不受影响。

## Technical Approach

* 在 `ResumeEditorView` 顶部操作区复用现有 Ant Design `Dropdown` 模式。
* 以一个文案为“面试”的按钮承载菜单，菜单项包含“发起面试”和“相关面试”。
* 保持现有路由与查询参数不变，仅调整按钮组织方式。

## Decision (ADR-lite)

**Context**: 现有简历编辑页顶部操作区同时展示两个面试相关按钮，信息密度偏高，且两个动作都属于同一类入口。

**Decision**: 使用单个“面试”下拉按钮作为统一入口，菜单内提供“发起面试”和“相关面试”两个操作。

**Consequences**: 顶部操作区更精简，用户仍可完整访问原有功能；改动范围保持在前端页面展示层，不影响面试模块路由和逻辑。

## Definition of Done (team quality bar)

* 相关前端代码已更新并通过自检
* Lint / typecheck 通过
* 如有新的交互约定，任务文档已同步

## Out of Scope (explicit)

* 调整面试中心页面布局或功能
* 修改面试创建、筛选、详情页逻辑
* 新增后端接口或参数

## Technical Notes

* Inspected: `frontend/src/pages/WorkspacePage.tsx`
* Current editor actions are rendered in `ResumeEditorView`
* Existing `Dropdown` usage in the same action bar can be reused as a local interaction pattern
