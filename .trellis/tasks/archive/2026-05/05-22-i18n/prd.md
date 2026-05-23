# i18n: 前后端中英文国际化改造

## Goal

让 Smart Resume 支持中文与英文两种用户界面语言，覆盖前端 UI、后端面向用户的错误消息、简历模板的展示元数据。用户可在前端切换语言，并在会话间保持选择。

## What I already know

### 前端
- React 19 + Vite 8 + TypeScript 6
- AntD 6（已用 `ConfigProvider`，未传 `locale`，未配 i18n）
- 路由 react-router-dom v7
- 中文文案：20 个文件，**645 处**，集中在五大页面 + AI/Interview 组件
  - `WorkspacePage.tsx` 215 / `TemplateGalleryPage.tsx` 104 / `InterviewPage.tsx` 82 / `AiResumeAssistant.tsx` 53
  - `AuthPage.tsx` 27 / `ResumePreview.tsx` 27 / `InterviewReportPanel.tsx` 25
- 当前没有任何 i18n 库依赖

### 后端
- Spring Boot 3.5.13 + Java 21 + MyBatis-Flex + Flyway
- 当前没有 `MessageSource` / `messages_*.properties` / `Accept-Language` 处理
- `GlobalExceptionHandler` 直接返回硬编码消息
- 中文文案分布：
  - **本期内**：`templates/catalog.json` 12 处（模板名/描述）+ 异常和校验消息（散落在 service / controller 层，需扫描）
  - **本期不动**：`InterviewPromptBuilder` 75 / `AiAgentService` 30 / `InterviewService` 24 / `InterviewReportService` 22 — 全是 AI prompt 模板

## Scope (本期 MVP)

### In Scope
1. **前端 UI 文案 i18n**：所有用户可见的硬编码中文（按钮、表单、Toast、Modal、表头、tooltip）
2. **AntD 内置文案 i18n**：DatePicker、Pagination、Table 空状态、表单校验提示
3. **后端错误消息 i18n**：`AppException`、`@Valid` 校验消息、`GlobalExceptionHandler` 返回内容；通过 `Accept-Language` 区分
4. **简历模板元数据 i18n**：`catalog.json` + `templateCatalog.ts` 中模板名、描述、tag

### Out of Scope（明确排除）
- AI prompt 模板（`InterviewPromptBuilder` 等 4 个 service）— 改 prompt 会改变模型行为，需独立任务并逐项验证输出质量
- AI 生成内容（面试问题、评估报告）按用户语言生成 — 同上
- 用户填写的简历内容、面试经历、自定义文本 — 这是用户数据，不该 i18n
- 数据库迁移脚本中的预填数据本身（V18 默认管理员等）

## Decisions (locked)

- **D1 — 前端 i18n 库**：`react-i18next` + `i18next` + `i18next-browser-languagedetector`
- **D2 — 默认语言策略**：检测顺序 `localStorage → navigator → 兜底 zh-CN`；用户切换后写入 localStorage
- **D3 — 偏好持久化**：仅 localStorage，不持久化到后端 user profile（个人工具，单浏览器使用为主；后期需要跨设备再加列）
- **D4 — 切换器位置**：Auth 页右上角 + 登录后顶栏右侧（与登出按钮同行），紧凑型 `中 / EN` 切换控件
- **D5 — 翻译资源组织**：按 feature 拆 namespace，与 `frontend/src/features/*` 对齐。位置 `frontend/src/i18n/locales/{lang}/{namespace}.json`。Namespace 列表：`common`、`auth`、`workspace`、`interview`、`template`、`ai`、`share`、`system`。Key 命名 `section.element.property` 三段式
- **D6 — 后端 locale 解析**：`AcceptHeaderLocaleResolver` 解析 `Accept-Language`，兜底 `zh-CN`。前端 axios/fetch 拦截器统一注入 `Accept-Language: ${i18n.language}`。`MessageSource` 用 `ResourceBundleMessageSource` 加载 `messages.properties` + `messages_en.properties`，`@Valid` 校验消息走 `{key}` 占位
- **D7 — 模板 catalog 双语结构**：内联 i18n 对象 `{"zh": "北极星", "en": "North Star"}`。后端 `catalog.json` 的 `name`/`summary`/`category` 改为对象。前端用 `getLocalizedField(field, locale)` helper 取值（string 直接返回，对象按 locale 取）。用户自建模板只填一种语言时存 string 即可

## Open Questions
（全部已解决，见 Decisions）

## Requirements (evolving)

- 前端引入 i18n 库并配置中英文资源
- AntD `ConfigProvider` 根据当前 locale 注入对应 `antd/locale/*` 包
- 所有用户可见的硬编码中文迁移到翻译资源
- 提供语言切换 UI，切换后即时生效（无需刷新）
- 选择持久化（重新打开浏览器仍生效）
- 后端通过 `Accept-Language` 解析 locale，错误消息从 `MessageSource` 取
- 简历模板返回字段支持双语显示

## Acceptance Criteria (evolving)

- [ ] 前端构建通过、lint 通过、类型检查通过
- [ ] 切换语言后 UI 完整切换，无残留硬编码中文 / 英文
- [ ] AntD 组件（DatePicker、Pagination 等）跟随切换
- [ ] 后端返回的错误消息按 `Accept-Language` 切换
- [ ] 简历模板列表在 zh / en 下显示对应名字与描述
- [ ] 浏览器关闭后重新打开仍记住语言选择
- [ ] AI 对话、简历正文、用户输入不被自动翻译

## Definition of Done

- 前后端单元 / 集成测试通过
- ESLint + TypeScript 检查通过；后端 `mvn verify` 通过
- 至少手工验证两条主流程（登录注册、简历编辑、模板选择、面试报告查看）在中英文下表现一致
- 未引入未声明的依赖；所有翻译资源放在约定目录

## Technical Notes

- 前端 AntD 6 自带 `antd/locale/zh_CN` 与 `antd/locale/en_US`，与 i18n 库解耦
- 后端 Spring Boot 内置 `MessageSource` 与 `LocaleResolver`，标准方案为 `AcceptHeaderLocaleResolver` + `ResourceBundleMessageSource`
- 入口文件：`frontend/src/App.tsx` → `AppProviders.tsx`（注入 ConfigProvider 的位置）
- 后端校验需要 `messages.properties` / `messages_en.properties` 配合 `@Valid` 注解的 `{key}` 占位

## Decision (ADR-lite)

待 Q&A 收敛后填写。
