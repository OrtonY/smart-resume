# brainstorm: 移动端对话公司信息精简与hidden列过滤

## Goal

优化移动端面试对话页顶部信息占位，减少公司信息按钮对对话区域的压缩；同时统一收敛所有 AI 调用传入的简历上下文，避免把 `hiddenSections` 或已隐藏模块继续传给 AI，降低无关信息干扰。

## What I already know

* 移动端面试详情顶部公司信息入口位于 `frontend/src/features/interview/components/InterviewDetailView.tsx`。
* 当前公司信息按钮同时展示了 `targetCompanyLabel`、公司名称和 `companyChipHint`，移动端样式还会主动 `flex-wrap: wrap`，导致顶部占位偏大。
* 当前移动端样式位于 `frontend/src/index.css`，其中 `.interview-detail__topbar > .ant-space` 在移动端允许换行，`.interview-company-chip` 在移动端也允许换行。
* 简历 AI 对话前端上下文由 `frontend/src/features/ai/resumeContext.ts` 的 `toAiResumeContext()` 组装，当前会完整传 `content`，并附带 `layout.hiddenSections`。
* 简历评分 `ResumeScoreButton` 也复用 `toAiResumeContext()`，因此目前同样会把 hidden 信息带给 AI。
* 简历 AI 对话后端 `backend/src/main/java/com/smartresume/ai/service/AiAgentService.java` 会直接把整个 `AiResumeContext` 序列化进 system prompt。
* 面试 AI 主对话、AI 答案、AI 评分分别在 `InterviewAiOrchestrationService` 与 `InterviewAssistService` 中组装 prompt，当前传入的是 `resume.getLayoutJson()`，其中至少包含 `hiddenSections`，而不是按“可见模块”过滤后的简历摘要。
* 面试创建时的公司信息提炼 `InterviewAiOrchestrationService.extractCompanyContextSummary()` 也会把 `resume.getLayoutJson()` 作为参考上下文传给 AI。
* 后端已有 `ResumeContentService` 可按简历 ID 加载完整内容，具备构造“仅可见模块上下文”的基础能力。

## Assumptions (temporary)

* “hidden 的列不要传入”指的是简历 layout 中标记为 hidden 的模块，不应继续出现在 AI prompt 上下文里。
* 移动端顶部优化以“不换行、可横向滑动、尽量不影响桌面端”为原则。

## Requirements (evolving)

* 移动端面试详情页的公司信息按钮去掉不必要文字，仅保留公司名称作为主要可见内容。
* 公司名称与难度信息在移动端不换行，改为可横向滑动浏览，优先释放消息区可视空间。
* hidden 模块不应继续作为 AI prompt 上下文传给简历 AI 对话。
* hidden 模块不应继续作为 AI prompt 上下文传给面试主对话。
* hidden 模块不应继续作为 AI prompt 上下文传给面试 AI 答案。
* hidden 模块不应继续作为 AI prompt 上下文传给面试 AI 评分。
* hidden 模块不应继续作为 AI prompt 上下文传给面试创建时的公司信息提炼。
* hidden 模块不应继续作为 AI prompt 上下文传给简历评分。
* AI 上下文中不再传递 `hiddenSections` 本身，避免模型被隐藏模块配置干扰。

## Acceptance Criteria (evolving)

* [ ] 移动端面试详情页顶部公司信息区域不再展示多余提示文案，默认仅展示公司名称。
* [ ] 移动端面试详情页顶部相关标签不再因为换行挤压消息区域，而是可以横向滑动查看。
* [ ] 简历 AI 对话请求体中不再包含 hidden 模块的内容。
* [ ] 简历评分请求体中不再包含 hidden 模块的内容。
* [ ] 面试主对话、AI 答案、AI 评分三条链路使用统一的“仅可见模块”简历上下文。
* [ ] 面试公司信息提炼链路也使用“仅可见模块”简历上下文。
* [ ] 面试 AI prompt 中不再包含 hidden 模块对应的简历内容或 hidden 标记本身。
* [ ] 桌面端现有顶部信息交互保持可用，不因移动端收缩方案产生明显回归。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 不改动桌面端整体信息布局，除非实现同构时必须做极小兼容调整。
* 不在本任务内重做整个面试详情页头部交互。
* 不扩展到与本次需求无关的 AI 能力或普通简历展示逻辑。

## Technical Notes

* Frontend candidate files:
  * `frontend/src/features/interview/components/InterviewDetailView.tsx`
  * `frontend/src/index.css`
  * `frontend/src/features/ai/resumeContext.ts`
  * `frontend/src/features/ai/components/AiResumeAssistant.tsx`
  * `frontend/src/features/ai/components/ResumeScoreButton.tsx`
* Backend candidate files:
  * `backend/src/main/java/com/smartresume/ai/service/AiAgentService.java`
  * `backend/src/main/java/com/smartresume/interview/service/InterviewAiOrchestrationService.java`
  * `backend/src/main/java/com/smartresume/interview/service/InterviewAssistService.java`
  * `backend/src/main/java/com/smartresume/interview/service/InterviewSessionSupportService.java`
  * `backend/src/main/java/com/smartresume/resume/service/ResumeContentService.java`
* 可能需要在前端保留一个“AI 可见简历上下文”构造函数，给简历 AI 对话和简历评分复用。
* 可能需要抽一个后端“AI 可见简历上下文”构造函数，统一给面试主对话、答案、评分复用，避免三处各自过滤。

## Technical Approach

* 前端：收窄 `InterviewDetailView` 顶部公司信息按钮文案，并在移动端为“难度 + 公司名”提供单行横向滚动容器。
* 前端：调整 `toAiResumeContext()`，按 `layout.hiddenSections` 过滤简历内容，并移除传给 AI 的 hidden 标记。
* 后端：为所有带简历上下文的面试链路构造统一的“仅可见模块简历摘要”，替代当前直接使用 `layoutJson` 的做法。
* 后端：面试主对话、公司信息提炼、AI 答案、AI 评分共用同一套过滤逻辑，确保行为一致。

## Decision (ADR-lite)

**Context**: hidden 信息泄漏不只存在于对话，还覆盖简历评分与面试创建期的 AI 提炼链路；若只修局部，后续仍会出现 prompt 不一致与体验偏差。

**Decision**: 统一覆盖所有会把简历上下文传给 AI 的入口，包括简历 AI 对话、简历评分、面试主对话、公司信息提炼、AI 答案、AI 评分，并同时移除 hidden 模块内容与 `hiddenSections`。

**Consequences**: 需要同时改动前端上下文组装与后端 prompt 构造，但可以一次消除同类偏差，避免后续在不同 AI 入口重复补漏。
