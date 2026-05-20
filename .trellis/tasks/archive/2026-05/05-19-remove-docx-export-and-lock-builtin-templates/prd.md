# remove docx export and lock builtin templates

## Goal

两个独立优化合并为一个任务：
1. 移除 DOCX 导出功能（排版质量差，维护成本高）
2. 将 4 个内置模板设为只读默认模板，不允许修改；移除"从备份恢复内置模板"前端入口

## Requirements

### Part A — 移除 DOCX 导出

- 删除 `frontend/src/features/resume/export/docxExport.ts`
- 从 `WorkspacePage.tsx` 移除：`exportResumeDocx` import、`FileWordOutlined` import、`exportMenuItems` 中的 docx 项、`handleExport` 中 docx 分支
- `ExportFormat` 类型从 `'pdf' | 'docx'` 收窄为 `'pdf'`（或直接移除该类型，因为只剩一种格式）
- `fileDownload.ts` 的 `createExportFilename` extension 参数收窄为 `'pdf'`
- 导出按钮：从 Dropdown（两项菜单）简化为直接点击按钮，标签 "导出 PDF"
- 卸载 `docx` npm 包（`package.json` + `package-lock.json`）
- PDF 导出功能保持不变

### Part B — 锁定内置模板

**前端（TemplateGalleryPage.tsx）：**
- 当 `selectedTemplate.builtIn === true` 时，隐藏所有编辑/保存控件（模板配置 Card 中的输入框、保存按钮等）
- 保留模板预览、应用到简历、使用此模板创建简历等只读操作
- 移除"从备份恢复内置模板"按钮及其 Popconfirm（lines 562-570）
- 移除 `handleRestoreBuiltIns` 函数和 `restoringBuiltIns` state
- 移除 `templateCatalogApi.ts` 中的 `restoreBuiltInTemplatesFromBackup` 函数
- "新建模板"功能保留（用户仍可基于内置模板创建自定义副本）
- 自定义模板（`builtIn === false`）的编辑/删除功能保留不变

**后端（TemplateCatalogService / Controller）：**
- `updateTemplate` 方法：当目标模板 `builtIn = true` 时抛出异常（403 或 400），拒绝更新
- `deleteTemplate` 方法：当目标模板 `builtIn = true` 时抛出异常，拒绝删除（可能已有此逻辑，需确认）
- `POST /api/templates/restore-from-backup` 端点保留不动

## Acceptance Criteria

- [ ] `frontend/src/features/resume/export/docxExport.ts` 已删除
- [ ] `grep -r 'docx\|DOCX\|FileWordOutlined' frontend/src` 在源码中无残留
- [ ] `package.json` dependencies 中不再包含 `docx`
- [ ] 导出按钮为直接点击按钮（非下拉菜单），点击即导出 PDF
- [ ] 选中内置模板时，模板配置区域不显示任何编辑控件
- [ ] 选中自定义模板时，编辑/保存/删除功能正常
- [ ] "从备份恢复内置模板"按钮在前端不可见
- [ ] 后端 `PUT /api/templates/{builtInKey}` 返回错误响应
- [ ] 后端 `DELETE /api/templates/{builtInKey}` 返回错误响应
- [ ] `npx tsc --noEmit` 通过
- [ ] 后端 `mvn compile` 通过

## Definition of Done

- 所有验收项通过
- 无 lint / typecheck 报错
- 不留死代码

## Technical Approach

- Part A：删文件 → 修 WorkspacePage → 收窄类型 → 简化导出按钮 → `npm uninstall docx`
- Part B 前端：在 TemplateGalleryPage 的模板配置 Card 中根据 `builtIn` 条件渲染；移除恢复按钮相关代码
- Part B 后端：在 `TemplateCatalogService.updateTemplate` 和 `deleteTemplate` 开头加 builtIn 检查

## Out of Scope

- PDF 导出的任何改动
- 后端 `POST /api/templates/restore-from-backup` 端点（保留）
- 模板预览渲染逻辑
- 其他导出格式（HTML / MD 等）
- 模板目录页面的视觉重设计

## Technical Notes

- `docx` 包仅在 `docxExport.ts` 中使用
- `FileWordOutlined` 仅在 `WorkspacePage.tsx` 使用
- `createExportFilename(title, 'docx')` 唯一调用点在 `docxExport.ts:198`
- 后端 `ResumeTemplateEntity` 有 `builtIn` boolean 字段
- 后端 `TemplateCatalogController` 已有 delete 端点，需确认 service 层是否已做 builtIn 守卫
