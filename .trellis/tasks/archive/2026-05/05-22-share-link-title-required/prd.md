# 分享简历链接标题必填

## Goal

在创建简历分享链接时，要求用户输入“分享标题”，用于标识该链接用途，降低同一简历下多个分享链接难以区分的问题。

## Requirements

* 新建分享链接时标题必填。
* 标题允许重复。
* 标题规则：去除首尾空格后长度 1-50 字符。
* 历史无标题分享链接保持可用，不做强制回填。
* 分享列表可展示标题；历史空标题使用兜底文案“未命名分享”。

## Acceptance Criteria

* [ ] 未提供标题（或仅空白）创建分享时，后端拒绝并返回明确错误。
* [ ] 标题长度超过 50 时，后端拒绝并返回明确错误。
* [ ] 前端创建弹窗在标题不合法时阻止提交并提示。
* [ ] 创建成功后，分享列表可见新标题。
* [ ] 历史无标题链接在列表中显示“未命名分享”。

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes

## Out of Scope

* 编辑已创建分享链接标题
* 分享标题搜索、筛选、排序

## Technical Approach

* Backend
  * `CreateShareRequest` 新增 `title` 字段（校验 + trim 后二次校验）
  * `resume_share_links` 新增 `title` 列（允许 null，兼容历史数据）
  * `ShareLinkResponse` 返回 `title`
* Frontend
  * 创建分享弹窗新增“分享标题”输入（必填，maxLength 50）
  * 创建 API 增加 `title` 入参
  * 分享列表展示 `title`，空值兜底“未命名分享”

## Decision (ADR-lite)

**Context**: 用户需要快速区分同一简历的多个分享链接用途。

**Decision**: 标题在“新建分享”时强制必填，允许重复；历史数据不强制迁移，前端兜底展示“未命名分享”。

**Consequences**: 兼顾可用性与低迁移风险；后续如需标题治理可增补“编辑标题”或批量回填能力。

