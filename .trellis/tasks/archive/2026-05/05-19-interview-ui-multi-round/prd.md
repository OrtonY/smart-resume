# 优化面试对话页面 + 多轮面试展示与等待动画

## Goal

优化 `/app/interviews/:interviewId` 详情页：

1. **简化顶部信息栏**：只保留"面试标题 + 当前轮数"，把对话区域空间最大化。
2. **多轮面试前端分组展示**：前端按轮次 Tab 隔离显示，后端保持上下文连贯；"开始面试"和"切换下一轮"操作加等待动画。

## Requirements

### R1 — 精简 Topbar
- 单行 topbar：左侧"面试标题 + 第 N 轮"，右侧"计时器（紧凑格式 `12:34`）+ icon 按钮组（下一轮 / 结束 / 生成报告）"。
- 移除原有的：状态 Tag、报告状态 Tag、关联简历名、难度/JD Card。
- topbar 下方紧接 Tab 栏（轮次标签）。

### R2 — 多轮 Tab 切换
- 每轮一个 Tab，标签文案："第 1 轮 · {角色名}"。
- 默认聚焦当前轮 Tab。
- 历史轮 Tab 只读：隐藏输入框、禁用"下一轮"按钮。
- Tab 栏支持横向滚动（轮数多时不溢出）。
- "下一轮"按钮维持现有逻辑（仅在当前轮 Tab 可见时可点击）。

### R3 — 后端 round_index 字段
- `interview_messages` 表新增 `round_index INT NOT NULL DEFAULT 0` 列（Flyway V13）。
- 写消息时从 `session.activeRoundIndex` 取值落库。
- 一次性回填脚本：复用现有"连续两条 INTERVIEWER 消息"启发式为老数据填充 `round_index`。
- 下线 `countQuestionsInCurrentRound` 中的隐式推断逻辑，改为 `WHERE round_index = :current` 直接查询。
- DTO / API 响应中 `InterviewMessage` 增加 `roundIndex` 字段。

### R4 — 等待动画
- **next-round**：点击后全屏 overlay（复用 `interview-creating-overlay` 风格），文案"AI 面试官准备中…"，直到新一轮开场消息返回后消失。
- **流式首字节**：在收到第一个 SSE token 前，显示"思考中…"骨架气泡（替代现有 `<Spin size="small">`），首字节到达后切换为正文流式渲染。

## Acceptance Criteria

- [ ] topbar 压缩为单行，对话区域可视高度较之前增加 ≥ 80px。
- [ ] 多轮面试消息按 Tab 分组，切换 Tab 只显示对应轮次消息。
- [ ] 历史轮 Tab 下输入框隐藏、操作按钮禁用。
- [ ] Tab 栏在 5+ 轮时可横向滚动，不溢出。
- [ ] next-round 请求期间全屏 overlay 阻止交互。
- [ ] 流式回复首字节前显示"思考中"骨架气泡。
- [ ] 已有面试历史数据回填后能正确按轮分组。
- [ ] AI 对话上下文跨轮连贯不退化。

## Definition of Done

- Flyway V13 迁移 + 回填脚本通过。
- 后端单元测试：轮次归属写入 + DTO 序列化。
- 前端组件测试：Tab 切换 + loading 状态。
- Lint / typecheck / CI 全绿。
- 不破坏既有面试历史数据。

## Technical Approach

### 后端
1. V13 migration：`ALTER TABLE interview_messages ADD COLUMN round_index INT NOT NULL DEFAULT 0`。
2. V13 回填：用 Java migration 或 SQL 脚本，按 session 分组，利用"连续两条 INTERVIEWER 消息"推断轮次边界，批量 UPDATE。
3. `InterviewService.createMessage()` 写入时设置 `roundIndex = session.getActiveRoundIndex()`。
4. `InterviewService.countQuestionsInCurrentRound()` 改为 `SELECT COUNT(*) FROM interview_messages WHERE session_id=? AND round_index=? AND role='INTERVIEWER'`。
5. DTO `InterviewMessageResponse` 增加 `roundIndex` 字段。

### 前端
1. 精简 topbar：删除 status tags / 简历名 / 难度 Card，保留标题 + 轮数 + 计时器 + icon 按钮组。
2. Tab 组件：基于 `interviewerRoles` 数组生成 Tab 列表，`overflow: auto` 横向滚动。
3. 消息列表按 `message.roundIndex` 过滤，仅渲染当前 Tab 对应轮次。
4. 历史轮 Tab：条件隐藏输入框 + 禁用操作按钮。
5. next-round overlay：调用 `nextInterviewRound` 时 `setNextRoundLoading(true)`，成功回调后关闭。
6. 骨架气泡：流式状态下首字节未到时渲染 `<ThinkingBubble />` 组件（带"思考中…"文案 + 脉冲动画），首字节到达后切换为 `<MarkdownMessage streaming>`。

## Decision (ADR-lite)

**Context**: 面试对话页信息过载，多轮消息混杂，切换轮次时无等待反馈。
**Decision**: 单行 topbar + Tab 分轮 + round_index DB 列 + 双层等待动画。
**Consequences**: 需要一次 schema 迁移 + 数据回填；Tab UI 增加前端复杂度；换来的是更清爽的对话体验和可靠的轮次数据模型。

## Out of Scope

- 跨轮独立对话记忆（保持当前共享 AI 上下文）。
- 面试报告页 / Drawer / 列表页 UI 改动。
- 面试创建流程改动。

## Technical Notes

- 关键文件：
  - `frontend/src/pages/InterviewPage.tsx:648-812`
  - `frontend/src/features/interview/types.ts:33-40`
  - `frontend/src/features/interview/api/interviewApi.ts:44-48`
  - `backend/.../domain/InterviewMessageEntity.java`
  - `backend/.../domain/InterviewSessionEntity.java`
  - `backend/.../service/InterviewService.java:166-191`（nextRound）
  - `backend/.../service/InterviewService.java:534-558`（countQuestionsInCurrentRound）
  - `backend/.../resources/db/migration/V10__create_interview_sessions.sql`
- 历史存量数据：回填脚本需处理"只有一轮"的面试（全部 `round_index=0`）。
