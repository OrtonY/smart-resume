# 增强分享功能：密码保护 + 访问统计

## Goal

增强现有的简历分享功能，在保留快照(SNAPSHOT)和当前状态(LATEST)两种分享模式的基础上，新增：
1. 分享链接可选密码保护
2. 访问次数统计
3. 访问者 IP 记录

## What I already know

* 当前分享功能支持 LATEST 和 SNAPSHOT 两种模式，工作正常
* 分享链接无任何访问限制，任何人有 URL 即可查看
* 无访问统计、无 IP 记录、无密码保护
* 数据库表 `resume_share_links` 已有 `active` 字段但无撤销 API
* 公开访问端点 `/api/public/shares/{shareCode}` 不经过 auth 拦截器
* 导出功能（PDF/DOCX）是纯前端实现，与分享功能独立

## Requirements

* 创建分享链接时可选设置密码（明文由前端传入，后端 BCrypt 哈希存储）
* 访问受密码保护的链接时，前端展示密码输入页面
* 密码验证成功后，后端返回临时 JWT token（有效期 24h），后续请求携带 token 访问
* 每次成功访问（查看简历内容）记录访问时间和 IP 地址
* 在 ShareLinksModal 中每条链接旁内联显示总访问次数
* 点击可展开查看访问明细（时间 + IP 列表）

## Acceptance Criteria

* [ ] 创建分享时可选择是否设置密码
* [ ] 设置密码的分享链接，访问时展示密码输入页面
* [ ] 密码正确后返回 JWT token，后续请求携带 token 可查看简历
* [ ] token 过期后需重新输入密码
* [ ] 无密码的分享链接行为不变（直接可查看）
* [ ] 每次成功查看简历时记录访问时间和 IP
* [ ] ShareLinksModal 中每条链接显示总访问次数
* [ ] 点击展开可查看访问明细（时间 + IP）

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Decision (ADR-lite)

**Context**: 分享链接需要密码保护，验证后需要维持会话状态
**Decision**: 采用 Session Token (JWT) 方案 — 密码验证成功后返回 24h 有效的 JWT，前端存储在 sessionStorage，后续请求通过 header 携带
**Consequences**:
- 刷新页面不丢失访问权限（sessionStorage 生命周期内）
- 关闭标签页后需重新验证
- 需要后端签发/验证 JWT 的逻辑（可复用现有 JWT 基础设施）

## Out of Scope (explicit)

* 分享链接过期时间设置
* 最大访问次数限制
* 撤销/禁用分享链接的 API 和 UI
* 密码错误次数限制/防暴力破解
* IP 地理位置解析
* 访问趋势图/数据可视化

## Technical Notes

* 后端: Spring Boot, Java, MyBatis
* 前端: React + TypeScript
* 数据库: PostgreSQL
* 现有分享表: `resume_share_links` — 需新增 `password_hash` 字段
* 新增访问记录表: `share_access_logs`（share_id, accessed_at, ip_address）
* 现有公开端点: `/api/public/shares/{shareCode}` — 需改造支持密码验证流程
* 新增端点: `POST /api/public/shares/{shareCode}/verify` — 密码验证，返回 token
* 前端分享组件: `ShareLinksModal` in `WorkspacePage.tsx`
* 公开查看页面: `PublicSharePage.tsx` — 需增加密码输入状态
