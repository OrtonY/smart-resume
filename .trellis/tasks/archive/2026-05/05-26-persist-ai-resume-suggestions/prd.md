# brainstorm: persist ai resume suggestions

## Goal

让简历编辑界面的 AI 对话里产生的修改建议可持久化，并记录用户是否接受，从而在刷新页面、切换会话或重新进入编辑器后仍能看到建议及其处理状态。

## What I already know

* 用户希望通过新增一张表记录修改建议以及用户接受与否。
* 前端 `AiResumeAssistant` 当前只在组件内用 `suggestionStatus` 维护 `pending/applied/dismissed`，没有后端持久化。
* 后端已经有 AI 聊天会话与消息历史能力，相关表包括 `ai_chat_conversations`、`ai_chat_messages`、`spring_ai_chat_memory`。
* AI 流式回复里已经能解析出结构化 `suggestions`，说明建议内容本身在生成时可被后端拿到。

## Assumptions (temporary)

* 本次 MVP 只处理“简历编辑 AI 对话建议”的持久化，不扩展到简历评分、面试助手等其他 AI 场景。
* 建议以“单条 suggestion 实例”为粒度落库，至少保存 `resumeId`、`conversationId`、`suggestionId`、建议内容快照、状态、创建/更新时间。
* 用户“接受”对应现有前端的 `applied`，“不接受/跳过”对应 `dismissed`，未处理为 `pending`。

## Open Questions

* MVP 是否需要把“撤销 dismissed 回到 pending”也持久化，还是只记录最终 accepted/rejected 即可？

## Requirements (evolving)

* 为简历编辑 AI 建议新增持久化表，记录建议内容与处理状态。
* 后端在生成或返回 AI 建议后，能够为当前会话写入/更新建议记录。
* 后端提供按 `resumeId + conversationId` 查询建议记录的能力。
* 后端提供更新建议状态的能力，至少支持 `pending`、`applied`、`dismissed`。
* 前端在加载历史会话消息时同步加载建议状态，而不是只依赖本地内存。
* 前端在用户应用/跳过建议时调用后端接口更新状态。

## Acceptance Criteria (evolving)

* [ ] 新建 AI 会话并收到建议后，刷新页面再次打开同一会话仍能看到建议。
* [ ] 用户应用某条建议后，再次进入同一会话仍显示已应用状态。
* [ ] 用户跳过某条建议后，再次进入同一会话仍显示已跳过状态。
* [ ] 切换不同会话时，只展示各自会话对应的建议与状态。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 面试助手、AI 评分等其他 AI 产物的建议持久化
* 记录建议应用前后完整简历版本 diff
* 新增复杂审批流、批量操作审计或运营报表

## Technical Notes

* 前端核心文件：`frontend/src/features/ai/components/AiResumeAssistant.tsx`
* 后端会话/历史入口：`backend/src/main/java/com/smartresume/ai/service/AiChatHistoryService.java`
* AI 会话接口：`backend/src/main/java/com/smartresume/ai/controller/AiController.java`
* 现有迁移：`backend/src/main/resources/db/migration/V6__create_ai_chat_messages.sql`、`V7__create_spring_ai_chat_memory.sql`、`V8__create_ai_chat_conversations.sql`
