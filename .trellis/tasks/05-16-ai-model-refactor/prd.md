# AI模型集成模块化重构 + DeepSeek适配

## Goal

当前后端 AI 模型集成逻辑集中在 `AiAgentService.createChatModel()` 一个工厂方法中，通过 vendor 字符串做 if/else 分支。随着支持的模型供应商增多，这种方式缺乏扩展性和清晰的模块边界。需要将 AI 模型集成重构为模块化策略模式架构，每个供应商有独立的适配器，并正式增加 DeepSeek 模型的专属适配，同时优化配置体验（元信息接口 + 动态获取模型列表）。

## Requirements

* 引入策略模式 + Spring 自动注册，每个 vendor 一个 `ChatModelProvider` 实现类
* 每个 vendor 使用各自最适合的 SDK：
  - OpenAI：`spring-ai-openai`（通用 OpenAI-compatible 通道，可接任意兼容端点）
  - Ollama：`spring-ai-ollama`
  - DeepSeek：`spring-ai-openai` 内部封装，带 DeepSeek 默认 base_url
* MVP 范围：OpenAI + Ollama + DeepSeek 三个独立 provider，其余 vendor fallback 到 OpenAI 通用通道
* Provider 内置默认 base_url（如 DeepSeek → `https://api.deepseek.com`），用户可覆盖
* 配置字段（api_key、base_url、model_name）改为非必填，输入框通过 placeholder 提示
* 新增 `GET /api/ai/vendors` 元信息接口：返回各 vendor 的字段定义、默认值、placeholder
* 新增 `POST /api/ai/models` 获取可用模型接口：
  - 前端传参（vendor + apiKey + baseUrl），无需先保存配置
  - OpenAI / DeepSeek：调用 `GET /v1/models`
  - Ollama：调用 `GET /api/tags`
* 前端对接元信息接口，切换 vendor 时自动填充 placeholder 和默认值
* 前端模型名输入框旁增加"获取模型"按钮，点击后展示可选模型下拉列表，保留手动输入能力

## Acceptance Criteria

* [ ] 新增 vendor 只需添加一个 provider 类 + `@Component`，无需修改核心服务代码
* [ ] DeepSeek 模型可通过配置正常调用并流式返回
* [ ] 现有 OpenAI / Ollama 功能不受影响
* [ ] `GET /api/ai/vendors` 返回正确的各 vendor 元信息
* [ ] `POST /api/ai/models` 能根据传入的凭据拉取远端模型列表
* [ ] 前端切换 vendor 时 placeholder 自动更新
* [ ] 前端"获取模型"按钮可正常拉取并展示模型列表

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes

## Decision (ADR-lite)

**Context**: `createChatModel()` 使用 if/else 硬编码分支，新增 vendor 需修改核心服务
**Decision**: 策略模式 + Spring `@Component` 自动注册。接口 `ChatModelProvider` 定义 `supports()`, `createChatModel()`, `listModels()`, `getMetadata()` 方法。
**Consequences**: 新增 vendor 只需加一个类；每个 provider 封装特有逻辑；类数量增加但职责清晰。

## Technical Approach

### 新建包结构
```
com.smartresume.ai.provider/
├── ChatModelProvider.java          (接口)
├── VendorMetadata.java             (元信息 DTO)
├── impl/
│   ├── OpenAiChatModelProvider.java
│   ├── OllamaChatModelProvider.java
│   └── DeepSeekChatModelProvider.java
└── ChatModelProviderRegistry.java  (注入 List<Provider>，按 vendor 查找)
```

### Provider 接口设计
```java
public interface ChatModelProvider {
    boolean supports(String vendor);
    ChatModel createChatModel(AiConfigurationEntity config);
    List<String> listModels(String baseUrl, String apiKey);
    VendorMetadata getMetadata();
}
```

### AiAgentService 改造
- 注入 `ChatModelProviderRegistry`
- `createChatModel()` 委托给 registry 查找对应 provider
- 移除原有 if/else 分支

### 新增 API 端点
- `GET /api/ai/vendors` → 返回所有已注册 provider 的 metadata
- `POST /api/ai/models` → body: `{vendor, baseUrl, apiKey}` → 返回 `List<String>`

### 前端改动
- 配置面板对接 `/api/ai/vendors`，切换 vendor 时更新 placeholder
- 模型名字段旁增加"获取模型"按钮，调用 `/api/ai/models`
- 模型选择支持下拉 + 手动输入双模式

## Out of Scope

* DeepSeek R1 reasoning 模式（思维链 `<think>` 标签解析）
* 数据库 schema 变更
* Anthropic / Azure OpenAI 独立 provider（后续迭代）

## Implementation Plan

* PR1: 后端模块化骨架 — provider 接口 + registry + 3 个实现 + AiAgentService 改造
* PR2: 后端新接口 — vendors 元信息 + models 列表
* PR3: 前端对接 — 配置面板 placeholder + 获取模型按钮

## Technical Notes

* 核心文件：`backend/src/main/java/com/smartresume/ai/service/AiAgentService.java`
* 配置实体：`backend/src/main/java/com/smartresume/ai/domain/AiConfigurationEntity.java`
* Spring AI 依赖：`spring-ai-openai`, `spring-ai-ollama`
* DeepSeek base_url: `https://api.deepseek.com`
