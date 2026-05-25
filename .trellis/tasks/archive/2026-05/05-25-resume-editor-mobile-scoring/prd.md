# fix resume editor mobile and scoring parity

## Goal

修复简历编辑页与 AI 评分相关的前端体验问题，确保网页端简历评分与面试评分展示风格保持一致，并解决真实手机环境下简历预览缩放、内容页横向溢出、AI 对话发送失效的问题。

## Requirements

* 网页端简历评分结果的核心视觉效果与面试评分保持一致，至少包括分数展示区的结构与移动端适配表现一致。
* 移动端简历编辑页中，点击进入标准 A4 预览后，不再出现被额外压缩、只显示约一半尺寸的问题。
* 移动端简历编辑页切换到内容页时，不同分辨率下都不应再出现轻微横向溢出导致页面可左右拖动。
* 真实手机浏览器中，简历编辑页 AI 对话点击发送后应能正常发起会话并显示流式回复。

## Acceptance Criteria

* [ ] 简历评分展示区的分数视觉与面试评分展示采用统一或等价的 UI 表达，不再保留明显不一致的分数主视觉。
* [ ] 手机模式下打开简历预览弹层时，A4 预览只进行一次缩放计算，页面宽高比例正常。
* [ ] 手机模式下切换 `content` 页签，不同窄屏宽度下页面主体无额外横向滚动。
* [ ] 手机浏览器点击 AI 对话发送按钮后，前端不会因为本地 id 生成或触摸兼容问题中断发送流程。
* [ ] 相关改动通过最小必要的前端校验。

## Definition of Done

* 前端代码修改保持现有风格，尽量局部修复。
* 至少完成与本次改动相关的构建、lint 或类型校验中的最小必要验证。
* 若本次修复沉淀出新的前端移动端约束或模式，评估是否更新 Trellis spec。

## Technical Approach

* 评分一致性：复用或对齐面试评分的 score badge/overview 展示模式，优先保持数据结构不变，仅调整渲染与样式。
* A4 预览缩放：检查 `ResumePreview` 内部 `scale` 计算与移动端 CSS `transform: scale(...)` 的重复缩放，统一为单一来源。
* 横向溢出：排查移动端 `resume-editor` 容器、tabs、preview/content 宽度以及 `100vw` 计算带来的溢出，改为与容器宽度绑定的计算方式并补足 `min-width: 0` / `overflow-x` 约束。
* AI 发送：修复真实手机环境下不稳定的消息 id 生成或移动端点击兼容性问题，优先避免对后端协议做变更。

## Decision (ADR-lite)

**Context**: 这次问题集中在移动端真实设备表现与桌面模拟器不一致，且已有代码中存在基于 viewport 的样式缩放与浏览器能力假设。  
**Decision**: 采用最小侵入修复，优先统一前端缩放来源、容器宽度计算和浏览器兼容性兜底，而不改动接口契约。  
**Consequences**: 可以快速修复当前问题并降低不同分辨率/不同手机浏览器的风险，但后续若继续扩展预览能力，可能需要把缩放逻辑进一步抽成可复用方案。

## Out of Scope

* 不重做整个简历编辑页布局。
* 不调整 AI 聊天后端接口协议或评分算法。
* 不新增新的模板系统或预览模式。

## Technical Notes

* 已定位相关文件：
  * `frontend/src/features/ai/components/ResumeScoreButton.tsx`
  * `frontend/src/features/interview/components/AiAnswerModal.tsx`
  * `frontend/src/features/ai/components/AiResumeAssistant.tsx`
  * `frontend/src/features/resume/components/ResumePreview.tsx`
  * `frontend/src/pages/WorkspacePage.tsx`
  * `frontend/src/index.css`
* 已发现线索：
  * 移动端预览存在组件内 `previewMetrics.scale` 与 CSS `transform: scale(calc((100vw - 48px) / 794))` 并存，疑似双重缩放。
  * `AiResumeAssistant` 发送前直接使用 `crypto.randomUUID()`，真实手机通过局域网 `http` 访问时可能缺失安全上下文能力。
