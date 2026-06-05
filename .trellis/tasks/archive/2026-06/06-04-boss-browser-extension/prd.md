# brainstorm: boss直聘浏览器插件投递助手

## Goal

实现一个浏览器插件，让用户在 Boss 直聘职位详情页中选择 Smart Resume 内的一份简历，并从插件里执行“生成求职信”或“投递记录入库”。目标是把外部招聘页的职位信息快速沉淀到 Smart Resume 的投递台，并在需要时基于同一条投递记录生成关联求职信。

## What I already know

* 用户希望在 Boss 直聘的某个招聘信息页面打开插件。
* 插件内需要选择使用哪一份简历。
* 插件提供“生成求职信”或“投递”动作。
* “投递”会在 Smart Resume 投递台增加一条记录。
* “求职信”是在增加投递记录的基础上生成一份求职信。
* 当前项目已有投递台后端模块：`POST /api/applications` 可创建投递记录。
* 当前投递记录字段包含公司、岗位、状态、渠道、关联简历、投递时间、备注。
* 当前项目已有 AI 求职信接口：`POST /api/ai/resumes/{resumeId}/cover-letters`。
* 求职信生成请求已经支持可选 `applicationId`，后端会校验投递记录归属和简历兼容性。
* 前端已有 `listResumes`、`createApplication`、`generateAiCoverLetter` 等 API 客户端，可作为插件侧调用形状参考。

## Assumptions (temporary)

* MVP 优先支持 Chrome / Edge 的 Manifest V3 插件。
* 插件只对 Boss 直聘职位详情页启用，先不扩展到拉勾、猎聘、智联等平台。
* 插件登录态复用 Smart Resume 后端的 `X-Access-Token` 机制。
* “投递台增加记录”指 Smart Resume 自己的投递台，不一定等价于在 Boss 直聘站内点击真实投递按钮。
* Boss 直聘页面抽取失败时，插件允许用户手动修正公司、岗位和 JD。

## Open Questions

* None.

## Requirements (evolving)

* 插件在 Boss 直聘职位详情页识别并抽取公司、岗位、职位描述、页面 URL 等信息。
* 插件首次启动或未配置时，先要求用户配置 Smart Resume 主站 URL / 后端访问地址。
* 插件弹窗内提供 Smart Resume 登录能力，调用 `/api/system/login` 获取 token。
* 插件把 Smart Resume token 存储在插件自己的 `chrome.storage` 中，后续 API 请求通过 `X-Access-Token` 发送。
* 登录过期或 API 返回 401 时，插件清除本地 token 并要求用户重新登录。
* 插件列出当前用户的 Smart Resume 简历名称，用户选择一份后才能继续；MVP 不展示简历详情、预览或评分。
* 点击“投递记录入库”时，插件只调用 Smart Resume 后端创建投递记录，不自动点击 Boss 直聘站内投递/沟通按钮。
* 创建的投递记录默认状态为 `applied`，渠道为 `Boss直聘` 或 `BOSS Zhipin`。
* 投递记录中的公司、岗位分别使用现有 `company`、`position` 字段。
* Boss 职位来源 URL 和 JD 摘要写入投递记录 `notes`，MVP 不为投递记录新增独立 JD 字段。
* 点击“生成求职信”时，插件先确保投递记录存在，再调用现有 AI 求职信接口生成关联到该投递记录的求职信。
* 完整 JD 在生成求职信时作为 `jobDescription` 请求字段传入，并随求职信记录保存。
* 生成求职信成功后，插件在弹窗内展示求职信正文并提供复制操作。
* 插件按 `Boss URL + resumeId` 在 `chrome.storage` 保存投递记录映射，并清理超过 1 天的本地映射，避免缓存长期累积。
* 抽取出来的字段需要允许用户在插件面板里确认或修改。

## Acceptance Criteria (evolving)

* [ ] 在 Boss 直聘职位详情页打开插件，可以看到自动识别到的公司、岗位和 JD 摘要。
* [ ] 首次打开插件时，如果尚未配置 Smart Resume URL，会先进入配置界面。
* [ ] 未登录时，插件可以在弹窗内登录 Smart Resume，并在登录成功后加载简历列表。
* [ ] 登录过期时，插件提示重新登录，并在重新登录后恢复正常 API 调用。
* [ ] 插件可以加载当前用户的简历列表，并仅展示简历名称供用户选择。
* [ ] 点击投递后，Smart Resume 投递台新增一条关联该简历的记录。
* [ ] 新增投递记录的备注中包含 Boss 职位来源 URL 和 JD 摘要。
* [ ] 点击生成求职信后，Smart Resume 先新增或复用投递记录，再生成一条带 `applicationId` 的求职信记录。
* [ ] 求职信生成成功后，插件内展示正文，并可以一键复制。
* [ ] 同一 Boss URL + 同一简历重复操作时，插件优先复用本地记录映射；插件会清理超过 1 天的映射，避免缓存过多。
* [ ] 用户可以在提交前编辑插件抽取的职位信息。
* [ ] 未登录或 token 失效时，插件给出明确处理入口。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 暂不承诺支持 Boss 直聘以外的招聘网站。
* MVP 不自动点击 Boss 直聘站内投递、沟通、发送简历等按钮。
* 暂不承诺自动绕过平台限制、验证码、反爬或登录保护。
* 暂不重新实现 Smart Resume 主站已有的投递台和求职信历史页面。

## Technical Notes

* Existing backend application files inspected:
  * `backend/src/main/java/com/smartresume/application/controller/JobApplicationController.java`
  * `backend/src/main/java/com/smartresume/application/service/JobApplicationService.java`
  * `backend/src/main/java/com/smartresume/application/dto/JobApplicationDtos.java`
  * `backend/src/main/java/com/smartresume/application/domain/JobApplicationEntity.java`
* Existing cover-letter files/spec inspected:
  * `.trellis/spec/backend/ai-cover-letter.md`
  * `backend/src/main/java/com/smartresume/ai/service/AiCoverLetterService.java`
  * `frontend/src/features/ai/api/aiApi.ts`
* Existing frontend API files inspected:
  * `frontend/src/features/application/api/applicationApi.ts`
  * `frontend/src/features/application/types.ts`
  * `frontend/src/features/resume/api/resumeApi.ts`
  * `frontend/src/lib/http/apiClient.ts`
* Local semantic search and `rg` were unavailable/failed in this environment; PowerShell inspection was used instead.

## Technical Approach

MVP 在仓库根目录新增独立 `browser-extension/` 插件包，不放进主站 `frontend/` 应用源码。插件由 content script、popup 和 service worker 组成：content script 只负责从 Boss 直聘当前职位页抽取可见职位信息；popup 负责主站 URL 配置、登录、字段确认、按名称选择简历、展示结果和复制；service worker 负责 Smart Resume API 调用、token 管理和投递记录复用映射。

核心 API 复用现有后端能力：`/api/system/login` 登录，`/api/resumes` 加载简历名称，`POST /api/applications` 创建投递记录，`POST /api/ai/resumes/{resumeId}/cover-letters` 生成求职信。

## Research References

* [`research/mv3-extension-architecture.md`](research/mv3-extension-architecture.md) - 推荐 Chrome/Edge Manifest V3 架构：content script 负责页面抽取，popup 负责用户确认，service worker 负责 Smart Resume API 调用和 token 存储。
* [`research/boss-zhipin-extraction-and-apply.md`](research/boss-zhipin-extraction-and-apply.md) - 推荐 MVP 不自动点击 Boss 站内投递按钮，只做用户确认后的 Smart Resume 入库和求职信生成。

## Research Notes

### What similar tools/patterns suggest

* MV3 插件应把 DOM 抽取、用户 UI、跨源 API 请求分开：content script 读取当前 Boss 页面，popup 展示确认表单，service worker 调 Smart Resume 后端。
* 第三方招聘站页面 DOM 不稳定，抽取结果必须可编辑，选择器失败应降级为手填表单。
* 插件不应从 Boss 页面直接读取 Smart Resume 主站的 `localStorage` token；MVP 更适合在插件里登录 Smart Resume 并把 token 存在 `chrome.storage`。
* 自动点击 Boss 站内投递/沟通按钮存在平台协议、误投、重复投递和反自动化风险，建议单独作为未来合规评估需求。

### Constraints from this repo/project

* 后端 API 前缀为 `/api`，当前登录端点是 `/api/system/login`。
* Auth header 是 `X-Access-Token`，后端 CORS 当前允许扩展跨源请求。
* 投递记录没有 `sourceUrl` 或 `jobDescription` 字段，MVP 可把来源 URL 和摘要写进 `notes`；若需要长期结构化检索，后续应扩展投递表字段。
* 当前 `JobApplicationService.create` 直接保存请求里的 `resumeId`，未在创建投递记录时验证该简历属于当前用户；插件上线前建议加固。

### Feasible approaches here

**Approach A: Smart Resume 记录助手（Recommended）**

* How it works: 插件抽取 Boss 职位信息，用户确认后创建 Smart Resume 投递记录；生成求职信时先创建/复用投递记录，再调用现有 AI 求职信接口。
* Pros: 风险低、复用现有后端能力、MVP 边界清晰、对 Boss DOM 和平台限制更稳健。
* Cons: 不会真正完成 Boss 站内投递，用户仍需在 Boss 页面自己点投递/沟通。

**Approach B: 半自动 Boss 投递助手**

* How it works: 在 Approach A 基础上，用户额外确认后由 content script 点击 Boss 页面投递/沟通按钮。
* Pros: 体验更自动化。
* Cons: 平台协议和反自动化风险高，DOM 易碎，误投/重复投递风险高，建议不放入 MVP。

**Approach C: 平台无关职位采集器**

* How it works: 先做通用网页抽取和手填表单，Boss 只是一个 extractor adapter；后续支持多个招聘平台。
* Pros: 长期扩展性更好。
* Cons: MVP 复杂度更高，首个 Boss 场景不够聚焦。

## Decision (ADR-lite)

**Context**: 插件中的“投递”既可以表示 Smart Resume 内部投递记录入库，也可能表示自动点击 Boss 直聘站内投递按钮。两者风险和实现复杂度差异很大。

**Decision**: MVP 选择 Approach A，把“投递”定义为保存到 Smart Resume 投递台；插件不自动点击 Boss 直聘站内投递/沟通按钮。

**Consequences**: MVP 风险更低、能复用现有投递台和求职信 API；用户仍需在 Boss 直聘页面自行完成真实站内投递。如果未来要做站内自动投递，需要独立需求和合规/风险评估。

## Decision (ADR-lite): Plugin Authentication

**Context**: Smart Resume 主站 token 存在主站 origin 的 `localStorage`，插件无法在 Boss 页面直接复用该存储；强行读取主站登录态会增加权限和耦合。

**Decision**: MVP 选择插件内配置 Smart Resume URL 并登录 Smart Resume。插件先保存主站 URL / 后端访问地址，再调用 `/api/system/login`，把返回的 access token 存入 `chrome.storage`，并在后续请求中发送 `X-Access-Token`。

**Consequences**: 实现稳定、权限边界清楚；用户第一次使用插件时需要先配置 Smart Resume URL 并登录一次。登录过期时插件清除 token 并要求重新登录。后续可以增加主站授权桥改善体验。

## Decision (ADR-lite): JD Persistence

**Context**: 当前投递记录表没有独立 JD 字段，但已有备注字段；求职信记录已有 `job_description`。

**Decision**: MVP 不扩展投递记录表。投递备注保存 Boss URL 和 JD 摘要；完整 JD 仅在生成求职信时作为 `jobDescription` 入参，并随求职信记录保存。

**Consequences**: 首版无需数据库迁移，范围更小；如果用户只保存投递记录但不生成求职信，完整 JD 不会结构化保存，后续可通过新增 `jobDescription` 字段升级。

## Decision (ADR-lite): Duplicate Handling

**Context**: 投递记录没有结构化 `sourceUrl` 字段，后端无法可靠按 URL 去重；但用户重复点击同一职位时应避免明显重复创建。

**Decision**: MVP 在插件本地按 `Boss URL + resumeId` 保存带创建时间的 `applicationId` 映射，并在插件启动或使用映射时清理超过 1 天的缓存条目。

**Consequences**: 不改后端即可减少本地缓存长期累积；超过 1 天、换浏览器、清插件数据或 URL 变化时仍可能重复，后续可通过后端 `sourceUrl` 字段和唯一规则升级。
