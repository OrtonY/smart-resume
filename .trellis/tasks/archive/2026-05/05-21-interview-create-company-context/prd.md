# brainstorm: interview creation modal and company context

## Goal

优化面试中心的新建体验与上下文信息注入能力：将“新建面试”改为居中弹框，支持更直观地控制面试官轮次顺序，并在创建时可选输入目标公司，让系统仅在创建阶段调用 AI 提炼公司相关信息，后续面试轮次直接把该信息注入 Prompt，从而让提问更贴近目标公司但不过度收窄题面范围；同时在列表筛选、面试卡片、面试对话页顶部适度展示公司信息。

## What I already know

* 当前新建面试入口位于 `frontend/src/pages/InterviewPage.tsx`，使用右侧 `Drawer` 打开表单。
* 当前新建表单字段只有 `resumeId`、`title`、`jobDescription`、`difficulty`、`interviewerRoles`。
* 当前面试官选择是 `Select mode="tags"`，顺序来自数组顺序，但没有可视化排序交互。
* 简历编辑页 `frontend/src/pages/WorkspacePage.tsx` 已经引入并使用 `@dnd-kit`，说明项目内已有拖拽排序模式可复用。
* 前端 `InterviewCreatePayload`、列表/详情类型暂不包含目标公司或公司信息字段。
* 后端 `InterviewCreateRequest` 与 `InterviewSessionEntity` 暂不包含目标公司或公司信息字段。
* 数据库 `interview_sessions` 由 Flyway 迁移维护，当前已有 `V10`、`V11`、`V14` 等迁移，新增字段需要追加新 migration。
* 后端 `InterviewService` 在创建面试和轮次推进时会生成系统 Prompt，Prompt 构造集中在 `InterviewPromptBuilder`。
* 项目内已有 `aiChatService.callStructured(...)` 的结构化 AI 调用模式，可用于一次性提炼公司画像。

## Assumptions (temporary)

* “中间弹框式出现”默认采用 `Modal`，而不是继续使用侧边 `Drawer`。
* 面试官顺序将继续决定轮次顺序，即第 1 个面试官负责第 1 轮，第 2 个负责第 2 轮，以此类推。
* 目标公司是可选字段；未填写时保持现有行为。
* 公司相关信息只在创建面试时通过 AI 获取一次并持久化；后续消息流、继续面试、切轮次都复用已保存信息，不重复调用。
* 若公司信息提炼失败，推荐降级为“仍允许创建面试，但不注入公司上下文”，避免阻塞用户开场。

## Open Questions

* 无

## Requirements (evolving)

* 新建面试从右侧抽屉改为居中弹框。
* 新建面试表单支持配置面试官顺序，用户可以通过拖动或等效的直观交互调整先后顺序。
* 新建面试新增“目标公司（可选）”输入项。
* 仅在新建面试时调用 AI，基于目标公司提炼主营业务与公司特点等上下文信息。
* 后续所有面试轮次都使用已保存的公司信息注入 Prompt，不重复调用 AI。
* Prompt 设计要让题目“适度贴近目标公司”，不能导致所有问题都围绕公司信息，避免面试范围过窄。
* 若存在公司信息，需要在筛选条件、面试卡片、面试对话上方体现。
* 公司信息展示采用轻量增强方案：
* 筛选区新增单独的“目标公司”筛选项。
* 面试卡片展示公司名。
* 面试详情顶部展示公司名，以及 2~3 条 AI 提炼的业务/特点摘要。
* 若目标公司信息提炼失败，仍允许创建面试，但按普通面试开始，并提示用户公司信息获取失败。

## Acceptance Criteria (evolving)

* [ ] 点击“新建面试”后，表单以居中弹框打开，原有创建流程可继续完成。
* [ ] 用户能在新建面试弹框中明确调整面试官顺序，创建后轮次顺序与配置一致。
* [ ] 用户可选填写目标公司；未填写时创建流程与现状兼容。
* [ ] 填写目标公司时，系统只在创建阶段调用一次 AI 提炼公司信息并持久化。
* [ ] 后续获取详情、继续面试、切换轮次、发送消息时复用保存的公司信息，不重复提炼。
* [ ] Prompt 中会参考公司业务/特点，但不会让每一题都强绑定公司背景。
* [ ] 面试列表支持单独按目标公司筛选。
* [ ] 面试卡片可看到目标公司名。
* [ ] 面试详情顶部可看到目标公司名，以及 2~3 条 AI 提炼的业务/特点摘要。
* [ ] 若公司信息提炼失败，面试仍能创建成功，并以普通面试模式运行。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 不做“编辑已创建面试的目标公司/公司信息”能力。
* 不做面试开始后再次刷新或重新抓取公司信息的能力。
* 不做全量联网公司检索/自动补全产品能力，先仅支持用户手输公司名称。

## Technical Notes

* 主要前端入口：`frontend/src/pages/InterviewPage.tsx`
* 相关前端类型/API：`frontend/src/features/interview/types.ts`、`frontend/src/features/interview/api/interviewApi.ts`
* 主要后端入口：`backend/src/main/java/com/smartresume/interview/controller/InterviewController.java`
* 主要后端服务/Prompt：`backend/src/main/java/com/smartresume/interview/service/InterviewService.java`、`backend/src/main/java/com/smartresume/interview/service/InterviewPromptBuilder.java`
* 面试会话实体：`backend/src/main/java/com/smartresume/interview/domain/InterviewSessionEntity.java`
* 数据迁移：`backend/src/main/resources/db/migration/V10__create_interview_sessions.sql`、`V11__interview_jd_nullable.sql`、`V14__interview_session_timer_fields.sql`
* 现有拖拽排序参考：`frontend/src/pages/WorkspacePage.tsx`

## Decision (ADR-lite)

**Context**: 目标公司信息既要对创建后的面试上下文有价值，又不能让列表和详情界面变得过重。  
**Decision**: 采用轻量增强方案：筛选区增加目标公司筛选，卡片展示公司名，详情顶部展示公司名与 2~3 条公司业务/特点摘要。  
**Consequences**: 列表信息密度可控，详情页能承载更多上下文；需要后端提供公司名与摘要字段，并在前端控制摘要展示长度。

**Context**: 目标公司是可选增强信息，不能因为 AI 一次提炼失败而阻断用户开始面试。  
**Decision**: 创建时如果 AI 未能成功提炼公司信息，仍允许面试创建成功，但不注入公司上下文，并明确提示已按普通面试开始。  
**Consequences**: 创建成功率更高，用户体验更稳；后端需要把公司信息提炼设计为 best-effort，而不是强依赖。
