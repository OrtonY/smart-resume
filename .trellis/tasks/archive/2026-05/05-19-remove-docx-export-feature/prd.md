# remove docx export feature

## Goal

移除简历的 DOCX 导出功能。当前导出的 DOCX 排版与模板预览差距太大，体验不佳，与其继续维护一个低质量出口，不如先下线，留下表现更稳定的 PDF 导出。

## What I already know

- 入口：`frontend/src/pages/WorkspacePage.tsx` 的导出下拉菜单同时包含 `导出 PDF` 和 `导出 DOCX` 两项
- 调用链：`exportMenuItems` (line 1345-1348) → `Dropdown` (line 1452) → `handleExport(format, ...)` (line 422-446) → `exportResumeDocx(draft, template)` (line 439)
- 实现文件：`frontend/src/features/resume/export/docxExport.ts`（约 654 行，使用 `docx` npm 包）
- 共享工具：`frontend/src/features/resume/export/fileDownload.ts` 的 `createExportFilename` 同时支持 `'pdf' | 'docx'` 两种扩展名；`downloadBlob` 仍被 PDF 导出使用，必须保留
- 类型定义：`type ExportFormat = 'pdf' | 'docx'` (line 96)，`exportingFormat` state (line 207)，组件 props 中也用到该类型 (line 1317, 1319)
- 图标：`FileWordOutlined` (line 7) 仅用于 DOCX 菜单项
- 依赖：`frontend/package.json` 的 `"docx": "^9.6.1"`（应该没有别的地方用，需要 grep 二次确认）

## Requirements

- 删除 `frontend/src/features/resume/export/docxExport.ts` 文件
- 删除 `WorkspacePage.tsx` 里所有 DOCX 相关代码：`exportResumeDocx` 的 import、`FileWordOutlined` 的 import（若仅此处使用）、`exportMenuItems` 中的 `docx` 项、`handleExport` 中处理 `docx` 分支
- 把 `ExportFormat` 类型从 `'pdf' | 'docx'` 收窄为 `'pdf'`
- 把 `createExportFilename` 的 `extension` 形参从 `'pdf' | 'docx'` 收窄为 `'pdf'`
- 卸载 `docx` npm 包（`package.json` + `package-lock.json`）
- 保留 PDF 导出的全部功能不变
- 导出按钮：单一 PDF 选项时，可保留下拉菜单（仅一项），或简化为直接点击按钮即导出 PDF——选其一即可，不需要纠结
- 简化后菜单文案保持 "导出"

## Acceptance Criteria

- [ ] `frontend/src/features/resume/export/docxExport.ts` 文件已删除
- [ ] `grep -r 'docx\|DOCX\|FileWordOutlined' frontend/src` 在源码中无残留（除注释、字面量文件名外）
- [ ] `package.json` dependencies 中不再包含 `docx`
- [ ] `npx tsc --noEmit` 通过
- [ ] `npm run build` 通过
- [ ] 浏览器中点击导出按钮可正常下载 PDF（行为未回归）

## Definition of Done

- 所有验收项通过
- 无 lint / typecheck 报错
- 不留死代码（未使用的 import、unused state branch）

## Technical Approach

直接删除 `docxExport.ts`，修剪 `WorkspacePage.tsx` 中所有调用点，收窄 `ExportFormat` 类型，卸载 `docx` 包。`fileDownload.ts` 的 `createExportFilename` 收窄但函数不删除（PDF 还要用）。

## Out of Scope

- PDF 导出的任何改动（保持现状）
- 后端任何改动（DOCX 导出是纯前端实现）
- 模板预览渲染逻辑
- 其他导出格式（HTML / MD 等暂不规划）

## Technical Notes

- `docx` 包仅在 `docxExport.ts` 中使用（已 grep 确认）
- `FileWordOutlined` 仅在 `WorkspacePage.tsx` line 7 / 1347 使用（待删除时再二次确认）
- `createExportFilename(title, 'docx')` 的唯一调用点在 `docxExport.ts:198`，删除文件后该参数化无意义
- 删除 dependency 后建议运行 `npm install` 让 lockfile 同步
