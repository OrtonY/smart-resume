# Release v1.3.1

## Goal

发布 Smart Resume `v1.3.1` 版本，包含自 v1.3.0 以来的 docker-compose 支持等新功能。

## What I already know

* 当前分支：`develop`
* 工作区状态：Clean
* 当前版本号（backend/pom.xml, frontend/package.json, browser-extension/package.json）：`1.3.0`
* 上一个发布版本：`v1.3.0` (commit 61871ff)
* 自 v1.3.0 以来的主要变更：
  - a36a90f: feat: add docker-compose support for local development (新增 Docker 部署支持、nginx 配置、部署脚本等)
  - acf6047: chore: record journal
  - b44d639: chore(task): archive 06-05-release-v1-3-0
* 项目结构：
  - Backend: Maven 项目 (Java 21, Spring Boot 3.5.14)
  - Frontend: Vite + React 项目
  - Browser Extension: TypeScript + Vite 项目
* 前次发布任务参考：`.trellis/tasks/archive/2026-06/06-05-release-v1-3-0/prd.md`
* Git 分支策略：
  - `develop` 是长期开发分支
  - 每个需求从 `develop` 创建新分支
  - 不在 `master` 或 `develop` 上直接提交
  - 通过 PR 合并到 `develop` (rebase merge)
  - 发布时将 `develop` 合并到 `master`

## Assumptions (temporary)

* 发布版本为 `1.3.1` (小版本号递增)
* 需要更新 backend、frontend、browser-extension 三个模块的版本号保持一致
* 需要更新构建脚本中的 JAR 文件名引用
* 需要创建发布分支进行版本号变更
* 发布完成后需要将 develop 合并到 master

## Open Questions

* **发布范围确认**：v1.3.1 主要包含 docker-compose 支持功能，是否还有其他需要包含的变更或文档更新？

## Requirements (evolving)

* 更新版本号从 `1.3.0` 到 `1.3.1`：
  - backend/pom.xml
  - frontend/package.json
  - browser-extension/package.json
  - browser-extension/public/manifest.json (如果存在)
* 更新构建脚本中的 JAR 文件名引用：
  - build.sh
  - start.sh
* 验证构建成功
* 创建发布提交和 git tag `v1.3.1`
* 推送发布分支并创建 PR 到 `develop`
* PR 合并后，将 `develop` 合并到 `master` 完成发布

## Acceptance Criteria (evolving)

* [ ] backend/pom.xml version 为 `1.3.1`
* [ ] frontend/package.json version 为 `1.3.1`
* [ ] browser-extension/package.json version 为 `1.3.1`
* [ ] browser-extension/public/manifest.json version 为 `1.3.1` (如存在)
* [ ] build.sh 引用 `backend-1.3.1.jar`
* [ ] start.sh 引用 `backend-1.3.1.jar`
* [ ] 构建验证通过
* [ ] 发布提交已创建
* [ ] Git tag `v1.3.1` 已创建并推送
* [ ] PR 已创建到 `develop`
* [ ] 发布后 `develop` 已合并到 `master`

## Definition of Done (team quality bar)

* 构建验证通过
* 版本号更新完整且一致
* Git 分支和 tag 创建正确
* PR 流程符合团队规范

## Out of Scope (explicit)

* 新功能开发
* 依赖版本升级
* 文档重构或无关改动
* 本地直接合并到 develop 或 master

## Technical Notes

* 版本号需要更新的文件：
  - backend/pom.xml (line 13)
  - frontend/package.json (line 4)
  - browser-extension/package.json (line 4)
* 构建脚本需要更新的文件：
  - build.sh
  - start.sh
* 发布分支命名：`release/v1.3.1` 或类似约定
* 参考前次发布流程：`.trellis/tasks/archive/2026-06/06-05-release-v1-3-0/`
