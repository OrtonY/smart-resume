# 重构简历对话：聚焦简历 + 建议-确认-推送修改

## Goal

把现有的"自由 AI 简历助手"对话流重构为**「智慧简历 AI」**的受控对话流，做到三件事：

1. **话题聚焦**：把 AI 的回答严格约束在「当前绑定简历 + 简历中已出现的公司/项目」范围内。无关问题礼貌引导回简历；身份问题回答「我是智慧简历 AI」。
2. **诊断 + 建议同发**：默认行为是一次性指出多处可改进点，每条附「问题 + 简短理由 + 可一键应用的 suggestedValue」；用户主动追问详细改写时才展开完整重写或多候选。
3. **确认 → 应用闭环**：建议默认不改 draft；前端渲染卡片，用户逐条 Apply/Skip 才修改 draft，复用现有 900ms 防抖 → `updateResume()` 自动保存。

## Requirements

### AI 行为契约

- 自我介绍：被问 "你是谁/你是什么/你能做什么" 时，回答「我是智慧简历 AI」（语义等价即可），并简述能力范围。
- 范围约束（仅靠 system prompt 实现）：
  - 允许：当前简历内容、简历中出现过的公司/项目/岗位/行业相关问题、简历优化建议、面试相关常识。
  - 拒答：与简历无关的闲聊、通用编程问题、生活咨询等 → 用固定话术礼貌引导回简历主题，不破坏对话上下文。
- 默认输出形态（一轮对话中同时给出）：
  - **可读文本**：markdown 风格，人类可读的诊断说明 + 总结。
  - **结尾哨兵 JSON**：`<<<SUGGESTIONS_JSON>>>{...}` 包裹结构化 patch 列表。
- patch 默认即附 `suggestedValue`（可一键应用的简洁新文本）。
- 用户没显式索取「详细改写 / 长版本 / 多候选」时，AI 不主动展开完整重写。
- 用户继续追问 "第 N 条帮我写长一点 / 多给几个版本" 时，AI 输出更长版本/多版本，**覆盖**对应 patch 的 `suggestedValue`（仍走同一哨兵协议）。

### 协议（决议 Q1：同流尾追加 suggestion 事件）

- 沿用现有 `streamChat` SSE。`AiChatEvent` 新增第四种 `type`：

  | type | 现有/新增 | 含义 |
  |---|---|---|
  | `message` | 现有 | 字符级文本 chunk（前端 append 到 assistant 气泡） |
  | `suggestion` | **新增** | content 为 patch 列表 JSON 字符串；前端把它挂到当前 assistant 消息上 |
  | `error` | 现有 | 错误，不破坏对话 |
  | `done` | 现有 | 流结束 |
- 后端流程：
  1. 收到上游 `message` chunk 后照旧 emit；同时把文本累积到 buffer。
  2. 上游 `done` 抵达前，扫 buffer 末尾的 `<<<SUGGESTIONS_JSON>>>{...}` 哨兵：
     - 找到 → Jackson 解析为 `AiResumeSuggestionPlan`；emit 一个 `AiChatEvent("suggestion", planJson, conversationId)`；从下发给前端的可读文本里**剥除**哨兵块（避免用户在气泡里看见 raw JSON）。
     - 未找到 / 解析失败 → 记 WARN 日志，emit 空列表的 `suggestion` 事件，再正常 `done`。**不**抛错破坏对话。
- 前端：
  - 收到 `message` chunk 照旧 append。
  - 收到 `suggestion` 事件：把解析出的 patch 列表挂到当前 assistant 消息的 `suggestions` 字段上，UI 渲染卡片。

### patch DTO（决议 Q2 + Q7-#1）

- 形状（后端 `AiResumeSuggestion`）：

  ```
  {
    id: string,                     // uuid，前端用作卡片 React key + Apply/Skip 状态
    section: ResumeSection,         // enum：personalInfo | personalSummary | education
                                    //       | workExperience | projectExperience
                                    //       | skills | honors | certificates
    index?: number,                 // 数组型 section 必填，标量 section（personalSummary）省略
    field: string,                  // 与 section 配套的字段名，按 section 校验白名单
    currentValue?: string,          // 现状摘要，便于卡片展示对比
    suggestedValue: string,         // 可一键应用的新文本
    rationale: string               // 一句话理由
  }
  ```
- 容器：`AiResumeSuggestionPlan { suggestions: AiResumeSuggestion[] }`，预留 `summary?: string` 字段供未来扩展（不强制）。
- 评分复用预留（Q7-#1）：DTO 放在通用包 `com.smartresume.ai.dto.suggestion`，命名不带 `Chat` 前缀，便于后续 `ResumeScoreButton` 复用同一形状的 Apply 闭环；本任务不动评分代码。

### 前端 UI（决议 Q3 + Q4）

- 卡片渲染位置：assistant 气泡正下方的"建议清单区块"，与可读文本视觉分离但同属一条消息。
- 每张卡片显示：section 中文标签 + 可选的"第 N 项"、原文摘要（如有）、AI 建议新文本、rationale；右侧两按钮 `应用` / `跳过`。
- 顶部快捷动作：`全部应用` / `全部跳过`（不默认勾选，按钮触发同样的逐条流）。
- 卡片状态机：`pending → applied | dismissed`。已 applied 卡片显示"已应用"徽标并禁用按钮；已 dismissed 卡片淡化并可一键反悔（同一轮内）。
- 应用动作：调上层透传下来的 `onApplyPatch(patch)` 回调（实质是封装好的 setDraft mutator），不直接改 draft 也不另起 save 路径。
- 历史会话切换（Q7-#2）：从历史列表切回旧会话时，不为旧消息重建建议卡片（避免 Apply 到与彼时不一致的 draft）；只有该会话内**新发出的消息**才会再生成卡片。

### 多轮状态（决议 Q6）

- 用户在同一会话内发送下一条消息时：
  - 当前轮**所有 pending 卡片**自动消失（视为放弃）。
  - 当前轮被 dismissed 的卡片，前端把它们的 `(section, field, index?, rationale)` 摘要拼到下一条 `userMessage` 末尾（隐藏在原始消息后，由前端组装），形如：

    ```
    [系统提示：用户在上一轮主动跳过了以下建议，请不要再重复提出：
    - workExperience#1.description: 量化关键项目结果
    - skills#0.name: 用更主流的写法替代 "ES6"
    ]
    ```
  - applied 卡片不需要回传（draft 已变化，AI 通过 system prompt 注入的最新简历 JSON 自然能感知）。
- 不做后端持久化"已拒绝建议"。下一条消息发出后，那一轮的 dismissed 摘要使命完成，不再随后续轮次累积（避免无限增长）。

### 应用 → 保存闭环

- 前端拿到 patch → 走 `(section, index?, field, suggestedValue)` 分发到对应 setDraft mutator 分支 → React state 变化触发现有 900ms 防抖 → `persistDraft()` 调用 `updateResume()` 落库。
- **不**新增 `/ai/resume-chat/apply-patch` 类后端端点；服务端 schema 不变。

## Acceptance Criteria

- [ ] 与简历无关的提问（如"今天天气"）会被礼貌引导回简历主题；引导话术内不出现额外建议卡片。
- [ ] 用户问"你是什么/你是谁"时，AI 回答含"智慧简历 AI"。
- [ ] 用户首次问"帮我看看简历"，AI 同时返回 ≥1 段可读诊断 + ≥1 条 `suggestion` 事件，且气泡内不出现 raw `<<<SUGGESTIONS_JSON>>>` 文本。
- [ ] AI 没收到「请帮我改写/写一版/给详细版」时，patch 的 `suggestedValue` 应是简洁可应用的一句话，不输出长段落 full rewrite。
- [ ] 用户对某条建议点"详细一点"或"再给一版"，下一轮 AI 输出对应的更长/多候选 `suggestedValue`。
- [ ] 不点 `应用`，`draft` 不变；点 `应用` 后 `setDraft` 触发，自动保存指示器经历 saving → saved。
- [ ] 用户点了 `跳过` 的建议，下一条消息后 AI 不会再次推荐相同字段的相同改法（采样 ≥3 次）。
- [ ] 切回历史会话时，旧 assistant 消息下方不再渲染卡片（仅显示纯文本）。
- [ ] 后端单元测试覆盖：哨兵正常解析、哨兵缺失/格式错误兜底、剥除哨兵后的纯文本下发。
- [ ] 前端类型检查 + 构建通过；新建议事件解析、卡片状态机、Apply mutator 分发各有单测或组件测。

## Definition of Done

- 后端：
  - `AiAgentService.streamChat` 改造（system prompt + 哨兵解析 + suggestion 事件）。
  - 新增 `AiResumeSuggestion` / `AiResumeSuggestionPlan` DTO（通用包）。
  - 单元测试覆盖四类场景：越界提问 / 默认诊断 / 显式追问详细改写 / 哨兵兜底。
- 前端：
  - `aiApi.streamAiChat` 接受 suggestion 事件类型；类型扩展 `AiChatEvent`。
  - `AiResumeAssistant` 渲染建议卡片 + Apply/Skip + 全部应用/跳过 + dismissed 摘要拼接。
  - `WorkspacePage` 透传 `onApplyPatch(patch)` 给助手；mutator 按 section + field 分发。
- spec：新增 `.trellis/spec/backend/ai-resume-chat.md`（智慧简历 AI prompt 契约 + 哨兵协议 + suggestion DTO + 兜底矩阵），更新 backend `index.md`。
- 验证：`mvn test`、`npm run lint`、`npm run build` 全绿。
- 手测 golden path：浏览器打开助手 → 提问 → 看到诊断+多张卡片 → Apply 1 张 → 模板预览刷新 → 自动保存指示器 saved → 跳过 1 张 → 发新消息 → 该建议未复现。

## Out of Scope

- WebSocket / 新长连接（沿用 SSE）。
- 服务端 apply-patch endpoint。
- 跨会话持久化"已拒绝建议"。
- AI 越狱攻防的完整治理（仅 system prompt + 兜底话术）。
- 修改 AI 配置面板与 `ResumeScoreButton`（DTO 仅做形状预留，不改实现）。
- 历史会话旧消息卡片重建（Q7-#2 已明确 out of scope）。
- 打开助手时的 AI 主动巡检（Q7-#3 已明确 out of scope）。

## Decision (ADR-lite)

- **Q1 协议形态**：Approach A — 同 SSE 流末尾追加 `type=suggestion` 事件。一次往返、低延迟、与现有 message/error/done 协议同构；代价是依赖 prompt 严格性，后端必须有兜底解析。
- **Q2 patch 定位**：显式元组 `(section: enum, index?: number, field: string, suggestedValue, rationale)`。模型友好度最高、前端可 switch 分发；ResumeContent schema 演进时同步 enum 即可。
- **Q3 UI 粒度**：assistant 气泡下方卡片清单 + 逐条 Apply/Skip + 顶部 "全部应用 / 全部跳过" 快捷。
- **Q4 默认详细度**：默认 `suggestedValue` 即为可一键应用的简洁新文本；"详细改写 / 多候选"通过用户追问触发并覆盖原 patch。
- **Q5 范围约束实现**：仅 system prompt，不加后端关键词预检与后置裁决。
- **Q6 多轮状态**：发新消息时 pending 卡片自动消失；dismissed 摘要拼接到下一条 userMessage 末尾告知 AI；applied 不回传（靠 draft 注入隐式感知）；不做后端持久化。
- **Q7 扩张项**：纳入 patch DTO 通用化（评分复用预留）+ 历史会话不重建旧 suggestion；不纳入打开即巡检。

## Technical Notes

- 关键文件：
  - 后端：`backend/src/main/java/com/smartresume/ai/service/AiAgentService.java`、`backend/src/main/java/com/smartresume/ai/dto/AiDtos.java`、新增 `dto/suggestion/AiResumeSuggestion(.java | Plan.java)`、对应 controller。
  - 前端：`frontend/src/features/ai/components/AiResumeAssistant.tsx`、`frontend/src/features/ai/api/aiApi.ts`、`frontend/src/features/ai/types.ts`、`frontend/src/pages/WorkspacePage.tsx`。
  - spec：新增 `.trellis/spec/backend/ai-resume-chat.md`，更新 `.trellis/spec/backend/index.md`。
- 关键约束：
  - 沿用 `AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_CHAT)`。
  - 不绕过 `AiChatService`；建议输出仅在现有 stream 上扩展 event type。
  - 不允许 mock fallback（spec 已禁止）；哨兵解析失败走"空 suggestion 列表"兜底而非伪造数据。
  - 自动保存仅一处：前端 setDraft → 900ms 防抖 → `updateResume()`。

## Implementation Plan (small PRs)

- **PR1（后端骨架 + spec）**
  - 新增 `AiResumeSuggestion` / `AiResumeSuggestionPlan` DTO + section/field 枚举与白名单。
  - `AiAgentService` 改 system prompt（身份 + 范围 + 默认诊断格式 + 哨兵规约 + 简洁 suggestedValue 默认）。
  - SSE 流尾哨兵解析 + suggestion 事件 emit + 哨兵剥除 + 兜底分支。
  - 单元测试覆盖四场景。
  - 落地 `.trellis/spec/backend/ai-resume-chat.md` + 索引更新。
- **PR2（前端协议接入 + UI）**
  - `AiChatEvent` 类型扩展 `suggestion`。
  - `AiResumeAssistant` 渲染建议卡片、Apply/Skip 状态机、全部应用/跳过、dismissed 摘要拼接到下条 userMessage。
  - `WorkspacePage` 透传 `onApplyPatch` 并实现 section+field 分发到 setDraft。
  - 历史会话切回不重建旧卡片。
- **PR3（边角 + 验证）**
  - 错误态：suggestion 解析失败的 toast 静默化，仅日志。
  - golden path 手测 + 三档命令验证（mvn test / npm run lint / npm run build）。

## Research References

无需外部对照——决议均基于现有 spec（`ai-chat-service.md` / `ai-chat-history.md`）与代码现状收敛。如后续 prompt 工程出现严重哨兵漂移，再回到 Q1 评估 Approach B（callStructured 二段式）。
