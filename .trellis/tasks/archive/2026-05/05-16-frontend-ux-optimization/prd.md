# 前端编辑页 UX 优化（拖拽排序 / 工具栏合并 / AI 对话改版）

## Goal

提升简历编辑页 3 项核心交互的效率：
1. 简历结构模块顺序调整改为拖拽（替代上下按钮，效率更高）。
2. 编辑器顶部工具栏的 2 套分享 + 2 套导出按钮收束为「分享」「导出」两个单一入口。
3. AI 对话默认进入新对话；历史记录与新建按钮置顶，用户主动点历史才回到既有会话。

## What I already know

- 项目栈：React 19 + Vite + antd 6 + React Router 7（`frontend/package.json`），未安装任何拖拽库。
- 模块顺序数据模型：`ResumeLayout.sectionOrder: ResumeSectionKey[]`（`frontend/src/features/resume/types.ts:67-84`），固定 7 项 + 个人信息常驻顶部。
- 现状排序入口：`WorkspacePage.tsx:425-439` 的 `moveSection(direction: -1|1)`；UI 重复出现在左侧"简历结构"栏（`:1224-1245`）和右侧 Collapse extra（`:1284-1303`）。
- 个人信息（`personal-info`）模块标记 `removable: false`，固定在最前，不参与排序。
- 工具栏（`WorkspacePage.tsx:1150-1180`）目前 7 项：修改模板 / AI 配置 / 分享最新版 / 分享快照 / 导出 PDF / 导出 DOCX / 锁定。
- 分享接口 `createShare(resumeId, mode: 'LATEST' | 'SNAPSHOT')`（`WorkspacePage.tsx:389-397`）已支持两种模式，差异在调用参数。
- 导出 PDF 走 DOM 截图（`exportResumePdf(previewRoot, title)`），DOCX 走结构化生成（`exportResumeDocx(draft, template)`），共享一个 `exportingFormat` 锁。
- AI 对话打开后自动选中 `items[0]?.conversationId ?? null`（`AiResumeAssistant.tsx:67-72`），导致"每次打开都是续聊最近一次"，与用户期望相反。
- 已有 `startNewChat()`（`AiResumeAssistant.tsx:178-184`）和 `setSelectedConversationId(null)` 表示新会话；后端在 stream 第一条事件返回 `conversationId` 后再绑定（`:152-154`）。
- AI 模态框现为左右分栏：左侧 Sidebar = "New chat" 按钮 + 历史 List，右侧 = 消息流 + 输入框。

## Assumptions (temporary)

- 用户希望保留既有数据模型与 API 不变，仅前端 UI 重构。
- 拖拽要支持键盘可达性（accessibility）不是 MVP 的硬要求，但不希望引入只支持鼠标的脆弱实现。
- "锁定 / 修改模板 / AI 配置"三个按钮不在本次精简范围。

## Open Questions

（已全部解决）

## Requirements

### R1 拖拽排序（左侧结构栏）
- 使用 `@dnd-kit/core` + `@dnd-kit/sortable` 实现。
- 拖拽列表仅包含 `sectionOrder` 中的可移动模块（`removable: true` 的 7 项）。
- `personal-info` 固定在列表顶部，不渲染拖拽手柄，不参与排序。
- 隐藏模块仍参与拖拽排序（隐藏只影响预览渲染）。
- 松手后立即更新 `layout.sectionOrder`，触发现有 900 ms 防抖自动保存。
- 右侧 Collapse extra 区域去掉上下箭头按钮，仅保留隐藏/显示切换按钮。
- 删除 `moveSection` 函数及其 props 传递。

### R2 工具栏合并（Dropdown）
- "分享"按钮：antd `Dropdown` + `items`，菜单项为"分享最新版"和"分享快照"，点击分别调用 `handleCreateShare('LATEST')` / `handleCreateShare('SNAPSHOT')`。
- "导出"按钮：antd `Dropdown` + `items`，菜单项为"导出 PDF"和"导出 DOCX"。`exportingFormat` 非空时整个按钮 `loading + disabled`。
- 保留：修改模板、AI 配置、锁定按钮不变。

### R3 AI 对话改版（去 Sidebar，顶部 Tab）
- 去掉左侧 `ai-chat-sidebar`，模态框改为单栏布局。
- 模态框顶部放两个切换入口："新对话"（默认激活）和"历史记录"。
- 每次打开模态框（`open` 从 false → true）：重置为新对话状态（`selectedConversationId = null`，`messages = []`）。
- 点"历史记录"时，下方切换为会话列表（复用现有 `conversations` 数据 + `listAiChatConversations`）。
- 选中历史会话后，自动切回对话视图并加载该会话消息。
- streaming 中禁止切换历史（沿用现有 `streaming` 守卫）。

## Acceptance Criteria

- [ ] AC1: 左侧结构栏可通过鼠标拖拽改变模块顺序，松手后右侧预览同步更新，900 ms 后自动保存。
- [ ] AC2: `personal-info` 模块固定在顶部，无拖拽手柄，不可被拖动或被其他模块越过。
- [ ] AC3: 右侧 Collapse extra 不再显示上下箭头，仅保留隐藏/显示按钮。
- [ ] AC4: 工具栏"分享"按钮点击弹出 Dropdown，可选"最新版"或"快照"，功能与原按钮一致。
- [ ] AC5: 工具栏"导出"按钮点击弹出 Dropdown，可选"PDF"或"DOCX"；导出中按钮 loading。
- [ ] AC6: 点击 AI 浮球打开模态框时，默认为空白新对话（无消息、无选中会话）。
- [ ] AC7: 模态框顶部可见"新对话"和"历史记录"两个切换入口。
- [ ] AC8: 点"历史记录"显示会话列表，选中后加载消息并可继续对话。
- [ ] AC9: 关闭模态框再打开，仍默认新对话（不记忆上次选中）。

## Definition of Done

- 拖拽 / 合并按钮 / AI 改版三个改动都在浏览器中肉眼验证，预览与自动保存正常。
- TypeScript 编译通过（`npm run build` 完成 `tsc -b`）；ESLint 无新增错误。
- 不破坏现有的"上下按钮快捷键"以外的其他功能（如隐藏切换、复制分享、Modal 预览）。
- 沿用现有中文 UI copy 风格。

## Decision (ADR-lite)

**Context**: 编辑页有三处 UX 痛点——模块排序效率低、工具栏按钮过多、AI 对话默认行为不符合预期。

**Decision**:
1. 拖拽：`@dnd-kit` + 仅左侧结构栏，右侧 Collapse 去掉上下箭头。
2. 工具栏：antd `Dropdown` 菜单合并分享和导出。
3. AI 对话：去掉左侧 Sidebar，改为顶部"新对话/历史记录"Tab 切换，每次打开默认新对话。

**Consequences**:
- 新增 `@dnd-kit/core` + `@dnd-kit/sortable` 两个依赖（~15 KB gzip）。
- 右侧 Collapse 不再提供排序快捷操作，用户需切到左侧栏拖拽。
- AI 对话模态框宽度可适当缩窄（不再需要侧栏空间）。

## Technical Approach

### 文件变更清单

| 文件 | 变更 |
|------|------|
| `frontend/package.json` | 新增 `@dnd-kit/core`、`@dnd-kit/sortable` |
| `frontend/src/pages/WorkspacePage.tsx` | 左侧栏改为 DndContext + SortableContext；删除 `moveSection` + 上下箭头；工具栏改 Dropdown |
| `frontend/src/features/ai/components/AiResumeAssistant.tsx` | 去 Sidebar，加顶部 Tab，改默认选中逻辑 |
| CSS（待定位） | 删除 `ai-chat-sidebar` 样式，新增 `ai-chat-tabs` 样式；调整 `resume-editor-module-row` 加拖拽手柄 |

### 实施顺序（3 个独立 PR 或 1 个合并 PR）

1. **PR1: 拖拽排序** — 安装 @dnd-kit，改造左侧栏为可拖拽列表，删除右侧 Collapse 的上下箭头，删除 `moveSection`。
2. **PR2: 工具栏合并** — 分享和导出各改为 Dropdown 按钮。
3. **PR3: AI 对话改版** — 去 Sidebar，加顶部 Tab，改默认行为。

三个改动互不依赖，可并行开发或合为一个 PR。

## Out of Scope (explicit)

- 后端契约调整、AI 接口变更。
- "修改模板""AI 配置""锁定"按钮的视觉合并。
- 拖拽对触屏/键盘可达性的完整支持（先做鼠标，后续再补）。
- 历史会话的删除、重命名、搜索。

## Technical Notes

- 文件焦点：`frontend/src/pages/WorkspacePage.tsx`、`frontend/src/features/ai/components/AiResumeAssistant.tsx`、对应的 CSS。
- React 19 已稳定，`@dnd-kit` 最新版支持 React 19。
- antd 6 的 `Dropdown` 组件使用 `menu={{ items }}` prop 而非 children `<Menu>`。
- CSS 文件位置待确认（可能在 `frontend/src` 下的 `.css` 或 `.scss` 文件中）。
