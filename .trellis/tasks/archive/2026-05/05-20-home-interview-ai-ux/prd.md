# 首页和面试对话体验优化

## Goal

优化 AI 配置入口、面试结束后的离开路径、面试报告布局，以及简历/面试对话的发送快捷键行为，让用户在首页、简历编辑、面试对话和报告查看流程中不会被卡住，也不会误触发发送。

## What I already know

* 用户希望把 AI 配置从简历编辑页移动到首页。
* 用户希望面试结束后提示“等待报告生成”并自动返回面试页面；如果面试已经结束，在面试对话界面增加返回按钮，避免用户无法离开。
* 用户希望面试报告里的“亮点”和“改进建议”改为纵向排布。
* 用户希望简历 AI 对话只在手动点击发送按钮时发送，Enter 用于换行；同样需要检查面试对话是否也是这个逻辑。
* 首页/工作区在 `frontend/src/pages/WorkspacePage.tsx`，当前 hero actions 中有模板目录、面试中心、回收桶、锁定工作区。
* AI 配置按钮和弹窗定义在 `frontend/src/features/ai/components/AiResumeAssistant.tsx`，当前由 `WorkspacePage.tsx` 引入并用于简历编辑页面。
* 简历 AI 对话和面试对话都使用 `frontend/src/lib/markdown/MarkdownComposer.tsx`；当前共享组件在 `onPressEnter` 中执行 `onSubmit`，也就是 Enter 会发送、Shift+Enter 才换行。
* 面试详情页在 `frontend/src/pages/InterviewPage.tsx`，当前暂停后会回到 `/app/interviews`，结束后只刷新详情并提示“面试已结束”，没有自动返回列表。
* 面试详情页顶部已有返回列表按钮，但结束后输入区会 disabled；需要确认要新增的“返回”按钮是结束状态的底部/禁用区域提示，还是强化顶部按钮。
* 面试报告组件在 `frontend/src/features/interview/components/InterviewReportPanel.tsx`；亮点和改进建议当前使用 `report-two-col` 横向两列布局。

## Assumptions (temporary)

* “首页”指登录后的 `/app` 工作区首页，而不是未登录/解锁页。
* AI 配置入口从简历编辑页移除后，首页仍能打开同一个 `AiConfigurationModal`，不改变后端配置接口。
* “自动返回面试页面”指从具体面试详情页返回面试中心列表页 `/app/interviews`，并给出报告生成中的提示。
* 对话发送行为改为所有使用 `MarkdownComposer` 的聊天输入默认 Enter 换行、只通过发送按钮提交。

## Open Questions

* None.

## Requirements (evolving)

* 在 `/app` 首页展示 AI 配置入口。
* 简历编辑页面不再展示 AI 配置入口，但保留简历 AI 悬浮助手。
* 结束面试成功后提示报告正在生成/请稍后查看，并自动返回面试中心列表。
* 打开已暂停的面试详情时，自动继续面试并进入可回答状态，不需要用户手动点击继续。
* 面试处于结束状态时，面试对话界面右侧操作按钮组最末尾提供明确的返回入口，避免用户停留在禁用输入区后找不到离开方式。
* 面试报告“亮点”和“改进建议”纵向排布，而不是左右两列。
* 简历 AI 对话输入框按 Enter 换行，不发送；点击发送按钮才发送。
* 面试对话输入框也按 Enter 换行，不发送；点击发送回答按钮才发送。

## Acceptance Criteria (evolving)

* [ ] 首页能打开并保存 AI 配置。
* [ ] 简历编辑页没有 AI 配置按钮，简历 AI 助手仍可使用。
* [ ] 点击结束面试并成功后，用户看到报告生成等待提示，并被带回 `/app/interviews`。
* [ ] 从面试中心进入已暂停面试详情时，页面自动恢复为继续面试状态。
* [ ] 打开已结束的面试详情时，右侧操作按钮组最末尾有明确“返回面试中心”的按钮。
* [ ] 报告中的亮点列表显示在改进建议列表上方或下方，整体为纵向布局。
* [ ] 简历 AI 对话中 Enter 插入换行，点击发送按钮才发消息。
* [ ] 面试对话中 Enter 插入换行，点击发送回答按钮才发消息。
* [ ] lint / typecheck 通过。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / CI green.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* 不改后端 AI 配置存储和配置字段。
* 不改 AI 对话和面试对话的流式接口协议。
* 不重设计面试报告整体结构，只调整亮点/改进建议区域。
* 不调整未登录解锁页或首次设置页。

## Technical Notes

* `frontend/src/pages/WorkspacePage.tsx` - 首页和简历编辑页都在此页面组件中分支渲染，AI 配置入口需要从编辑分支迁移到首页 hero actions。
* `frontend/src/features/ai/components/AiResumeAssistant.tsx` - `AiConfigurationButton` 和 `AiConfigurationModal` 已封装，可复用到首页。
* `frontend/src/lib/markdown/MarkdownComposer.tsx` - 当前 `onPressEnter` 会在未按 Shift 时触发 `onSubmit`，需调整或增加可控配置，使聊天输入满足“只点击发送”。
* `frontend/src/pages/InterviewPage.tsx` - `onEnd` 当前调用 `endInterview` 后只刷新 detail；可在成功后追加报告生成提示和 `navigate('/app/interviews')`。
* `frontend/src/features/interview/components/InterviewReportPanel.tsx` - `StrengthsAndImprovements` 当前使用 `report-two-col`，改为纵向容器即可；报告生成事件流不能使用相对路径原生 `EventSource`，否则 dev 环境会请求 Vite 的 `localhost:5173/api/...` 并返回 404。
* `frontend/src/lib/sse/streamEvents.ts` - 受保护的 SSE 需要通过 fetch helper 走后端 API base URL 并附带 `X-Access-Token`。
* `frontend/src/App.css` - 需要检查相关 class 是否已有布局样式，必要时补充首页 action、报告列表和结束状态返回区样式。

## Decision (ADR-lite)

**Context**: 面试结束后用户需要知道报告正在生成，同时避免停留在对话详情页的禁用输入区。

**Decision**: 使用轻量消息提示“报告正在生成，请稍后查看”，结束成功后自动返回 `/app/interviews`。

**Consequences**: 流程更快且实现简单；用户如果想查看报告，需要从面试中心重新进入或稍后打开报告。
