# 优化简历评分持久化与后端跨域

## Goal

优化简历评分结果的持久化方式，并完善后端跨域配置，降低评分结果丢失与前后端分离部署时的跨域访问问题。

## What I already know

* 当前简历评分入口在 `frontend/src/features/ai/components/ResumeScoreButton.tsx`
* 当前评分结果仅持久化到浏览器 `localStorage`
* 当前评分后端接口为 `POST /api/ai/resume-score`
* 当前评分服务在 `backend/src/main/java/com/smartresume/ai/service/AiResumeScoringService.java`
* 当前后端跨域集中配置在 `backend/src/main/java/com/smartresume/common/config/WebMvcConfig.java`
* 当前跨域仅放行 `http://localhost:*` 与 `http://127.0.0.1:*`
* 当前跨域配置为 `allowCredentials(false)`，并暴露 `X-Access-Token`
* 后端持久化栈为 Flyway + PostgreSQL + MyBatis-Flex
* 项目已有 AI 历史持久化和面试 AI 辅助持久化实现，可作为评分持久化的参考模式

## Assumptions (temporary)

* 简历评分持久化需要升级为后端持久化能力
* 后端跨域优化需要支持除本地开发外的可配置前端来源
* 评分持久化至少要与 `resumeId` 和当前用户绑定，避免不同用户数据串扰
* 默认保存每份简历“最近一次成功评分结果”，不扩展成评分历史列表，除非后续明确提出

## Open Questions

* 后端跨域放行范围是只做“可配置白名单”，还是需要更宽松的兜底策略？

## Requirements (evolving)

* 将简历评分结果改为后端持久化，支持跨设备/跨浏览器恢复
* 评分结果至少按“当前用户 + 简历 ID”维度保存最近一次成功评分
* 保持现有简历评分接口和基本交互可用
* 前端重新打开同一份简历评分弹窗时，可以恢复最近一次后端保存的评分结果
* 优化后端跨域配置能力，避免仅能访问 `localhost/127.0.0.1` 的硬编码限制

## Acceptance Criteria (evolving)

* [ ] 同一用户对同一份简历完成评分后，刷新页面或更换浏览器登录后仍可恢复最近一次评分结果
* [ ] 不同用户之间不会读到彼此的评分结果
* [ ] 后端跨域配置可覆盖目标前端访问场景
* [ ] 现有评分链路在优化后仍可正常返回结构化评分结果

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 不改造简历评分 AI prompt 本身
* 不扩大到 AI 聊天、面试评分等其他功能的持久化重构
* 不扩展为多次评分历史管理、评分版本对比或评分时间线
* 不处理与本任务无关的前端样式调整

## Decision (ADR-lite)

**Context**: 当前简历评分结果只保存在浏览器 `localStorage`，无法跨设备恢复，也不适合作为正式持久化方案。  
**Decision**: 将简历评分升级为后端持久化，按“用户 + 简历”保存最近一次成功评分结果。  
**Consequences**: 需要新增数据库表或字段、后端读写接口/服务与前端恢复逻辑；收益是评分结果可跨设备恢复，并避免仅依赖浏览器本地存储。

## Technical Notes

* 相关前端文件：
  * `frontend/src/features/ai/components/ResumeScoreButton.tsx`
  * `frontend/src/features/ai/api/aiApi`
  * `frontend/src/lib/http/apiClient.ts`
* 相关后端文件：
  * `backend/src/main/java/com/smartresume/ai/controller/AiController.java`
  * `backend/src/main/java/com/smartresume/ai/service/AiResumeScoringService.java`
  * `backend/src/main/java/com/smartresume/common/config/WebMvcConfig.java`
* 相关规范：
  * `.trellis/spec/backend/ai-resume-scoring.md`
  * `.trellis/spec/backend/ai-chat-history.md`
  * `.trellis/spec/backend/database-guidelines.md`
