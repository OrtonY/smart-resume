# 面试对话优化

## Goal

优化面试对话页面的交互体验和后端上下文管理，包括：重新生成图标美化、顶栏按钮重构（移除返回键、增加暂停按钮）、计时持久化、以及多轮面试上下文隔离（避免技术栈问题重复）。

## Requirements

### P1: 重新生成按钮优化
- 修复"回复中断" Tag 导致 `interview-message__role` 行高度溢出的布局问题
- 更换图标为 `RedoOutlined`，保留图标+文字组合

### P2: 顶栏重构 + 计时持久化
- 移除左侧返回键（ArrowLeftOutlined）
- 右侧增加暂停按钮（PauseCircleOutlined），点击后调用 pause API + navigate 回列表页
- 后端 `interview_sessions` 表新增 `total_elapsed_seconds`（INTEGER DEFAULT 0）+ `last_resumed_at`（TIMESTAMP）
- 创建面试 / continue 时设置 `last_resumed_at = now()`
- pause / end 时计算 `total_elapsed_seconds += (now - last_resumed_at)`，清空 `last_resumed_at`
- 前端 `useInterviewTimer` 改造：初始值从后端获取，若 IN_PROGRESS 则 `total_elapsed_seconds + (now - last_resumed_at)` 作为起始秒数
- 详情 API 返回 `totalElapsedSeconds` + `lastResumedAt` 字段

### P3: 多轮上下文隔离
- conversationId 改为 `"interview-{sessionId}-round-{roundIndex}"`，每轮独立 ChatMemory
- 单轮 memory 上限从 20 提到 100（`MAX_MEMORY_MESSAGES = 100`）
- 进入下一轮时（`nextRound()`），调用 AI 提取当前轮已问过的具体技术栈关键词列表
- 新建 `interview_round_topics` 表：`id`, `session_id`, `round_index`, `topics_json`（JSON 数组）
- 下一轮 `InterviewPromptBuilder.buildSystemPrompt()` 注入约束："以下技术栈已在前面轮次中被详细询问过，请避免重复提问：[列表]。注意：项目经历相关问题不受此限制。"
- AI 提取失败时不阻塞流程，跳过约束注入，记录 warn 日志

## Acceptance Criteria

- [ ] 重新生成按钮视觉正常，"回复中断" Tag 不溢出
- [ ] 顶栏无返回键，右侧有暂停按钮，点击后 pause + 跳转列表
- [ ] 退出再进入面试，计时器显示正确累计时长
- [ ] 暂停后计时停止，继续后恢复计时
- [ ] 每轮对话独立上下文（验证：第二轮 AI 不知道第一轮的具体对话内容）
- [ ] 不重复询问前面轮次已问过的具体技术栈
- [ ] 项目相关问题可跨轮重复

## Decision (ADR-lite)

**Context**: 多轮面试共享单一 conversationId 导致上下文窗口不足，且 AI 会重复询问已问过的技术栈。

**Decision**: 每轮独立 conversationId + AI 提取已问技术栈列表注入系统提示词。

**Consequences**:
- 优点：彻底隔离上下文压力，每轮可用 100 条消息；技术栈去重由 AI 自然语言理解完成，准确度高
- 缺点：额外一次 AI 调用提取技术栈（延迟 1-2s）；提取可能不完美
- 风险：旧面试不迁移，需要兼容判断

## Out of Scope

- 心跳超时自动 pause（浏览器关闭场景暂不处理）
- 列表页展示累计时长
- 历史在途面试的迁移（只对新面试启用新逻辑）
- 知识点覆盖图 / 数据统计

## Technical Notes

- 关键文件：`InterviewPage.tsx`, `useInterviewTimer.ts`, `InterviewService.java`, `AiChatServiceImpl.java`, `InterviewPromptBuilder.java`
- Spring AI `MessageWindowChatMemory` + `JdbcChatMemoryRepository`
- 每轮 roundIndex 已在 `interview_messages` 表中记录
- DB migration 需要新增 V15 或 V16（取决于当前最新版本号）

## Implementation Plan

- PR1: P1 前端（重新生成按钮布局修复 + 图标更换）
- PR2: P2 后端 DB migration + pause/continue/create 计时逻辑 + 详情 API 返回时长字段；前端顶栏重构 + useInterviewTimer 改造
- PR3: P3 后端独立 conversationId + memory 上限调整 + 技术栈提取服务 + 新表 + prompt 注入；前端适配（如有）
