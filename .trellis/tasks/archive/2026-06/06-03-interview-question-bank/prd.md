# brainstorm: 增加面试题库

## Goal

在当前面试功能基础上增加用户自建面试题库能力，让用户可以围绕岗位、技能或场景维护问题集合，并在 AI 面试中按标签引用部分题目来辅助出题。

## What I already know

* 用户希望“在当前面试基础上增加面试题库”。
* 需要先理解现有面试功能的数据流、页面和后端接口，再确定题库的最小可行范围。
* 项目是 Spring Boot 后端 + React/Vite 前端，已有完整面试中心。
* 现有面试支持：创建面试、目标公司上下文、难度、面试官角色、多轮对话、流式 AI 回复、AI 参考答案/评分、面试报告。
* 当前问题由 AI 根据简历、JD、难度、面试官角色、公司上下文和历史轮次主题动态生成；没有独立题库实体、题目来源字段或题库 API。
* 前端面试中心入口是 `/app/interviews`，创建弹窗目前采集简历、标题、目标公司、JD、难度、面试官角色。
* 后端面试 API 当前挂在 `/interviews`，前端经 `/api/interviews` 调用。

## Assumptions (temporary)

* 当前项目已经有面试模拟或面试相关功能。
* 题库可能需要支持前端浏览/选择，并与现有面试流程衔接。
* 题库需要独立浏览/管理入口。
* 题库可以作为面试生成的约束/素材来源，而不是替代现有 AI 面试流程。
* 不需要默认/系统预置题库，用户自己创建题库和题目。
* AI 出题时不能全量查询题库，应根据标签获取部分题目注入上下文。
* 题目注入必须只注入后端已抽中的题目，不允许把候选题全集注入 prompt 后再让 AI 选择。

## Open Questions

* None.

## Requirements (evolving)

* 在现有面试体验基础上增加题库入口或题库选择能力。
* 保持现有 AI 面试流程可用；未选择题库时应继续按简历/JD/角色动态生成问题。
* 题库与当前用户权限体系兼容，用户只能访问自己可用的题库/题目。
* MVP 包含题库独立入口，用户可以浏览题库和题目。
* 用户可以对自己的题库进行增删改查。
* 题库字段第一版包含：名称、描述、手动维护的题库标签。
* 用户可以对自己题库中的题目进行增删改查。
* 创建面试时可以选择一个题库。
* 创建面试时用户手动选择题库标签，后端按所选标签检索部分题目。
* 创建面试选择题库后，标签可选；不选标签时从整个题库中限量取部分题目。
* 创建面试时可以选择题库相关度，采用“低 / 中 / 高”三档，避免整场面试完全围绕题库导致问题重复。
* 题库内容应作为问题生成的素材/约束，而不是强制逐题照搬。
* 低相关度：题库只提供少量主题参考，面试仍主要围绕简历、JD、角色和候选人回答动态生成。
* 中相关度：题库提供本轮主要参考方向，但 AI 仍可根据候选人回答追问和切换问题。
* 高相关度：优先覆盖题库核心题目或主题，但仍要求避免逐题机械复述，并保留必要追问。
* 按题库相关度限制每次注入的题目数量：低最多 3 题，中最多 5 题，高最多 8 题。
* 题库由用户创建，不提供默认/系统预置题库。
* 题目数据第一版包含：题目、难度、标签、考察点。
* 题目标签必须从所属题库维护的标签中选择，不能使用题库外标签。
* AI 生成面试问题时，后端按标签从选定题库中获取部分题目，不全量查询或注入题库。
* 后端先完成限量随机抽样，再只把抽中的题目和考察点注入 prompt。
* 题库检索采用随机抽样，避免每次都命中同一批题目。
* 同一场面试内，后端用内存 HashMap 轻量维护已注入过的题目 ID，后续抽样排除这些题目；不做数据库持久化。
* 已用题目去重范围是整场面试，从创建到结束尽量不重复注入同一道题。
* 用户选择多个标签时，题目匹配任一标签即可进入候选集。
* 不为面试创建题库快照；后续 AI 出题根据当前题库内容实时检索，无需追溯历史。
* 已创建面试引用的题库被删除、不可用或无匹配题目时，静默回退到现有 AI 面试出题逻辑。

## Acceptance Criteria (evolving)

* [ ] 用户可以访问面试题库相关能力。
* [ ] 面试中心提供题库入口，用户可以浏览题库和题目。
* [ ] 用户可以创建、编辑、删除自己的题库。
* [ ] 题库支持维护名称、描述、标签。
* [ ] 用户可以在自己的题库中创建、编辑、删除题目。
* [ ] 题库能力可以与现有面试流程形成清晰连接。
* [ ] 创建面试时，用户可以在选定题库后手动选择标签。
* [ ] 创建面试选择题库但不选标签时，后端从整个题库限量获取部分题目。
* [ ] 未选择题库时，现有创建面试和对话行为不回退。
* [ ] 用户创建面试时选择题库相关度后，后端 prompt 明确限制题库内容占比。
* [ ] 题库相关度支持低 / 中 / 高三档，并在前端创建面试表单中可选。
* [ ] 每道题包含题目、难度、标签、考察点。
* [ ] 题目创建/编辑时只能选择所属题库已有标签。
* [ ] AI 面试出题时只按标签加载选定题库中的部分题目。
* [ ] Prompt 中只包含后端抽中的题目，不包含候选题全集。
* [ ] 题库限量取题采用随机抽样。
* [ ] 同一场面试内避免重复注入已使用题目。
* [ ] 已用题目去重范围覆盖整场面试，而不是单轮次。
* [ ] 已用题目记录仅保存在内存中，不持久化；应用重启后允许丢失。
* [ ] 多标签检索采用任一标签匹配。
* [ ] 按相关度控制每次注入题目数量：低 3 / 中 5 / 高 8。
* [ ] 修改题库或题目后，后续 AI 出题使用最新题库内容。
* [ ] 未匹配到标签题目时，AI 面试可以回退到现有简历/JD/角色驱动的动态出题。
* [ ] 已选题库被删除或不可用时，后续 AI 面试静默回退到现有动态出题逻辑。
* [ ] AI 面试仍优先结合简历、JD、面试官角色、难度和候选人回答动态追问。
* [ ] 后端新增能力有针对性测试覆盖。
* [ ] 前端类型、接口和国际化同步更新。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 批量导入题库。
* 公开共享题库。
* 复杂推荐算法。
* 题目作答统计分析。
* 默认/系统预置题库。

## Technical Notes

* 规格：`.trellis/spec/backend/interview-simulation.md`
* 后端相关文件：
  * `backend/src/main/java/com/smartresume/interview/controller/InterviewController.java`
  * `backend/src/main/java/com/smartresume/interview/service/InterviewService.java`
  * `backend/src/main/java/com/smartresume/interview/service/InterviewPromptBuilder.java`
  * `backend/src/main/java/com/smartresume/interview/dto/InterviewDtos.java`
  * `backend/src/main/resources/db/migration/V10__create_interview_sessions.sql`
* 前端相关文件：
  * `frontend/src/pages/InterviewPage.tsx`
  * `frontend/src/features/interview/components/InterviewCenterView.tsx`
  * `frontend/src/features/interview/components/InterviewCreateModal.tsx`
  * `frontend/src/features/interview/types.ts`
  * `frontend/src/features/interview/api/interviewApi.ts`
  * `frontend/src/i18n/locales/zh-CN/interview.json`
  * `frontend/src/i18n/locales/en-US/interview.json`
* 现有表包括 `interview_sessions`、`interview_messages`、`interview_round_topics`、`interview_ai_assists`，题库需要新迁移。
* 现有问题生成限制在 `InterviewPromptBuilder.buildInterviewRules(...)`，题库约束适合接入系统 prompt 或创建面试首问逻辑。

## Technical Approach

* 新增用户题库和题目数据模型，题库属于当前用户，题目属于题库。
* 题库字段：名称、描述、标签。
* 题目字段：题目、难度、标签、考察点；题目标签必须来自所属题库标签。
* 新增题库 CRUD API 和前端题库管理入口。
* 面试创建请求增加题库 ID、可选标签列表、题库相关度三档。
* 创建面试选择题库但不选标签时，从整个题库随机取题；选择多个标签时匹配任一标签。
* AI 出题前按当前题库内容实时随机检索部分题目，不做快照。
* 后端先按题库、标签、相关度和已用题目排除规则完成限量抽样，再只注入抽中的题目。
* 题目注入数量按相关度控制：低 3 / 中 5 / 高 8。
* 后端用内存 HashMap 记录整场面试已注入题目 ID，后续抽样排除；不持久化，应用重启后允许丢失。
* 题库被删除、不可用或无匹配题目时，静默回退到现有 AI 面试逻辑。

## Implementation Plan (small PRs)

* PR1: 后端迁移、实体/Mapper、题库与题目 CRUD API、权限和基础测试。
* PR2: 前端题库管理入口、题库/题目列表与表单、国际化和类型。
* PR3: 面试创建表单接入题库、标签、相关度；后端 prompt 注入、随机抽样、内存去重和回退测试。

## Feasible Approaches

### Approach A: 系统预置题库 + 创建面试时选择

* How: 新增题库/题目表和查询 API，先由系统迁移或种子数据提供题库；创建面试时可选题库/分类，AI 按题库题目或题库主题生成问题。
* Pros: MVP 清晰、实现范围可控、质量稳定、适合验证“题库是否有用”。
* Cons: 用户暂时不能维护自己的题库，题库内容扩展需要后续开发或种子数据更新。

### Approach B: 用户个人题库 CRUD + 创建面试时选择（Selected）

* How: 新增用户可管理的题库列表、题目增删改查、创建面试时选择自己的题库。
* Pros: 灵活，能覆盖个性化准备场景。
* Cons: 范围更大，涉及管理界面、权限、空题库/删除引用等边界。

### Approach C: 题库浏览/练习独立页，暂不接入 AI 面试

* How: 新增题库页面供用户按分类浏览题目和参考答案，现有面试流程不变。
* Pros: 风险最低，独立上线快。
* Cons: 与“当前面试基础上”连接较弱，不能直接改善模拟面试体验。

## Decision (ADR-lite)

**Context**: 题库能力可以做成预置题库、个人题库管理或独立练习页。当前目标是基于现有面试流程快速增加可用题库，同时避免把模拟面试变成固定刷题。

**Decision**: MVP 采用 Approach B：用户自建题库 CRUD + 创建面试时选择。不提供默认/系统预置题库。同时增加“题库相关度”参数，用于控制题库内容在 AI 问题生成中的参考比例。

**Consequences**: 需要新增题库/题目数据模型、权限规则、管理页面和 CRUD API。题库内容质量由用户维护；批量导入、公开共享、默认题库和统计分析留到后续迭代。题库相关度需要在前后端类型、数据库、创建请求、详情响应和 prompt 规则中保持一致。

### Question Bank Entry

**Context**: 用户希望可以先浏览题库内容，并且自己增删改查题库。

**Decision**: 面试中心增加题库入口；题库可浏览、管理，并可在创建面试时选择。

**Consequences**: 前端需要新增题库管理视图或页面，后端需要新增题库和题目 CRUD API。权限必须确保用户只能管理自己的题库和题目。

### Question Bank Relevance

**Context**: 用户希望选择题库相关度，防止全是题库内容导致面试重复。

**Decision**: 采用低 / 中 / 高三档。

**Consequences**: 三档比百分比更容易被用户理解，也更适合 prompt 约束。实现时需要把每档转成明确面试规则，而不是只把值传给 AI。

### Question Fields

**Context**: 题库数据既要能展示给用户，也要能给 AI 面试提供约束，但第一版需要控制内容维护成本。

**Decision**: 每道题包含题目、难度、标签、考察点，不包含长参考答案。

**Consequences**: 能支撑前端展示、筛选和 prompt 注入；参考答案继续由现有 AI Assist 能力根据具体面试问题生成，避免维护大量静态答案。

### Question Bank Fields

**Context**: 用户希望自建题库，例如题库名为 Java 后端开发，并用 Redis、MQ 等标签组织题目。

**Decision**: 题库字段第一版包含名称、描述、手动维护的题库标签。

**Consequences**: 用户可以按自己的岗位/技术栈组织题库。创建面试时选择题库后，前端应展示该题库维护的标签供用户选择。

### Question Tag Source

**Context**: 题库标签用于组织题目，也用于创建面试时检索部分题目。

**Decision**: 题目标签必须从所属题库维护的标签中选择。

**Consequences**: 标签体系保持一致，后端可以可靠按题库标签检索题目。用户需要先维护题库标签，再给题目标记标签。

### Question Retrieval

**Context**: 用户明确要求 AI 出题时不要全量查询题库，避免上下文过大和题库内容过度主导面试。

**Decision**: 面试生成问题时，根据用户在创建面试时选择的标签，从选定题库中获取部分题目作为上下文。

**Consequences**: 后端需要支持按题库、标签、难度等条件随机限量查询题目；prompt 注入只包含后端抽中的题目和考察点，不包含候选题全集。低相关度最多注入 3 题，中相关度最多注入 5 题，高相关度最多注入 8 题。未命中题目时回退到现有动态出题逻辑。

### Sampling Strategy

**Context**: 用户希望避免题库内容过度重复。

**Decision**: 从匹配题目中随机抽样。

**Consequences**: 同一题库多次使用时更不容易重复命中固定题目。随机性需要通过后端查询实现，并在测试中验证数量和过滤规则，而不是固定题目顺序。

### Used Question Tracking

**Context**: 随机抽样仍可能在同一场面试中重复抽到同一道题。

**Decision**: 用内存 HashMap 轻量维护每场面试已注入过的题目 ID，后续抽样排除这些题目；不做数据库持久化。

**Consequences**: 可以降低同场面试重复题目，同时不引入持久化复杂度。去重范围覆盖整场面试。应用重启、实例切换或内存清理后，已用题目记录允许丢失。

### Tag Match Rule

**Context**: 用户创建面试时可以选择多个标签。

**Decision**: 多标签检索采用任一标签匹配。

**Consequences**: 题目更容易命中，适合用户题库规模较小时的面试场景。后续如果需要更精准检索，可增加高级筛选。

### Snapshot Policy

**Context**: 题库/题目编辑后，可能影响已创建但尚未结束的面试。

**Decision**: 不创建题库或题目快照；AI 后续出题时根据当前题库内容实时检索。

**Consequences**: 实现更简单，也符合“无需追溯”的产品预期。已创建面试的后续问题可能随题库编辑变化；历史面试不保证可复现题库上下文。

### Deleted Bank Behavior

**Context**: 不创建题库快照时，已创建面试引用的题库可能被删除或变为不可用。

**Decision**: 静默回退到现有 AI 面试逻辑。

**Consequences**: 不打断面试流程，和无匹配题目时的回退行为一致；面试页面不额外提示题库不可用。

### Tag Selection

**Context**: 题库标签决定 AI 出题时检索哪些题目。

**Decision**: 创建面试时用户手动选择题库 + 标签。

**Consequences**: 选择过程可控、透明，不依赖系统从 JD 或标题自动推导。前端需要在选择题库后加载该题库下的可用标签。标签不是必填；不选标签时从整个题库中限量取题。
