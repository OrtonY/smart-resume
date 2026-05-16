# 简历预览分页空白优化

## Goal

优化简历预览的分页计算逻辑，当大块内容（如项目经历）卡在分页位置时，允许内容在页面间拆分，而非整块移到下一页导致上一页出现大量空白。

## What I already know

* 分页核心算法在 `ResumePreview.tsx:278-333` 的 `createPagedPreviewSlices` 函数
* 当前分页粒度是 section 级别（`data-preview-page-item` 只标记在 `<section>` 上）
* 每个 section 内的 entry（如单个项目）没有被标记为独立的 page item
* 当 section 整体超出当前页剩余空间但能放入一整页时，整个 section 被推到下一页
* 当 section 超过一整页高度时，算法直接裁剪，没有智能拆分
* 大文本（项目亮点等）被包裹在单个 `<p>` 或 `<article>` 中，前端无法直接按行拆分

## Assumptions (temporary)

* PDF 导出也需要同步适配新的分页逻辑

## Open Questions

* (none)

## Requirements

* 分页粒度从 section 级别细化到 entry/fragment 级别
* section 标题应与第一个 entry 保持在同一页（keep-with-next 语义）
* **贪心填充策略**：尽量填满当前页（尤其第一页）的信息密度，不设容量阈值；在最接近页面底部的可用断点（entry 边界 → fragment 边界）处分页；若单个 entry/fragment 整体超过当前页剩余空间，则整体推到下一页
* 第二页起保留顶部留白（沿用 `continuationTopSpacing = 56px`），保证观感

## Acceptance Criteria

* [ ] 多 entry 的 section 可以在 entry 之间分页
* [ ] section 标题不会单独出现在页面底部（至少与一个 entry 同页）
* [ ] 含 fragment 标记的大 entry 可以在 fragment 之间分页
* [ ] 第一页内容尽量贴近页面底部（贪心填充）
* [ ] 第二页起仍保留 56px 顶部间距
* [ ] PDF 导出与预览分页一致（PDF 直接消费分页结果，无需改动）

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Decision (ADR-lite)

**Context**: 分页算法需要支持多层级断点，既要保持小 section 的处理简洁，又要支持大 section 内部拆分。

**Decision**: 采用嵌套 page-item 体系。section 标记为 `data-preview-page-item="section"`，内部 entry 标记为 `data-preview-page-item-child`。算法在发现 section 跨页时，进入内部查找 child 断点。对于超大 entry（>70% 页面容量），再通过 `data-preview-page-item-fragment` 标记段落级断点实现内部拆分。

**Consequences**: 算法主循环保持简洁，只在需要时深入查找；扩展性好，未来可以加更细粒度的 fragment 标记。

## Out of Scope

* 单行文本级别的拆分（CSS word-break 级别）
* 表格类内容的跨页拆分
* 自定义分页断点的用户配置 UI

## Technical Notes

* 核心文件: `frontend/src/features/resume/components/ResumePreview.tsx`
* 分页算法: `createPagedPreviewSlices` (line 278-333)
* 测量函数: `readMeasuredPageItems` (line 254-276)
* Section 渲染: `PreviewSection` (line 641-673), `TimelineSection` (line 580-611)
* CSS: `frontend/src/index.css` (line 710-860)
* PDF 导出: `frontend/src/features/resume/export/pdfExport.ts`
