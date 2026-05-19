# AI 面试报告生成

## Goal

面试结束后，利用 AI 对整场面试对话进行分析，生成结构化的面试评估报告，帮助用户了解自己的面试表现、优势和改进方向。

## What I already know

* 数据库已有 `report_status` (VARCHAR 30) 和 `report_content` (TEXT) 字段
* Entity 和 DTO 已暴露 reportStatus / reportContent
* 前端已有 `InterviewReportStatus` 类型 ('PENDING' | 'GENERATING' | 'READY')
* 前端 InterviewPage 已有报告面板 UI（条件渲染：READY 时显示内容，否则显示占位）
* `AiFeatureType.INTERVIEW_REPORT` 枚举已存在
* 后端 `endInterview()` 时将 reportStatus 设为 PENDING，但未触发生成
* AI 调用走 `AiChatService.call()` 同步模式，支持 OpenAI-compatible 和 Ollama
* 每场面试有独立 conversationId，消息存储在 Spring AI JDBC chat memory 中
* 面试消息同时存储在 `interview_messages` 表中

## Requirements

* 面试结束时自动异步触发 AI 报告生成（用户无需手动操作）
* 报告状态流转：PENDING → GENERATING → READY（失败时 → FAILED）
* 生成失败时提供"重新生成"按钮
* 评分范围 1-100（与简历评分一致）
* 报告内容包含：总体评分、各轮面试表现摘要、技术能力评估、沟通表达评估、优势亮点、改进建议、逐题评分、参考答案对比、学习资源推荐
* 存储格式：结构化 JSON，AI 通过 callStructured 输出
* 前端用自定义组件渲染（评分卡片、进度条、折叠面板等）
* 生成策略：分轮生成再合并 — 每轮面试单独调用 AI 评估，最后合并为总报告
* 前端通知方式：SSE (Server-Sent Events) — 后端推送报告状态变更，前端实时更新

## Report JSON Structure

```json
{
  "overallScore": 78,
  "summary": "综合评语",
  "strengths": ["亮点1", "亮点2"],
  "improvements": ["改进建议1", "改进建议2"],
  "skillAssessment": {
    "technicalAbility": 80,
    "communication": 75,
    "problemSolving": 70,
    "professionalism": 85
  },
  "rounds": [
    {
      "role": "HR",
      "roundScore": 82,
      "summary": "本轮表现摘要",
      "questions": [
        {
          "question": "面试官提问",
          "candidateAnswer": "候选人回答摘要",
          "score": 75,
          "feedback": "评价",
          "referenceAnswer": "参考答案要点"
        }
      ]
    }
  ],
  "learningResources": [
    {
      "topic": "薄弱领域",
      "reason": "推荐原因",
      "suggestions": ["学习方向1", "学习方向2"]
    }
  ],
  "generatedAt": "2026-05-19T10:30:00Z"
}
```

## Acceptance Criteria

* [ ] 面试结束后自动触发异步报告生成，状态变为 GENERATING
* [ ] 每轮面试独立调用 AI 评估，合并为总报告 JSON
* [ ] 生成完成后状态变为 READY，report_content 存入 JSON
* [ ] 生成失败时状态变为 FAILED，前端显示重新生成按钮
* [ ] SSE 端点推送报告状态变更事件
* [ ] 前端实时接收 SSE 事件并更新 UI
* [ ] 前端用自定义组件渲染报告（评分卡片、逐题折叠面板、学习资源列表）
* [ ] 评分范围 1-100

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes

## Decision (ADR-lite)

**Context**: 报告生成涉及多个设计决策：触发方式、内容深度、存储格式、生成策略、前端通知。
**Decision**:
- 自动触发（面试结束时异步）
- 详细版报告（逐题评分 + 参考答案 + 学习资源）
- 结构化 JSON 存储 + 前端自定义组件
- 分轮生成再合并（每轮独立 AI 调用）
- SSE 推送状态变更
**Consequences**: 实现复杂度较高（多次 AI 调用、SSE 基础设施），但用户体验最佳，报告内容最丰富。

## Out of Scope

* 报告导出为 PDF
* 报告分享功能
* 历史报告对比
* 自定义评估维度

## Technical Approach

### Backend
- `InterviewReportService`: 报告生成编排，`@Async` 异步执行
- 每轮调用 `aiChatService.callStructured()` 获取单轮评估 JSON
- 合并各轮结果 + 生成总评（额外一次 AI 调用）
- SSE 端点：`GET /api/interviews/{id}/report/events`
- 重新生成：`POST /api/interviews/{id}/report/regenerate`
- 报告状态增加 FAILED

### Frontend
- 新增 `InterviewReport` 组件，渲染结构化报告
- 使用 EventSource 监听 SSE 事件
- 报告面板：评分仪表盘、技能雷达/进度条、逐题折叠面板、学习资源卡片
- GENERATING 状态显示加载动画
- FAILED 状态显示重新生成按钮

## Technical Notes

* 面试消息从 `interview_messages` 表获取（按 sortOrder 排序）
* `InterviewPromptBuilder` 已有按角色构建 prompt 的模式，可参考
* 前端报告面板已有 CSS 样式 (.interview-report-panel)
* `AiChatService.callStructured()` 已支持结构化 JSON 输出
* 需要新增数据库迁移：report_status 增加 FAILED 状态（VARCHAR 30 已足够）
