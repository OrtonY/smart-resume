# 修改密码后登出该用户所有登录

## Goal

当用户修改自己的密码后，该用户此前签发的所有登录态都必须失效，包括当前设备和其他设备上的旧 access token，避免旧 token 在密码更新后继续访问受保护接口。

## What I already know

* 后端认证由 `SystemAccessService`、`AuthTokenService`、`AuthTokenInterceptor` 组成。
* 当前 token 吊销依赖 token payload 中的 `credentialVersion` 与用户当前 `credentialVersion` 比较。
* 当前 `credentialVersion(UserEntity user)` 使用 `updatedAt` 或 `createdAt` 的 epoch second。
* `changePassword` 会更新 `passwordHash` 并把 `updatedAt` 设为 `LocalDateTime.now()`。
* 前端修改密码成功后会立即调用 `onLogout()` 清除本地 token，但后端仍需保证其他设备上的旧 token 失效。
* 现有实现存在秒级碰撞风险：如果登录和改密发生在同一秒，旧 token 的 `credentialVersion` 可能与改密后的版本一致，导致旧 token 继续有效。

## Assumptions

* 本次需求只要求“该用户旧登录态失效”，不引入新的会话表或 refresh token 体系。
* 保持现有 token 结构与接口契约不变，优先做后端最小修复。

## Open Questions

* 无阻塞问题，按最小改动方案直接实现。

## Requirements

* 用户修改密码成功后，该用户之前签发的所有 access token 必须失效。
* 失效判断必须稳定，不依赖秒级时间碰撞运气。
* 不改变现有接口路径、请求体和响应体。

## Acceptance Criteria

* [ ] `changePassword` 成功后，使用改密前 token 调用受保护接口会被判定为未授权。
* [ ] 即使登录与改密发生在同一秒，旧 token 也会失效。
* [ ] 现有改密成功场景测试继续通过，并新增覆盖旧 token 失效场景的测试。

## Definition of Done

* 最小必要代码改动完成
* 后端相关单元测试通过
* 不引入额外表结构、依赖或无关重构

## Out of Scope

* 引入 refresh token / session table / 黑名单表
* 调整前端登录流程或新增登出接口
* 扩展为管理员强制踢下线其他用户

## Technical Notes

* 相关规范：`.trellis/spec/backend/auth-multi-user.md`
* 相关代码：
  * `backend/src/main/java/com/smartresume/system/service/SystemAccessService.java`
  * `backend/src/main/java/com/smartresume/common/security/AuthTokenService.java`
  * `backend/src/main/java/com/smartresume/common/security/AuthTokenInterceptor.java`
  * `backend/src/test/java/com/smartresume/system/service/SystemAccessServiceTest.java`
