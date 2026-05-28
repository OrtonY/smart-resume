# 全局 Markdown 粗体边界兼容修复

## Goal

修复项目内所有 markdown 渲染入口在 `**...**` 粗体边界上的一致性问题：当粗体前后紧邻文本、且粗体内容以引号/中文/括号等非普通 ASCII 单词字符包裹时，当前常出现“看起来成对但不加粗”的现象。

## What I already know

* 你已确认问题不是仅面试页面，而是所有 markdown 渲染位置都可能出现。
* 当前至少存在两条 markdown 渲染链路：
  * 通用渲染链：`frontend/src/lib/markdown/MarkdownMessage.tsx`（`react-markdown` + `remark-gfm`）
  * 简历预览链：`frontend/src/features/resume/markdown/parseInlineMarkdown.ts`（`mdast-util-from-markdown` 自定义转换）
* 在本地复现到以下行为（底层解析一致）：
  * `A**q**B` 能被识别为粗体
  * `A**"q"**B` 不会被识别为粗体
  * `A**“q”**B` 不会被识别为粗体
  * `A**中**B` 不会被识别为粗体
* 单独 `**“余票查询”和“下单扣减库存”**` 往往可识别；当前后拼接文本后更容易触发失效。
* 该现象与 CommonMark 强调边界规则有关，但当前产品期望是“更符合用户直觉的粗体识别”。

## Assumptions (temporary)

* 需要引入一层“宽松兼容”逻辑，让常见中文/引号场景的 `**...**` 在前后有文本时仍可正确加粗。
* 修复以最小可控改动为原则，优先在共享层统一处理，减少多处重复补丁。

## Open Questions

* 无

## Requirements (evolving)

* 所有 markdown 渲染入口在同类输入下行为一致。
* 本次只修复 `**...**` 粗体边界兼容，不扩展到斜体等其他强调语法。
* 对 `**...**` 场景进行兼容：前后紧邻文本且内部含引号/中文/括号等时仍可按预期渲染粗体。
* 不破坏现有主要 markdown 能力（code block、inline code、link、list 等）。

## Acceptance Criteria (evolving)

* [ ] 新增失败用例稳定复现上述边界问题（至少覆盖 `A**"q"**B` / `A**“q”**B` / `A**中**B`）。
* [ ] 修复后新增用例通过，且现有 markdown 相关测试不回归。
* [ ] 在至少两条渲染链路（`MarkdownMessage` 与 `parseInlineMarkdown`）中验证行为一致。

## Definition of Done (team quality bar)

* 测试新增或更新，覆盖本次 bug
* 相关 lint / typecheck / test 命令通过
* 行为变化有最小必要说明（注释或文档）

## Out of Scope (explicit)

* 不扩展完整 markdown 语法能力
* 不改动与本次 bug 无关的 UI 样式或编辑器交互

## Technical Notes

* 关键文件：
  * `frontend/src/lib/markdown/MarkdownMessage.tsx`
  * `frontend/src/lib/markdown/completeMarkdown.ts`
  * `frontend/src/features/resume/markdown/parseInlineMarkdown.ts`
  * `frontend/src/features/resume/components/preview/InlineMarkdown.tsx`
* 现有测试基础：
  * `frontend/src/features/resume/markdown/__tests__/parseInlineMarkdown.test.ts`
* `frontend/src/lib/markdown/` 目录目前缺少针对 `MarkdownMessage` / 文本预处理的单测，可能需要新增最小测试文件。
