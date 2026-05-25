# 面试问题 AI 答案 + 评分对比功能

## Goal

在面试详情页的每条「面试官提问」消息旁，增加「AI 答案」按钮。用户点击后弹出小窗口，AI 流式生成一份「理想候选人」视角的参考答案。弹窗下方提供「AI 评分」入口，用户手动触发后由 AI 对用户的回答打分并给出反馈。AI 答案与评分结果均需持久化，避免重复消耗 token。

## Requirements

### R1 入口按钮
- 在所有 `role = INTERVIEWER` 的消息气泡旁显示「AI 答案」按钮，覆盖全部轮次。
- `SYSTEM` / `CANDIDATE` 消息不显示按钮。
- 面试任意状态（IN_PROGRESS / PAUSED / ENDED）均可使用。

### R2 AI 答案弹窗
- 点击按钮弹出 `ResponsiveModal`（桌面 + 移动端自适应）。
- 已有缓存：直接展示缓存内容 + 「重新生成」按钮（覆盖式）。
- 无缓存：自动开始流式生成，期间展示「思考中…」占位 + 流式 markdown 渲染。
- 关闭弹窗或点击「停止」可中止流（`AbortController`）。
- 重新生成时若有进行中的流，先 abort 旧流再发起新流。

### R3 AI 答题视角
- 「理想候选人」视角，基于本次面试的简历 JSON、JD、目标公司、面试官角色、难度、当前问题文本生成。
- 与现有 `InterviewPromptBuilder` 共用上下文，新增「答题」专用 system prompt。
- ConversationId 命名 `interview-{sessionId}-answer-{messageId}`，与面试主线对话隔离，不污染对话记忆。

### R4 持久化（合并单表）
- 新建表 `interview_ai_assists`，1 条面试官提问对应至多 1 行记录（覆盖式）。
- 字段：
  ```
  id              VARCHAR(64) PK
  message_id      VARCHAR(64) NOT NULL  -- FK → interview_messages(id)
  session_id      VARCHAR(64) NOT NULL  -- FK → interview_sessions(id)
  answer_content  TEXT NULL             -- AI 参考答案
  answer_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING'  -- PENDING / GENERATING / READY / FAILED
  candidate_answer TEXT NULL            -- 评分时使用的回答快照
  score           INT NULL              -- 0-100
  feedback        TEXT NULL             -- 评分反馈 markdown
  score_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING'  -- PENDING / GENERATING / READY / FAILED
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
  ```
- 一次查询即可拿到答案 + 评分全部数据。
- AI 答案与评分各自独立更新（2 个 endpoint），互不覆盖对方字段。
- 二次打开走缓存，零 token 消耗。
- 流中断 / 失败时 `answer_status` / `score_status` 不停留在 `GENERATING`：服务端 abort/error 钩子写入 `FAILED` 或落盘已生成的部分内容并标 `READY`。

### R5 评分入口（AI 评分）
- 在 AI 答案弹窗下方展示「AI 评分」分区。
- 评分需用户手动触发（不自动开始）。
- 评分内容来源：
  - **当前题目**（即此 INTERVIEWER 消息后**没有** CANDIDATE 回复）：读取主输入框 `messageInput` 的当前文本作为待评分内容。
  - **历史题目**（已有 CANDIDATE 回复）：读取该 INTERVIEWER 之后、同 round 内的 CANDIDATE 消息内容。
- 当待评分内容为空：后端拒绝并返回明确提示（前端展示 toast / 区域提示「请先输入回答」），不写库。

### R6 评分输出
- 评分结果包含：分数（0-100 整数）+ 反馈（markdown 文本，含优点 / 不足 / 改进建议）。
- 流式输出，渲染范式同 AI 答案。
- 快照 `candidate_answer` 保存被评分的回答文本，用于让用户清楚此分数对应哪份回答。
- 二次打开弹窗：若已评分则直接展示分数 + 反馈 + 「重新评分」按钮；否则显示「开始评分」按钮。

### R7 隔离
- 面试报告生成不读取 `interview_ai_assists` 表，避免污染评分。
- AI 答案 / 评分均不写入 `interview_messages` 表。

### R8 i18n
- 中英文双语，复用 `interview.json` 的命名风格（`message.aiAnswer`、`aiAnswer.modalTitle` 等）。

## Acceptance Criteria

- [ ] AC1：所有面试官消息旁可见「AI 答案」按钮；非面试官消息无此按钮。
- [ ] AC2：首次点击触发流式生成，弹窗内 markdown 实时渲染；关闭弹窗 / 点停止能中止流。
- [ ] AC3：再次打开同一题的 AI 答案弹窗，立即展示缓存内容，零网络请求至 AI 模型（仅有读 DB 的 GET）。
- [ ] AC4：「重新生成」覆盖旧答案；若旧流未结束，先中止再发起新流。
- [ ] AC5：当前题目（无 CANDIDATE 回复）点击「开始评分」，读取输入框内容并触发评分流。
- [ ] AC6：历史题目（有 CANDIDATE 回复）点击「开始评分」，使用该回复触发评分流。
- [ ] AC7：待评分内容为空时，后端返回错误提示，前端展示「请先输入回答」类提示，DB 无脏数据。
- [ ] AC8：评分结果（分数 + 反馈）持久化；二次打开弹窗直接展示，含「重新评分」入口。
- [ ] AC9：面试报告生成结果不受 AI 答案 / 评分数据影响。
- [ ] AC10：桌面端 + 移动端弹窗布局正常，无溢出 / 滚动卡顿。
- [ ] AC11：中英文 i18n 完整。

## Definition of Done

- 后端：新增 controller endpoints、service 方法、prompt builder 扩展、DTO、1 张表的 V17 migration、entity + mapper、单测。
- 前端：API client、AI 答案 + 评分弹窗组件、按钮入口、状态管理（缓存读取 / 流控制 / abort）、i18n。
- Lint / typecheck / 后端单测全绿。
- 关键路径人工 smoke：首次生成 → 缓存命中 → 重新生成 → 当前题评分 → 历史题评分 → 空回答评分拒绝 → 重新评分。
- 移动端响应式手测。

## Out of Scope

- 不在面试创建时预生成所有答案 / 评分。
- 不导出 AI 答案或评分到面试报告 PDF。
- 不做评分历史版本（仅保留最新一次）。
- 不做答案 / 评分的多语言切换（跟随当前 i18n 语言即可）。
- 不做答案 / 评分的分享 / 导出功能。

## Decision (ADR-lite)

**Context**：用户在 AI 面试场景下需要参考答案与自评工具，用以复习与改进；已有完善的 SSE 流式基础设施。

**Decision**：
1. 持久化采用 1 张合并表 `interview_ai_assists`（答案 + 评分同行），与 `interview_messages` 解耦，避免污染面试主线和报告生成。
2. 接口仍分两个 endpoint（答案生成 / 评分生成），因触发时机不同。
3. AI 答案与评分共享同一个弹窗，垂直分两区，评分需手动触发。
4. ConversationId 与面试主线隔离。
5. 评分内容来源动态判定：当前题读输入框，历史题读已存在的 CANDIDATE 消息。
6. 评分快照保存被评分的回答文本，用以解释分数对应内容。
7. 重新生成 / 重新评分均为覆盖式，不保留历史版本。

**Consequences**：
- 优势：单表结构简洁，一次查询拿全；职责清晰、可独立扩展；与现有报告链路无耦合。
- 代价：多 1 个 controller endpoint 组、1 张表、2 个 service 方法、2 套 prompt；前端弹窗逻辑略复杂（双流式 + 双缓存）。

## Technical Notes

### 后端关键参考
- 控制器：`backend/src/main/java/com/smartresume/interview/controller/InterviewController.java:81-92`（streamMessage / regenerateStream 范式）。
- 服务：`backend/src/main/java/com/smartresume/interview/service/InterviewService.java:292-457`（流式 + 持久化钩子）。
- Prompt：`backend/src/main/java/com/smartresume/interview/service/InterviewPromptBuilder.java`（扩展 `buildAnswerSystemPrompt` / `buildScoreSystemPrompt`）。
- AI 流：`backend/src/main/java/com/smartresume/ai/service/AiChatServiceImpl.java`（`Flux<AiChatEvent>`，`done` 事件结尾）。
- 迁移：`backend/src/main/resources/db/migration/`，最新到 V16，新表用 V17。

### 前端关键参考
- 主页面：`frontend/src/pages/InterviewPage.tsx:988-1042`（消息渲染、流式渲染、handleSubmitMessage / handleRegenerate 控制流）。
- API 客户端：`frontend/src/features/interview/api/interviewApi.ts`（`streamInterviewMessage` 范式）。
- SSE 客户端：`frontend/src/lib/sse/streamEvents.ts`（带 `AbortSignal`）。
- Markdown：`frontend/src/lib/markdown/MarkdownMessage.tsx`（`streaming` 模式）。
- 弹窗：`frontend/src/components/shared/ResponsiveModal.tsx`。
- i18n：`frontend/src/i18n/locales/{zh-CN,en-US}/interview.json`。

### 新建文件预计
- 后端：
  - `interview/controller/InterviewController.java`（新增 endpoints）
  - `interview/service/InterviewAssistService.java`（新建，承载答案与评分流式逻辑）
  - `interview/service/InterviewPromptBuilder.java`（扩展两个 prompt 构造方法）
  - `interview/dto/InterviewAssistDtos.java`
  - `interview/domain/InterviewAiAssistEntity.java`
  - `interview/mapper/InterviewAiAssistMapper.java`
  - `db/migration/V17__create_interview_ai_assists.sql`
  - 单测：新增 `InterviewAssistServiceTest.java`
- 前端：
  - `frontend/src/features/interview/components/AiAnswerModal.tsx`
  - `frontend/src/features/interview/api/interviewApi.ts` 增量
  - `frontend/src/features/interview/types.ts` 增量
  - `frontend/src/i18n/locales/zh-CN/interview.json` 增量
  - `frontend/src/i18n/locales/en-US/interview.json` 增量
  - `frontend/src/pages/InterviewPage.tsx` 增量（按钮挂载 + 弹窗状态）

## Implementation Plan (small PRs / commits)

考虑到改动跨前后端 + 含 2 张新表，建议作为 1 个 PR 一次性提交（功能强耦合，拆分会有跨 PR 阻塞）。提交内部分阶段实施：

1. **阶段 1（后端骨架）**：迁移 V17 / V18、entity、mapper、DTO、空 service 方法 + 单测桩。
2. **阶段 2（后端实现）**：prompt builder 扩展、AI 答案流式生成 + 持久化、AI 评分流式生成 + 持久化、controller endpoints、单测。
3. **阶段 3（前端骨架）**：API client、types、i18n keys、空弹窗组件接入按钮入口。
4. **阶段 4（前端实现）**：弹窗内流式渲染、缓存读取、abort 控制、评分内容来源判定、错误提示。
5. **阶段 5（端到端）**：全链路 smoke、移动端响应式确认、报告隔离回归。
