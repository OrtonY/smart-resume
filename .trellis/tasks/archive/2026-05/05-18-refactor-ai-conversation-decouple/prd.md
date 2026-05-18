# Refactor: AI Conversation Decoupling

## Goal

将 AI 调用能力从 `AiAgentService`（简历对话专用）中解耦，构建可复用的 AI 服务层，使简历对话、简历评分、面试模拟、面试报告四个功能共享统一的 AI 调用基础设施。

## What I already know

### 当前架构
- **Provider 层已解耦**: `ChatModelProvider` + `ChatModelProviderRegistry` 策略模式，支持 OpenAI/DeepSeek/Ollama
- **唯一真实 AI 调用**: `AiAgentService.streamChat()` — 仅用于简历 AI 对话
- **三个 mock 功能**: 简历评分(`AiResumeScoringService`)、面试模拟(`InterviewService`)、面试报告(`buildReportPlaceholder`)
- **共享基础设施**: `JdbcChatMemoryRepository` 已被简历对话和面试模块共用
- **配置单例**: `ai_configurations` 表只有一行 (id=1)，所有功能共享同一 vendor/apiKey/model

### 关键文件
- `AiAgentService.java` — 核心 chat 服务，hardcode 简历对话 system prompt
- `AiResumeScoringService.java` — 规则评分，无 AI 调用
- `InterviewService.java` — 模板消息，无 AI 调用
- `AiController.java` — 所有 `/api/ai/*` 端点
- `InterviewController.java` — `/api/interviews/*` 端点

### 技术栈
- Spring Boot 3.5.13 + Java 21
- Spring AI 1.1.5 (spring-ai-alibaba BOM)
- MyBatis Flex + PostgreSQL + Flyway
- React 19 + TypeScript 前端

## Assumptions (temporary)

* 保持 Provider 层 (`ChatModelProvider`) 不变，它已经是解耦的
* 保持 `JdbcChatMemoryRepository` 作为共享记忆存储
* 配置仍为单例模式（所有功能共享同一 AI 配置）
* 前端 SSE 流式调用模式保持不变

## MVP Scope (locked)

* 提取 `AiChatService` 薄抽象层（streaming + 同步两种调用）
* 迁移现有简历对话到新抽象层（行为不变，回归验证）
* **简历评分**作为试金石接入真实 AI 调用
* 面试模拟、面试报告：保留 mock，后续独立任务接入

## Scoring Decision

**Mode**: 同步 (`chatModel.call(prompt)`)
**Output format**: 使用 Spring AI `BeanOutputConverter<AiResumeScoreResponse>` 强制 JSON
- OpenAI/DeepSeek 等支持 `response_format: json_schema` 的 vendor 走原生 schema 强制
- Ollama / 不兼容端点 走软约束（schema 注入 prompt + Jackson 解析）
**Fallback policy**: 解析失败重试 1 次（同 prompt 重新调用），仍失败则向前端报错（不回退 mock）
**Frontend**: 保持现有 UI；`mode` 字段从 `"mock"` 改为 `"ai"`

## API Shape (locked)

```java
public interface AiChatService {
    Flux<AiChatEvent> stream(AiInvocationRequest request);
    String call(AiInvocationRequest request);
    <T> T callStructured(AiInvocationRequest request, Class<T> responseType);
}

public record AiInvocationRequest(
    String systemPrompt,
    String userMessage,
    String conversationId    // 必填，由 AiConversationIdGenerator 生成
) {}
```

- `stream()` → 简历对话、未来面试模拟
- `call()` → 自由文本同步场景（未来面试报告 prose）
- `callStructured()` → 评分等需要结构化解析的场景；内部封装 `BeanOutputConverter` + 软约束 + 重试 1 次的 fallback policy
- 所有调用都会自动写入 `spring_ai_chat_memory`（无条件持久化，便于追溯）

## Conversation ID Management (locked)

所有 AI 对话都持久化到 `spring_ai_chat_memory`，主键 ID 由统一工具类生成，便于追溯与未来按功能/简历维度查询。

```java
public enum AiFeatureType {
    RESUME_CHAT("resume_chat"),
    RESUME_SCORE("resume_score"),
    INTERVIEW("interview"),
    INTERVIEW_REPORT("interview_report");

    private final String code;
    AiFeatureType(String code) { this.code = code; }
    public String getCode() { return code; }
}

public final class AiConversationIdGenerator {
    private static final DateTimeFormatter TS_FORMAT =
        DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    public static String generate(String resumeId, AiFeatureType feature) {
        String resumePart = (resumeId == null || resumeId.isBlank()) ? "default" : resumeId;
        return resumePart + "_" + feature.getCode() + "_" + LocalDateTime.now().format(TS_FORMAT);
    }
}
```

**ID 格式**: `{resumeId|default}_{featureCode}_{yyyyMMddHHmmssSSS}`

**示例**:
- `abc123_resume_chat_20260518155601333`
- `default_resume_score_20260518155602045`
- `xyz789_interview_20260518155603102`
- `xyz789_interview_report_20260518160001234`

**使用约定**:
- 简历对话：首次创建会话时生成新 ID，后续同一会话复用（保持现有"多轮 chat 共享 memory"行为）
- 简历评分：每次评分调用生成新 ID（独立调用，无延续）
- 面试模拟：每个面试 session 创建时生成新 ID（替代现有 `interview-{uuid}` 格式）
- 面试报告：每次生成报告时生成新 ID（独立调用）
- 评分和报告**不**对前端提供历史查询接口，但数据需保留以备追溯

## Code Organization (locked)

```
com.smartresume.ai
├── service/
│   ├── AiChatService.java          (新增, 通用 AI 调用)
│   ├── AiChatServiceImpl.java      (新增, 内部使用 ChatModelProviderRegistry)
│   ├── AiAgentService.java         (保留, 简历对话 facade, 调用 AiChatService.stream)
│   ├── AiResumeScoringService.java (改造, 调用 AiChatService.callStructured)
│   ├── AiChatHistoryService.java   (改造, 使用 AiConversationIdGenerator)
│   └── AiConfigurationService.java (不变)
├── memory/
│   ├── AiFeatureType.java          (新增 enum)
│   └── AiConversationIdGenerator.java (新增 工具类)
├── dto/
│   ├── AiInvocationRequest.java    (新增 record)
│   └── AiDtos.java                 (现有)
└── provider/                       (不变)
```

- `AiAgentService` 保留：负责简历专属 prompt 组装、conversationId resolve（内部用 generator 生成新会话 ID）、SSE 字符级延迟
- `AiResumeScoringService` 改造：mock 评分 → 调用 `AiChatService.callStructured(req, AiResumeScoreResponse.class)`，每次生成新 conversationId
- `AiChatService` 新增：封装 ChatModel 创建、Prompt 构造、memory 操作、结构化输出 fallback policy；所有调用无条件写入 `spring_ai_chat_memory`
- `AiConversationIdGenerator` 新增：统一 ID 生成入口，未来面试/报告接入时复用
- 字符级延迟（12ms）只在 `AiAgentService` 中保留（chat 场景专属）

## Open Questions

* （已全部解决）

## Decision (ADR-lite)

**Context**: 四个功能（简历对话、评分、面试、报告）需要共享 AI 调用基础设施，但当前只有简历对话使用真实 AI，其他三个是 mock。
**Decision**: 采用方案 A — 薄服务层 `AiChatService`，提供 `stream()` 和 `call()` 两个基础方法。各业务在自己的 Service 里组装 system prompt 和上下文，调用 `AiChatService` 完成 AI 调用。
**Consequences**:
- 优点：改动最小、各业务保留控制权、不强制统一 request/response 协议
- 缺点：每个业务自行管理 conversation 和 memory（公共逻辑会被提取到 `AiChatService`）
- 后续：如果三个新业务出现明显的重复模式，再向上抽象（如 Agent 注册模式）

## Requirements (final)

* 提取通用 `AiChatService` 抽象层，提供 `stream()` / `call()` / `callStructured()` 三个方法
* 把简历对话现有逻辑迁移到 `AiAgentService` 调用 `AiChatService.stream(...)`，行为不变
* 把简历评分从 mock 升级为真实 AI 调用，使用 `AiChatService.callStructured(...)` + `BeanOutputConverter`
* JSON 解析失败重试 1 次，仍失败则返回错误（不回退 mock）
* 面试模拟和面试报告：保持现有 mock 实现，本次不接入

## Acceptance Criteria (final)

* [ ] `AiChatService` 接口 + 实现完成，单元测试覆盖三个方法的 happy path 和异常路径
* [ ] `AiAgentService.streamChat()` 行为回归通过：简历对话 SSE 字符级输出、memory 持久化、conversationId 解析
* [ ] `AiResumeScoringService.scoreResume()` 返回 `mode: "ai"` 的真实评分；评分内容为 `AiResumeScoreResponse` schema
* [ ] OpenAI/DeepSeek 走原生 JSON Schema；Ollama 走软约束 prompt 注入
* [ ] 解析失败重试 1 次后报错，前端能正确展示错误信息
* [ ] 现有 `/api/ai/chat/stream`、`/api/ai/resume-score` 端点 URL 不变
* [ ] Provider 层 (`ChatModelProvider`) 无修改

## Definition of Done

* Lint / typecheck / CI green
* 现有功能回归通过
* 新增功能有对应的单元测试

## Out of Scope (explicit)

* Provider 层重构（已经解耦）
* 配置多租户化（保持单例）
* 前端 UI 大改（仅适配新 API）

## Technical Notes

* `AiAgentService` 的 streaming 逻辑（字符级延迟 12ms、fallback 到同步调用）可提取为通用 streaming 基础设施
* `InterviewService` 已经向 `JdbcChatMemoryRepository` 写入消息，可直接复用
* 简历评分目前是同步接口，升级为 AI 后需考虑是保持同步还是改为 streaming
