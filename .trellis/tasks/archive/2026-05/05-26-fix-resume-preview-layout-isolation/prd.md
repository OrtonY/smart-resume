# fix: 统一简历预览桌面布局隔离，修复移动端分页不一致

## Goal

将简历预览组件的桌面布局隔离规则集中到 `.resume-preview` 公共祖先选择器上，消除移动端与桌面端分页切割不一致的问题，同时清理各使用场景中重复的 CSS 覆盖代码。

## What I already know

- `ResumePreview` 组件通过隐藏的 `.resume-preview--measure` 元素测量内容高度，再由 `createPagedPreviewSlices()` 按 A4 高度 (1123px) 切割分页
- 测量元素固定 `width: 794px`，但 viewport-based media query（1280px / 900px / 480px）会改变其内部模板布局（双栏→单栏、padding 变化等）
- 导致同一份简历在移动端和桌面端产生不同的内容高度 → 不同的分页位置
- PDF 导出（`.resume-export-source` / `html.resume-export-document`）和模板画廊（`.template-gallery-preview`）已有独立的桌面布局覆盖，不受影响
- 模板类（`.resume-template--split` 等）仅在 `ResumePreview` 组件内部渲染

## Requirements

- 在 `.resume-preview` 选择器下添加桌面布局隔离规则，特异性高于 media query 内的规则
- 覆盖范围包括：grid 布局、flex 方向、padding、font-size、border、avatar 尺寸等所有被 media query 修改的模板属性
- 移动端通过已有的 `transform: scale()` 缩放适配屏幕，布局本身不变
- 清理以下位置的重复覆盖代码：
  - `.resume-export-source .resume-template--*` 系列规则
  - `.template-gallery-preview .resume-template--*` 系列规则（480px 断点内）
  - `.public-share-page__card .resume-template__masthead` 相关规则
- 保留 `html.resume-export-document` 系列规则（服务端 Playwright 导出不经过 `.resume-preview` 组件）

## Acceptance Criteria

- [ ] 移动端（≤480px viewport）编辑器预览的分页位置与桌面端一致
- [ ] 移动端分享页预览的分页位置与桌面端一致
- [ ] 客户端 PDF 导出结果与预览分页一致
- [ ] 服务端 PDF 导出不受影响（`html.resume-export-document` 规则保留）
- [ ] 模板画廊预览行为不变
- [ ] 所有模板类型（classic / two-column / minimal / editorial）在移动端均正确显示桌面布局
- [ ] 无 CSS 特异性冲突或样式回归

## Definition of Done

- Lint / typecheck / CI green
- 在 Chrome DevTools 移动端模拟器中验证编辑器预览和分享页预览分页一致性
- 确认 PDF 导出功能正常

## Decision (ADR-lite)

**Context**: 移动端预览需要在视觉和分页上与桌面端保持一致
**Decision**: 方案 1 — 始终显示桌面布局（缩放适配）。移动端看到缩小版的桌面双栏布局，与 PDF 输出完全一致。
**Consequences**: 移动端用户看到的预览与最终 PDF 完全一致，无视觉割裂；代价是小屏上文字较小，但简历预览本身就是"所见即所得"的展示，用户预期如此。

## Out of Scope

- 不改变分页算法本身（`previewPagination.ts`）
- 不引入 CSS container query（改动范围过大）
- 不修改 `ResumePreview` 组件的 React 逻辑

## Technical Approach

在 `index.css` 中添加一组以 `.resume-preview` 为前缀的选择器，强制模板始终使用桌面布局。利用 CSS 特异性（0,2,0 > 0,1,0）自然覆盖 media query 内的规则。然后删除各场景中已不再需要的重复覆盖。

### 需要覆盖的属性清单（从现有 `.resume-export-source` 规则提取）：

1. `.resume-template--split` → `grid-template-columns`
2. `.resume-template__editorial-grid` → `grid-template-columns`
3. `.resume-template__hero:not(.resume-template__hero--compact)` → `grid-template-columns`
4. `.resume-template__masthead` / `--minimal` → `flex-direction: row`
5. `.resume-template__hero-identity-row` → `flex-direction: row`
6. `.resume-template__masthead-aside` → `justify-items: end; min-width: 240px`
7. `.resume-template__sidebar` / `__notes-column` → padding + border + background
8. `.resume-template__masthead` → padding
9. `.resume-template__masthead--classic` → padding
10. `.resume-template__hero` → padding
11. `.resume-template__main` / `__content-column` → padding
12. `.resume-template__avatar` → width: 112px
13. `.resume-template__section-title` → font-size: 18px
14. `.resume-template__identity h1` → font-size: 38px
15. `.resume-template__identity--dense h1` → font-size: 40px

## Technical Notes

- 关键文件：`frontend/src/index.css`
- 受影响的 media query 断点：1280px、900px、480px
- `.resume-preview--measure` 和 `.resume-preview--page` 都在 `.resume-preview` article 元素上
- `useResumePreviewMetrics.ts` 中的 scale 计算逻辑无需修改
