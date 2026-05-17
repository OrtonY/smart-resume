# 简历段内局部格式（粗体 / 斜体）

## Goal

让用户在简历多行内容字段里对**部分文字**应用粗体 / 斜体（突出关键成就、产品名、数字等），并在 Web 预览 / 公开分享页 / DOCX 导出 / PDF 导出**四端一致**渲染。模板级字体 / 字号 / 字重调整作为独立后续任务。

## Confirmed decisions

1. **范围**：段内局部格式（bold / italic）。模板级字体 / 字号 / 字重调整不在本期内
2. **目标字段**：5 个多行 description 字段：
   - `personalSummary`
   - `education[].description`
   - `workExperience[].description`
   - `projectExperience[].description`
   - `honors[].description`
   单行字段（personalInfo、school / company / role / name / title / issuer 等）一律不解析 markdown，原样输出
3. **存储格式**：字段保持 `string`，不引入新类型；约定 `**粗体**` / `*斜体*` 语法
4. **编辑器交互**：浮动工具栏 —— 选中文字弹出 B / I 按钮，点击自动包裹标记。标记仍以原文形式 (`**`、`*`) 可见
5. **解析器**：micromark / mdast 路线 —— 用 mdast AST 节点表示文档，三端各自实现 AST 遍历器（Web → React 节点；DOCX → `TextRun[]`；PDF → 对应文本片段）。仅启用 bold / italic 两个语法扩展，链接 / 图片 / HTML / 列表 / 标题等显式禁用
6. **编辑器组件**：抽出新组件 `MarkdownTextArea` 包装 antd `Input.TextArea`，内部自管浮动工具栏 + 选区监听 + 包裹 `**` / `*` 标记的逻辑。5 个白名单字段统一替换为该组件
7. **旧数据兼容**：直接当 markdown 解析。旧简历里若已有字面 `**...**` 会被识别为加粗（绝大多数用户当年敲 `**` 就是想要加粗）。极少数想显示字面星号的用户可用 `\*\*` / `\*` 转义
8. **公开分享页**：`PublicSharePage.tsx` 第 109 行已复用 `ResumePreview` 组件（`pages/PublicSharePage.tsx:5,109`），分享页**天然继承** markdown 解析，无需单独改分享页

## What I already know (from repo inspection)

- 简历内容字段当前类型为纯 `string`（`frontend/src/features/resume/types.ts`），无格式信息
- 编辑器使用 antd `Input.TextArea`（多处在 `WorkspacePage.tsx`）
- Web 预览：`ResumePreview.tsx` 是单一渲染源；分享页（`PublicSharePage.tsx:109`）也走它
- DOCX 导出现状：`new TextRun({ text, bold: true })` 是**整段**加粗（`docxExport.ts`），不支持段内局部
- PDF 导出存在（`pdfExport.ts`），需 inspect 当前文本渲染方式
- 后端 `content_json` 是 text 列（`V1__init_schema.sql:23`），无 schema 约束 —— 字段从纯 string 改为带格式标记的 string 不需要数据库迁移
- 模板 token 系统已具可视化编辑能力（PR1 留下的 spec 在 `.trellis/spec/frontend/state-management.md`），与本任务架构无冲突

## Requirements

- **解析层**：新建 `frontend/src/features/resume/markdown/` 目录，封装 micromark / mdast 解析逻辑
  - 入口函数 `parseInlineMarkdown(text: string): InlineNode[]`，输出归一化的内联节点数组
  - 内联节点类型 `InlineNode = { type: 'text' | 'bold' | 'italic'; text: string; children?: InlineNode[] }`
  - 仅启用 bold (`**...**`) 和 italic (`*...*`) 两个 mdast 节点；HTML / 链接 / 图片 / 代码块 / 列表 / 标题统一降级为纯文本
  - 段落内换行（`\n`）保留为 text 节点的换行符；段落间换行交给消费层处理
- **Web 渲染**：在 `ResumePreview.tsx` 里新增渲染函数 `renderInlineMarkdown(text)`，输出 React 节点（`<strong>` / `<em>` / 文本）。所有 5 个白名单字段经此函数渲染
- **DOCX 渲染**：在 `docxExport.ts` 里新增辅助 `inlineMarkdownToTextRuns(text, baseStyle)`，把 mdast 节点映射为 `TextRun({ text, bold, italics, ...baseStyle })` 数组。原本"整段加粗"的几处保留，新增的"段内局部加粗"通过该辅助实现
- **PDF 渲染**：根据 `pdfExport.ts` 现状选最小侵入路径（实施期 inspect 后定）
- **编辑器**：新建 `frontend/src/features/resume/components/MarkdownTextArea.tsx`
  - props 与 antd `Input.TextArea` 兼容（value / onChange / placeholder / autoSize 等）
  - 内部监听 selection；选中非空文本时在 textarea 旁渲染浮动工具栏（B / I 两个按钮）
  - 点击 B / I 时把当前选区文本替换为 `**...**` / `*...*`，光标位置保持在标记内侧
  - 已被 `**` / `*` 包裹时再次点击则解除包裹（toggle 行为）
- **白名单替换**：`WorkspacePage.tsx` 的 5 个白名单字段从 `Input.TextArea` 替换为 `MarkdownTextArea`
- **AI 助手**：现有 AI prompt 不感知 markdown，生成纯文本依然可用。本期不做 prompt 改造
- **XSS 边界**：mdast 关闭 HTML pass-through；React 渲染走文本节点（自动转义）；DOCX/PDF 也是文本片段拼装。无需额外 sanitization

## Acceptance Criteria

- [ ] 在工作描述里把"销售额提升 30%"通过浮动工具栏标为粗体，预览显示加粗
- [ ] 同一段同时存在 bold 和 italic 文字，Web 预览 / 公开分享页 / DOCX / PDF 四端渲染一致
- [ ] 嵌套 `***bold-italic***` 同时识别为 bold + italic
- [ ] `\*\*literal\*\*` 转义后渲染为字面 `**literal**`，不被识别为加粗
- [ ] 旧简历无 markdown 标记的纯文本打开正常，渲染无差异
- [ ] 旧简历里如已有字面 `**重点**`，上线后会被识别为加粗（已在 PRD 中说明，作为预期行为而非 bug）
- [ ] 单行字段（fullName / headline / school / company 等）原样输出，输入 `**foo**` 不会被解析
- [ ] 工具栏只在选区非空时显示；点击 B / I 后再次点击会 toggle 解除
- [ ] HTML 标签 / 链接语法 / 列表 / 标题等其他 markdown 语法**不**被识别，原样输出
- [ ] 前端 lint / typecheck / build 通过
- [ ] 单元测试覆盖：`parseInlineMarkdown` 对常见输入的输出契约（纯文本、单 bold、单 italic、bold-italic 嵌套、转义、HTML 注入尝试）

## Definition of Done

- 4 端（Web 预览 / 公开分享页 / DOCX / PDF）行为一致
- `MarkdownTextArea` 组件可独立测试，5 处复用同一份逻辑
- 解析器有单元测试覆盖 XSS / 边界 / 转义场景
- 旧数据兼容性：所有现有简历打开无报错
- 前端 lint / typecheck / build 全绿
- spec 更新：把"段内 markdown 解析的字段白名单"约定写入 `.trellis/spec/frontend/state-management.md`，与 PR1 留下的"resume content field addition"形成姊妹规则

## Out of Scope

- 模板级字体 / 字号 / 字重调整（独立后续任务）
- 下划线 / 删除线 / 颜色标记（按需后续扩展）
- 复制粘贴外部富文本格式保留（用户从 Word / 网页复制带样式文字时只取纯文本）
- 列表（项目符号 / 编号）
- 链接 / 图片
- 标题层级（`#` / `##`）
- AI 助手生成 markdown 标记
- 用户帮助文档 / 教程页（仅在 placeholder 或 hint 里写一句"支持 \*\*粗体\*\* 和 \*斜体\*"）
- 国际化（英文版 placeholder）

## Technical Approach

**目录结构**

```
frontend/src/features/resume/
├── markdown/                    # 新增
│   ├── parseInlineMarkdown.ts  # micromark / mdast 解析入口
│   ├── types.ts                # InlineNode 等类型定义
│   └── __tests__/
│       └── parseInlineMarkdown.test.ts
├── components/
│   └── MarkdownTextArea.tsx    # 新增：编辑器组件
├── components/ResumePreview.tsx # 修改：新增 renderInlineMarkdown
└── export/
    ├── docxExport.ts            # 修改：新增 inlineMarkdownToTextRuns
    └── pdfExport.ts             # 修改：按现状最小侵入
```

**关键依赖（待研究确认）**

- `micromark` + `mdast-util-from-markdown`（核心解析）
- 需要禁用扩展：链接、图片、HTML、代码块、列表、标题
- 实施期写一段研究记录到 `research/micromark-config.md`，确认最小启用配置

**伪代码：parseInlineMarkdown**

```ts
import { fromMarkdown } from 'mdast-util-from-markdown'

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }

export function parseInlineMarkdown(input: string): InlineNode[] {
  // fromMarkdown(input, { extensions: [], mdastExtensions: [] })
  // 仅遍历 paragraph -> text / strong / emphasis
  // 其他节点降级为 text
}
```

**伪代码：MarkdownTextArea 选区监听**

```ts
function MarkdownTextArea(props) {
  const ref = useRef<TextAreaRef>(null)
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null)

  // 监听 select event；selectionStart !== selectionEnd 时计算工具栏位置
  // 点击 B：取 [selectionStart, selectionEnd] 子串，包裹 ** ... **
  // 若已被 ** 包裹则解除
  // onChange 触发 props.onChange，与 antd Input.TextArea 等价
}
```

## Decision (ADR-lite)

**Context**: 用户希望在简历正文里对部分文字加粗 / 斜体，突出关键内容；要求 Web / 分享 / DOCX / PDF 四端一致。

**Decision**: 走 markdown 子集 + mdast 解析路线，不引入富文本编辑器，字段类型保持 `string`。

**Consequences**:
- 旧数据零迁移，新功能向后兼容
- 编辑器复杂度低（仍是 TextArea + 浮动工具栏），开发成本可控
- 三端 + 分享页统一走解析器，行为一致性强
- 用户能看到原始 `**` 标记（trade-off：换来零迁移和最低复杂度）
- 未来若想加链接 / 列表 / 标题，可在解析器扩展，编辑器加按钮，路径平滑

## Implementation Plan (small PRs / steps)

由于本任务相对聚焦、依赖明确，可在一个 PR 内完成；但实施时按以下顺序推进，每步完成后跑 lint / typecheck：

1. **Step 1：解析器**
   - 引入 `mdast-util-from-markdown` 等依赖
   - 实现 `parseInlineMarkdown` + 单元测试（覆盖 bold / italic / 嵌套 / 转义 / HTML 注入 / 列表降级）

2. **Step 2：Web 渲染**
   - `ResumePreview.tsx` 加 `renderInlineMarkdown` 函数
   - 5 个白名单字段渲染处替换为 `renderInlineMarkdown(value)`
   - 验证分享页（直接复用 `ResumePreview`）也正常

3. **Step 3：DOCX 渲染**
   - `docxExport.ts` 加 `inlineMarkdownToTextRuns(text, baseStyle)`
   - 5 个白名单字段处的 `TextRun` 拼装改用该函数

4. **Step 4：PDF 渲染**
   - inspect `pdfExport.ts` 现状，选最小侵入路径

5. **Step 5：MarkdownTextArea 组件**
   - 实现组件 + 浮动工具栏 + B / I toggle 逻辑
   - `WorkspacePage.tsx` 的 5 个白名单字段统一替换

6. **Step 6：spec 更新**
   - 在 `.trellis/spec/frontend/state-management.md` 加场景"Inline Markdown for Resume Description Fields"，记录字段白名单 + 解析器契约 + 四端一致性要求

## Technical Notes

- 关键文件：
  - `frontend/src/features/resume/types.ts` — 字段类型定义（不修改，但要确认 5 个白名单字段都是 `description: string`）
  - `frontend/src/features/resume/components/ResumePreview.tsx` — Web 渲染主入口（分享页也走它）
  - `frontend/src/features/resume/export/docxExport.ts` — DOCX TextRun 拼装
  - `frontend/src/features/resume/export/pdfExport.ts` — PDF 渲染（实施期 inspect）
  - `frontend/src/pages/WorkspacePage.tsx` — TextArea 编辑器位置（5 处替换）
  - `frontend/src/pages/PublicSharePage.tsx:109` — 已复用 ResumePreview，无需修改
- PR1（年龄字段）已上线、已归档；本任务在其上推进
- PR1 的 spec "resume content field addition" 关注的是**新增字段**的三处消费一致性；本任务关注的是**字段内容渲染规则**的四处消费一致性，两者互补
- 模板 token 字体 / 字号调整作为后续独立任务，可与本任务并行设计、不冲突
