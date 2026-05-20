# 面试中心布局固定 + 简历编辑Markdown统一

## Goal

解决面试中心页面布局不一致问题（≤3 vs >3 卡片时搜索框和分页位置跳动），并将简历编辑器的 markdown 输入统一为 MarkdownComposer 组件（仅工具栏，无预览切换）。

## Requirements

* 面试中心采用固定布局：搜索框顶部固定、分页底部固定、卡片区域填充中间空间
* 一行（≤3）和两行（>3）卡片时，整体布局保持一致不跳动
* 面试卡片 JD 区域改为可滚动（去掉 line-clamp 截断，加 overflow-y: auto）
* 简历编辑器的 description 字段替换为 MarkdownComposer（仅工具栏，无预览切换）
* 替换覆盖所有 MarkdownLongTextArea 使用处（education/work/project/honors）

## Acceptance Criteria

* [ ] 面试中心 ≤3 和 >3 卡片时布局一致
* [ ] 搜索框固定顶部，分页固定底部，卡片区 flex-grow 填充
* [ ] JD 文字过长时卡片内可滚动查看
* [ ] 简历编辑器 description 字段有完整 markdown 工具栏（粗体、斜体、行内代码、代码块、列表、链接）
* [ ] 无编辑/预览切换（右侧实时渲染）
* [ ] Enter 不触发提交（表单字段行为）
* [ ] Lint / typecheck 通过

## Definition of Done

* Lint / typecheck / CI green
* 视觉验证：一行和两行卡片布局一致
* 简历编辑器工具栏功能正常

## Technical Approach

1. **MarkdownComposer 新增 `hidePreview` prop**：隐藏 Segmented 编辑/预览切换，始终显示编辑模式
2. **替换 MarkdownLongTextArea**：WorkspacePage 中所有 description 字段改用 `<MarkdownComposer hidePreview />`，不传 `onSubmit`（Enter 不提交）
3. **面试中心布局重构**：`.interview-center` 改为 flex column + 固定高度布局，卡片区 flex-grow
4. **卡片 JD 滚动**：`.interview-card p` 去掉 `-webkit-line-clamp` 和 `min-height`，改为固定高度 + `overflow-y: auto`

## Decision (ADR-lite)

**Context**: 简历编辑器使用简陋的 MarkdownTextArea（仅加粗），而对话组件使用功能完整的 MarkdownComposer，体验不一致。
**Decision**: 为 MarkdownComposer 添加 hidePreview 模式，复用于简历编辑器，而非新建组件。
**Consequences**: 单一组件维护，未来其他表单场景也可复用 hidePreview 模式。

## Out of Scope

* 移动端适配优化
* MarkdownComposer 其他新功能
* MarkdownTextArea 组件删除（可能其他地方还在用）

## Technical Notes

* 面试中心页面：`frontend/src/pages/InterviewPage.tsx`
* 简历编辑器：`frontend/src/pages/WorkspacePage.tsx`
* MarkdownComposer：`frontend/src/lib/markdown/MarkdownComposer.tsx`
* MarkdownTextArea：`frontend/src/features/resume/components/MarkdownTextArea.tsx`
* 全局 CSS：`frontend/src/index.css`（面试卡片样式在 ~1910 行）
* 替换点：WorkspacePage.tsx 中 4 处 MarkdownLongTextArea（education, work, project, honors）
