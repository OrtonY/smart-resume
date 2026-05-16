# ai config and resume chat

## Goal

为简历编辑页增加 AI 配置入口和悬浮对话助手。用户可以在右上角配置 AI 厂商、Base URL、API Key 和模型名；在右下角打开仅编辑页可见的悬浮对话入口，并围绕当前简历进行流式对话。对话历史保存在后端数据库，用户可以选择历史会话继续对话。

## Requirements

* 在简历编辑页右上角提供 AI 配置按钮。
* AI 配置支持厂商、Base URL、API Key、模型名。
* 厂商下拉提供常见预设选项，至少包含 `OpenAI`、`Ollama`、`DeepSeek`、`Anthropic`、`Azure OpenAI`、`Other`。
* `Ollama` 允许不填写 API Key，其它厂商仍按需校验 API Key。
* 在简历编辑页右下角提供可拖动的 AI 悬浮入口。
* 悬浮入口仅在简历编辑页显示。
* 点击悬浮入口后打开对话框，并绑定当前简历上下文。
* 对话内容需要流式输出，前端逐步渲染 token/chunk，而不是等待整句完成。
* 后端 AI 对话接口使用 Reactor `Flux` 作为流式响应模型。
* 后端使用 Spring AI 直接调用 `ChatModel.stream(Prompt)`。
* 对话历史由后端保存，前端只发送当前消息和可选会话 ID，不传完整历史。
* 同一简历下允许多个会话。
* 用户可以在对话框中查看历史会话列表，并选择某个会话继续对话。

## Acceptance Criteria

* 简历编辑页可以看到 AI 配置按钮。
* AI 配置可保存厂商、Base URL、API Key、模型名。
* Ollama 可在不填写 API Key 的情况下保存并使用。
* 简历编辑页右下角显示可拖动 AI 入口，其他页面不显示。
* 打开 AI 入口后可看到当前简历绑定信息。
* 对话响应为流式输出，前端持续追加内容。
* 后端对话接口返回 SSE/Flux 流式事件。
* 对话历史存储在后端，可在列表中按会话查看。
* 用户可选择旧会话并继续发送新消息。
* 项目 lint、build、测试通过。

## Out of Scope

* 自动修改简历内容。
* 通用多页面 AI 助手入口。
* 语音输入。
* 多用户协同。
* AI 配置测试连接能力。

