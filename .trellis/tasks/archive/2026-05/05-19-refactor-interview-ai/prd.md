# 面试模块 AI 重构

## Goal

将面试模块从占位模板驱动升级为真正的 AI 驱动面试体验。不同面试官角色有差异化的提示词和侧重点，难度等级影响题目深度，AI 能根据候选人回答进行追问或换题，模拟真实面试场景。

## What I already know

* 面试模块已有完整 CRUD + 状态机骨架（创建/暂停/继续/结束）
* 消息持久化和 Spring AI ChatMemory 基础设施已就绪
* `AiFeatureType.INTERVIEW` 枚举值已预留
* `AiChatService` 支持 stream/call/callStructured，已用于简历聊天功能
* 前端有消息列表、输入框、多轮面试官切换 UI
* 当前面试官角色：HR、Leader、项目深挖、场景题、行为面试
* 难度分三档：EASY / MEDIUM / HARD
* 当前无计时器、无 AI 调用、无角色差异化行为

## 用户明确需求

* 接入 AI 生成面试题目和追问
* 不同面试官角色 → 不同提示词/侧重点
* 不同难度 → 不同深度的题目
* 回答后 AI 可追问当前回答，也可换新题（模拟真实面试）
* 每轮面试题目控制在 12-18 个
* 右上角增加面试时长计时器
* 用户返回（离开页面）→ 暂停计时
* 移除当前暂停按钮
* 面试报告本轮不做

## Assumptions (temporary)

* AI 面试官的"追问 vs 换题"决策由 AI 自主判断（不需要用户手动选择）
* 12-18 题是指整轮面试的总问题数（含追问）
* 计时器为前端本地计时，不需要后端持久化时长
* 面试结束条件：达到题目上限 或 用户手动结束

## Open Questions

（暂无）

## Decisions

* 出题来源：简历和 JD 至少填写一个。有简历时结合简历出题；有 JD 时结合 JD 出题；两者都有则结合出题。面试官角色和难度为必填项。
* 题目计数规则：AI 出新题 +1，追问 +1，回答用户提问不计数。每轮 12-18 题。
* 面试结构：一个面试官 = 一轮，一场面试可包含多轮（多个面试官依次上场）。
* 轮次上限行为：达到上限后 AI 自动发送收尾语结束当前轮，若还有下一位面试官则提示用户进入下一轮。
* 追问策略：AI 自主决策何时追问、何时换题，提示词中给予软引导但不做硬性比例限制。
* 计时器范围：整场面试累计计时（跨所有轮次），不按轮次重置。
* 跨轮上下文：下一位面试官能看到前面轮次的完整对话记录，可避免重复提问并基于已暴露弱点深挖。

## Requirements (evolving)

* AI 根据面试官角色 + 难度 + 简历（+ JD 可选）生成面试题
* AI 根据候选人回答自主决定追问或换题
* 每轮题目数量控制在 12-18 个
* 前端右上角显示面试时长（mm:ss 或 hh:mm:ss）
* 离开面试页面自动暂停计时，返回后继续
* 移除暂停按钮
* 面试报告功能暂不实现

## Acceptance Criteria (evolving)

* [ ] 面试官能根据 JD 和角色生成符合难度的首题
* [ ] 候选人回答后 AI 能追问或换题
* [ ] 每轮面试在 12-18 题后提示/结束
* [ ] 不同角色的提示词有明显差异化
* [ ] 计时器在面试进行时正常计时
* [ ] 离开页面暂停、返回继续计时
* [ ] 暂停按钮已移除

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 面试报告生成（本轮不做）
* AI 评分/打分系统
* 面试录音/语音输入
* 计时器后端持久化

## Technical Notes

* 后端入口：`InterviewService.java` — 需要注入 `AiChatService`
* AI 对话 ID 格式已有：`interview-{sessionId}`
* 前端页面：`InterviewPage.tsx` — 需要加计时器组件
* 现有角色选项：HR / Leader / 项目深挖 / 场景题 / 行为面试
* Spring AI ChatMemory 已集成，可直接用于面试上下文管理
* 表单变更：简历从可选→必选，JD 从必填→可选（后端 DTO 校验 + 前端表单规则需同步调整）
