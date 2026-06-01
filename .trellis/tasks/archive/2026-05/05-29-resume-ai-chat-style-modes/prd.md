# 简历编辑 AI 对话风格模式

## Goal

给简历编辑器里的 AI 对话（`AiResumeAssistant`）加一个"模式"入口，让用户可以选择不同风格的 AI 对当前绑定简历进行分析。首期上线两种风格：**毒舌** 和 **阴阳怪气**，作为对默认"专业 / 中性"语气之外的"玩法"型补充。

为什么要做：当前 AI 回复风格单一（专业、克制、建设性），缺乏情绪张力，用户在已经写得过分四平八稳的简历面前很难被"扎醒"。引入毒舌 / 阴阳怪气两种风格，用反差感推用户重写那些没人会读完的"负责 XX 项目"流水句。

## What I already know

### 前端

- 入口组件：`frontend/src/features/ai/components/AiResumeAssistant.tsx`（一个组件包含浮动按钮 + `ResponsiveModal` + 消息列表 + 输入框）
- 消息列表：`<div className="ai-chat-messages">`（约 704–733 行）
- 输入框：`<div className="ai-chat-composer">`（约 735–752 行），里面是 `<MarkdownComposer>` + 发送 `<Button>`
- "模式按钮"自然落点：735 行 `ai-chat-composer` 块的**正上方**
- 前端 API：`frontend/src/features/ai/api/aiApi.ts`
  - REST `completeAiChat` → `POST /api/ai/chat`
  - SSE `streamAiChat` → `POST /api/ai/chat/stream`
- 请求 DTO：`AiChatRequest = { message, conversationId?, resumeId }` —— 当前**没有** mode/style/persona 字段
- 流事件：`AiChatEvent` 会回传 `conversationId`，前端把它存在 state 里

### 后端

- Controller：`backend/src/main/java/com/smartresume/ai/controller/AiController.java`，`@RequestMapping("/ai")`
- Service：`backend/src/main/java/com/smartresume/ai/service/AiAgentService.java`
  - 第 32–70 行：`private static final String CHAT_SYSTEM_PROMPT = """ 你是「智慧简历 AI」… """`（一段固定中文 persona）
  - 第 155 行：`prepareChat(...)` 内调用 `buildSystemPrompt(resumeContentJson)`
  - 第 256–263 行：`buildSystemPrompt` 把 persona + 简历 JSON 拼成最终 system prompt
- AI 调度：`AiChatServiceImpl.buildPromptWithMemory` 把 system prompt 包成 `SystemMessage`，再叠加按 `conversationId` 拉取的 chat memory
- 会话持久化：`AiChatConversationEntity` / `AiChatMessageEntity` / `AiChatSuggestionEntity` + Spring AI `SpringAiChatMemoryEntity`，按 `resumeId` + `conversationId` 维度，`AiChatHistoryService.resolveConversationId` 负责复用或新建

### 关键观察

- **当前 persona 是一段硬编码字符串常量**，不是 Map / Enum。要支持多风格必须先做最小抽象（一个 `enum AiChatStyle` + 一个 `Map<AiChatStyle, String>` 或者 strategy 接口）。
- 会话是**持久化**的，所以 mode 既可以做"per-request"（每次发消息带上），也可以做"per-conversation"（在 `AiChatConversationEntity` 上加列）—— 两种语义不同，需要决策。

## Assumptions (temporary)

- 默认风格（professional / 中性）继续保持现有 `CHAT_SYSTEM_PROMPT` 的内容，毒舌 / 阴阳怪气是**额外**风格，不是替代。
- 风格只影响 AI 回复的**语气和遣词**，不影响"基于简历给建议"的核心能力——毒舌也要给真东西，不是单纯骂人。
- 风格的"分析"维度（项目经历薄、量化指标缺失、技术栈陈旧、措辞流水账等）和默认模式一致，只是用毒舌 / 阴阳怪气的方式说出来。
- 暂不考虑"用户自定义风格"。

## Open Questions

> 仅保留 Blocking / Preference 类，逐个问。

- [Preference] 模式按钮的**触发语义**：纯切换语气、还是切换并立刻产出一段对当前简历的风格化分析？（决定 UX 走向，先问这个）
- [Preference] 风格的**作用域**：per-conversation（粘性，存在 `AiChatConversationEntity`）vs per-request（一次性，每条消息带上）。
- [Preference] 模式按钮的**呈现形态**：下拉菜单 / Segmented 分段控件 / Popover 卡片（带每种风格的一句话说明）。
- [Preference] **首期就两种**（毒舌 / 阴阳怪气），还是把"专业（默认）"也作为可显式选中的一项展示在切换器里。

## Requirements (evolving)

- 在 `AiResumeAssistant` 输入框正上方加一个"模式"入口，用户可见、可点击、可切换。
- 默认进入会话时为"专业"模式（行为与现状一致，不破坏老用户）。
- 至少支持两种额外风格：毒舌、阴阳怪气，各自有可识别且**稳定**的语气。
- 风格切换后，后续 AI 回复必须按所选风格语气输出（最终细节看 Q1 答案）。
- 不影响现有的 `suggestions`（建议气泡）、`conversationId` 续聊、SSE 流式输出能力。

## Acceptance Criteria (evolving)

- [ ] 用户可在 `AiResumeAssistant` 内看到模式入口，并能切换到「毒舌」「阴阳怪气」其中之一。
- [ ] 切换后发起的对话，AI 回复在同一段简历输入下与「专业」模式相比有显著可辨识的语气差异。
- [ ] 默认模式行为与现状完全一致（回归测试通过）。
- [ ] `conversationId` / chat memory / suggestions 流不被破坏。
- [ ] （视 Q2 答案）模式状态在刷新页面后能恢复到上次选择，或显式回到默认——二选一，不能"半生不熟"。

## Definition of Done

- 单元测试：覆盖 `AiAgentService` 的 prompt 选择逻辑（每种风格走到对应的 persona 文案）。
- 联调：手动验证三种模式（含默认）的回复差异 + suggestions 仍可点。
- Lint / Spotless / 前端 typecheck 通过。
- 不引入对话历史的破坏性 schema 变更（如果加列要给默认值，迁移脚本兼容老数据）。

## Out of Scope (explicit)

- 用户自定义风格 / 上传自己的 persona 模板。
- 风格 A/B 实验后台、埋点看板。
- 同一段对话里"逐条消息"动态切换 mode 的复杂 UX（除非 Q2 走 per-request）。
- 把毒舌风格扩展到模拟面试（`InterviewPromptBuilder`）—— 那是另一个 feature。

## Technical Notes

- 后端最小抽象：新增 `enum AiChatStyle { PROFESSIONAL, SAVAGE, SARCASTIC }` + `Map<AiChatStyle, String> STYLE_PROMPTS`，`buildSystemPrompt(resumeJson, style)` 选对应文案；`AiChatRequest` 新增可空 `style` 字段，缺省 `PROFESSIONAL`。
- 前端最小改动：`AiChatRequest` TS 类型加 `style?: AiChatStyle`；`AiResumeAssistant` 内加一个 `style` state，渲染一个切换器，提交时塞进 request；SSE 调用同步带上。
- 持久化决策见 Q2：
  - per-conversation → `ai_chat_conversation` 表加 `style VARCHAR(32) NOT NULL DEFAULT 'PROFESSIONAL'` 列，`AiChatHistoryService.resolveConversationId` 在新建时写入；切换风格 = 起一个新 conversation（或更新当前 conversation 的 style 列）。
  - per-request → 不加列，每条消息按请求里的 `style` 临时选 prompt；老消息不会"回溯重写"。
- prompt 文案设计要点（写文案时再细化）：
  - 毒舌：直白、刻薄、抓痛点、不留情面，但**仍然给具体改写建议**，不能只骂不修。
  - 阴阳怪气：表面夸、暗里贬，多用反讽 / 引号 / "哦"型语气词，建议藏在挖苦后面。
  - 两种风格都要保留"基于简历 JSON 给建议"的硬约束，不能脱离简历自由发挥；仍要求输出 markdown + 可解析的 suggestions（如果当前 prompt 有这个约束）。
