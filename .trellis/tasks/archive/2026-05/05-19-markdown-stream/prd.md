# 会话界面 Markdown 渲染 + 面试流式输出

## Goal

让 smart-resume 的两个会话界面（AI 简历助手 / 面试对话）能正确渲染 Markdown 格式（粗体、列表、代码块、标题等），并把面试对话从一次性 POST 改为 SSE 流式输出，使面试官回复能逐字呈现，与 AI 简历助手的体验保持一致。

## What I already know

### 现状盘点
- **AI 简历助手**：`frontend/src/features/ai/components/AiResumeAssistant.tsx:538-555` —— bubble 内容是 `<div>{item.content}</div>` 纯文本渲染。**已经走 SSE 流式**（`aiApi.ts#streamEvents` 手写 fetch + ReadableStream + TextDecoder 解析 `\n\n` / `data:`）。
- **面试对话**：`frontend/src/pages/InterviewPage.tsx:585-598` —— bubble 内容是 `<p>{item.content}</p>` 纯文本渲染。**当前是阻塞式 POST**，`interviewApi.ts:43-48` 调用 `/api/interviews/{id}/messages` 一次性返回整个 `InterviewDetail`。
- **后端面试接口**：`InterviewController.java:69-75` `@PostMapping("/{interviewId}/messages")` 返回 `ApiResponse<InterviewDetailResponse>`，`InterviewService.submitMessage` 同步调用 `generateAiResponse(...)` 后追加消息再返回。
- **后端已有 SSE 范例**：面试报告 `/api/interviews/{id}/report/events` 用 `EventSource` 推状态；AI 简历助手 `/api/ai/chatstream` 走 SSE。

### 现有依赖
- `mdast-util-from-markdown ^2.0.3` 已安装，但只在简历字段（粗体子集）使用：`frontend/src/features/resume/markdown/parseInlineMarkdown.ts`（strict subset：只支持 bold，其它元素被 flatten 成纯文本）。
- **没有** `react-markdown` / `marked` / `markdown-it` / `remark-*` / `rehype-*` / `highlight.js` / `dompurify`。

## Assumptions (temporary)

- 两个会话界面只渲染 **AI 助手 / 面试官**（assistant 一侧）的消息为 markdown；用户/候选人输入仍按纯文本展示（保持原样输入即所得）。
- 面试流式输出沿用 AI 简历助手已经验证过的 SSE 协议形态（`event: type` + `data: JSON`），后端用 Spring 的 `SseEmitter` 或 `Flux<ServerSentEvent>`。
- 流式完成后再持久化最终 AI 消息到数据库，前端拿到 `done` 事件即关闭流。

## Open Questions

- [ ] Q2 渲染范围：仅 assistant/INTERVIEWER 一侧，还是双向都渲染 markdown
- [ ] Q3 面试 SSE 事件协议：复用 AI 助手现有 `event:type + data:JSON` 形态，还是另设
- [ ] Q4 流式过程中的消息落库时机（流结束整体落库 vs 增量落库）
- [ ] Q5 流式异常 / 中断的前端兜底策略

## Decision Log (ADR-lite)

### A1 — Markdown 渲染深度（已定）

- **Decision**: 采用方案 C —— `react-markdown` + `remark-gfm` + `react-syntax-highlighter`（完整 CommonMark + GFM + 代码块语法高亮）
- **Why**: 面试场景天然涉及代码题，候选人/面试官互相贴代码常见，黑底纯文本体验差
- **Consequences**:
  - 新增依赖：`react-markdown`、`remark-gfm`、`react-syntax-highlighter` （以及类型包）
  - bundle 体积 +60KB（react-markdown）+ 30KB（按需加载语言的 syntax highlighter）
  - 必须做语言按需加载（避免一次性加载所有语言定义）
  - `react-markdown` 默认禁用 raw HTML，XSS 风险低，无需额外引入 dompurify

### A6 — 流式增量与 Markdown 渲染交互（已定）

- **Decision**: B —— 智能补全未闭合 markdown 标记后再渲染。流式 buffer 末尾若存在未闭合的 ` ``` ` / `**` / `_` / `[` 等，临时补上结束符渲染，`event: done` 后用真实内容重渲染
- **Why**: 避免代码块"吞掉后续段落"的瞬态错位、避免高亮闪烁，体验更丝滑
- **实现路径**:
  - 优先评估 `streamdown` / `react-markdown-stream` 等小众库（实施时调研），若无合适库则自写 ~30 行检测函数
  - 处理标记：fenced code block (` ``` `)、bold (`**`)、italic (`_` / `*`)、inline code (`` ` ``)、link (`[`)
  - corner case：嵌套未闭合（如 `**bold _italic` ）按"由外到内"顺序补全
- **Consequences**:
  - 实施成本略增（一个工具函数 + 单测覆盖典型未闭合场景）
  - 需要在 markdown renderer 组件加 `streaming?: boolean` prop 控制是否启用补全
  - 单测必须覆盖代码块未闭合、bold 未闭合、嵌套未闭合至少 3 个用例

### A5 — 流式异常 / 中断兜底（已定）

- **Decision**: B + X1 —— 异常时**落库已 buffer 的 AI 文本**并标记 `status=ABORTED`，前端用户主动关闭页面/切走时通过 fetch `AbortController` 中断后端流，按异常分支处理
- **Why**:
  1. 用户能看到「AI 说了一半」的内容，候选人提问不悬空
  2. 后续可基于已有 ABORTED 消息做「重新生成」补救
  3. 「用户在场才生成」符合面试场景语义，无需解耦后端生成（避免膨胀本任务范围）
- **数据模型变更**:
  - `interview_messages` 表新增 `status` 字段：枚举 `NORMAL | ABORTED`（默认 `NORMAL`）
  - 或复用现有字段 / 加 `partial: boolean` —— 留给实施时根据 entity 现状选择
- **前端表现**:
  - SSE 异常 → toast「AI 回复中断」+ 在已渲染的 AI 气泡上加「⚠️ 回复中断」标记 + 提供「重新生成」按钮（点击后用同一候选人消息重新触发流式接口）
- **Consequences**:
  - 候选人重进面试可见 ABORTED 消息及其部分内容
  - 后端需在 SSE 流被中断时（IOException / ClientAbortException）在 finally 块里落库 buffer 内容
  - 「重新生成」会基于 ABORTED 消息上下文继续，token 消耗与正常流相当

### A4 — 流式过程中消息落库时机（已定）

- **Decision**: 候选人消息提交时**立即落库**，AI 面试官消息**流结束后整体落库**（不做增量 UPDATE）
- **Why**:
  1. 面试场景刷新概率低，增量落库收益有限、复杂度高
  2. 与现有 `InterviewService.submitMessage`「先存候选人 → 后存面试官」两步逻辑天然兼容，仅把第二步从同步改为流结束后执行
  3. messageId 已在 SSE 协议中预留，未来若需升级到增量落库可平滑演进
- **落库时序**:
  - T0: 收到候选人消息 → 立即 INSERT candidate 消息（独立事务） → 返回 SSE 流（`messageId` 占位）
  - T1..Tn: 流式吐 `event: message` 增量给前端
  - TN: AI 完成 → INSERT interviewer 消息 → 发 `event: done` → 关闭流
- **Consequences**:
  - 流式过程中刷新页面：候选人提问保留，AI 回复部分丢失（用户需重新发问）
  - 异常处理细节（部分内容是否落库 / 标记 `aborted`）→ 留给 A5 决定
  - 后端需在 SSE 关闭前完成 INSERT，避免「事件已发但 DB 未写」的不一致

### A3 — 面试 SSE 事件协议（已定）

- **Decision**: 完全复用 AI 简历助手现有 SSE 协议形态 —— 服务端 `text/event-stream`，客户端用 `aiApi.ts#streamEvents` 那套 `fetch` + `ReadableStream` + `TextDecoder` 手写解析器
- **Why**:
  1. 面试提交消息必须带 `{ content }` body，原生 `EventSource` 不支持 POST，自然排除 B
  2. 仓库已有验证过的客户端解析器，复用零成本
  3. 后端 Spring `SseEmitter` 与简历助手用同一种实现，前后端契约统一
- **Event schema**（待落地确认细节）:
  ```
  event: message  → data: { delta: "增量文本", messageId: "..." }
  event: done     → data: { messageId: "...", finalContent: "完整文本" }
  event: error    → data: { code: "...", message: "..." }
  ```
- **Consequences**:
  - 把 `streamEvents` 抽到公共位置（如 `frontend/src/shared/sse/streamEvents.ts`），AI 助手与面试两处共用
  - 后端新增 `POST /api/interviews/{id}/messages/stream`（保留旧 `POST .../messages` 一段时间或直接替换 —— 留给 Q4 决定）
  - 前端 `submitInterviewMessage` 改写为流式调用，InterviewPage 状态管理需支持"在途消息"概念

### A2 — 渲染范围 / 输入侧 UX（已定）

- **Decision**: 双侧（AI/面试官 + 用户/候选人）都渲染 markdown，且为用户输入框增配 markdown 工具条 + 实时预览
- **Why**: 面试场景候选人贴代码答题是高频刚需；增加 toolbar/preview 让候选人不需要懂 markdown 语法也能产出格式化内容，避免"双侧渲染但用户不会写"的体验断层
- **Consequences**:
  - UI 改动量增大：两个会话界面（AiResumeAssistant、InterviewPage）的输入区都要重做，从 `Input.TextArea` 升级为带 toolbar 的 markdown 编辑器
  - 工具条需求：粗体 / 斜体 / 代码块 / 列表 / 链接（最小集），其余靠用户手写
  - 实时预览方案待定：tab 切换（编辑/预览）vs 双栏并排 —— 留到设计阶段再决（不阻塞 brainstorm）
  - 两侧使用同一个 markdown renderer 组件，避免双份维护
  - 用户气泡的 markdown 输出需保留原始 raw 文本（编辑/复用时不丢失）

## Requirements (evolving)

- AI 简历助手 bubble 支持 Markdown 渲染（assistant 消息）
- 面试对话 bubble 支持 Markdown 渲染（INTERVIEWER 消息）
- 面试 AI 回复改为 SSE 流式输出，前端逐字呈现
- 流式中断/失败时前端有兜底（显示已收到内容 + 错误提示）

## Acceptance Criteria (evolving)

- [ ] AI 助手回复包含 `**bold**`、列表、代码块时，UI 正确渲染为格式化文本而非字面量
- [ ] 面试官回复包含同类 markdown 时，UI 正确渲染
- [ ] 候选人发送消息后，面试官回复**逐字流式显示**（非整段一次性出现）
- [ ] 流式过程中刷新页面或关闭，已落库的消息不丢失
- [ ] SSE 异常（断网、超时）时前端给出明确提示，不卡死 loading
- [ ] 用户输入的纯文本不会被误解析为 markdown（如用户发 `**xxx**` 仍按字面量显示，或在用户气泡里也支持？—— 待确认）

## Definition of Done

- 单测：markdown 渲染组件覆盖 bold/list/code/heading/link 等关键节点
- 集成测：面试 SSE 端到端（候选人提交 → 流式接收 → 落库）
- Lint / typecheck / 后端 mvn test 全绿
- 兼容性：Edge / Chrome / Safari 主流版本（SSE 在 Safari iOS 部分版本有坑，需验证）
- 安全：assistant 内容来自 AI，需做基础 XSS 防护（白名单或 sanitize-html）

## Out of Scope (explicit)

- (待确认) 不实现 KaTeX / Mermaid / 自定义指令等高级 markdown 扩展
- (待确认) 不重构现有简历字段的 bold-only 渲染管线（独立体系）
- (待确认) 用户/候选人输入侧不做 markdown 渲染

## Technical Notes

- 已有 SSE 客户端模板：`frontend/src/features/ai/api/aiApi.ts:87-151` `streamEvents`
- 已有 SSE 服务端模板：`InterviewReportPanel.tsx` 消费的 `/api/interviews/{id}/report/events`
- 后端面试服务持久化点：`InterviewService.submitMessage` → `appendMessage(... "INTERVIEWER" ...)`
- 前端 InterviewPage 是单文件 1000+ 行，改动需谨慎拆分

## Research References

(待研究后填充)
