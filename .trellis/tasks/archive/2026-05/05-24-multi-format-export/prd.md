# 多格式导出增强 — 服务端 PDF

## Goal

实现服务端 PDF 导出，生成文本可选、ATS 友好的高质量 PDF，同时保留现有客户端截图导出作为"快速导出"选项。支持登录用户导出和公开分享页直接下载。

## Requirements

* 使用 OpenHTMLToPDF（纯 Java）生成真实文本 PDF
* 为 4 种布局模板（Classic / ModernSplit / Minimal / Editorial）编写服务端 HTML 模板
* 支持中文字体（嵌入 Noto Sans SC 或类似字体）
* 支持模板颜色 token（用户自定义配色在 PDF 中生效）
* 支持头像图片嵌入（从 URL 加载并嵌入 PDF）
* 服务端分页（利用 CSS `page-break-inside: avoid` 等属性）
* 前端提供两个导出入口："快速导出"（客户端截图）和"高质量导出"（服务端 PDF）
* 公开分享页增加"下载 PDF"按钮，调用服务端导出
* 共享核心样式变量（字体、间距、颜色），确保前端预览与 PDF 视觉尽量一致

## Acceptance Criteria

* [ ] 登录用户可选择"高质量导出"，下载服务端生成的 PDF
* [ ] PDF 中文本可选择、可搜索
* [ ] 4 种布局模板均正确渲染
* [ ] 中文内容正确显示（无乱码/缺字）
* [ ] 用户自定义颜色在 PDF 中正确体现
* [ ] 头像图片正确显示在 PDF 中
* [ ] 隐藏的 section 不出现在 PDF 中
* [ ] 超长内容正确分页，section 不被截断
* [ ] 公开分享页可直接下载 PDF（无需登录）
* [ ] 现有"快速导出"功能不受影响

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Technical Approach

* 后端：OpenHTMLToPDF + Thymeleaf 模板引擎
* 字体：打包 Noto Sans SC（覆盖中文）+ 英文字体
* 头像：服务端从 URL 下载图片，转为 base64 嵌入 HTML 模板后渲染
* 样式同步：抽取共享样式变量文件，前端 CSS 变量和服务端模板都从中派生
* API：`GET /api/resumes/{resumeId}/export/pdf` 返回 PDF 文件流（需认证）
* 分享页：`GET /api/share/{shareCode}/export/pdf` 无需认证
* 分页：CSS `page-break-inside: avoid` + `page-break-before` 控制

## Decision (ADR-lite)

**Context**: 当前客户端 PDF 导出（html2canvas）生成的是图片型 PDF，文本不可选、ATS 无法解析、字体渲染依赖客户端环境。需要服务端方案生成真实文本 PDF。

**Decision**: 选择 OpenHTMLToPDF（纯 Java）方案，而非 Headless Browser（Playwright）。

**Consequences**:
- 优势：纯 Java 无外部依赖，轻量快速（毫秒级），部署简单
- 代价：需要为 4 种布局编写服务端 Thymeleaf 模板，CSS 支持限于 2.1 + 部分 CSS3
- 风险：与前端预览可能有细微差异，需投入时间调试样式一致性
- 缓解：保留客户端"快速导出"作为像素级一致的备选方案

## Out of Scope

* Word (.docx) 导出（后续迭代）
* Markdown 导出（后续迭代）
* 批量导出
* 自定义字体上传
* 面试报告 PDF 导出

## Implementation Plan

* PR1：引入 OpenHTMLToPDF 依赖 + 字体资源 + 基础渲染管道（Classic 模板验证通路）
* PR2：完成 4 套布局模板 + 颜色 token + 头像支持 + 分页逻辑
* PR3：前端双导出入口 UI + 分享页下载按钮
* PR4：样式微调 + 边界情况处理 + 测试

## Technical Notes

* 当前前端 PDF 导出：`frontend/src/features/resume/export/pdfExport.ts`
* 后端占位：`backend/src/main/java/com/smartresume/export/controller/ExportController.java`
* 简历类型定义：`frontend/src/features/resume/types.ts`
* 预览组件：`frontend/src/features/resume/components/ResumePreview.tsx`
* A4 尺寸常量：794×1123px (96 DPI)
* 头像字段：`ResumeContent.personalInfo.avatar`（URL 格式）
* 4 种布局模板需要在导出中全部支持
