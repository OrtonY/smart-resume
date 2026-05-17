# 模板界面优化：中文化与颜色/透明度可视化编辑

## Goal

让 `TemplateGalleryPage` 的模板编辑体验更直观：
1. 把残留的英文标签全部改成中文，与页面其他区域风格一致
2. 把所有颜色/透明度字段从「手输 rgba/hex 字符串」升级为可视化色板 + 透明度滑块，降低编辑门槛、避免手写错误

## What I already know

- 入口：`frontend/src/pages/TemplateGalleryPage.tsx`（项目内文件名拼写为 `TemplateGalleryPage`，非 `TemplateGaleryPage`）
- 颜色字段定义在同文件 `THEME_FIELDS` (11 项) 与 `PREVIEW_FIELDS` (5 项)
- 类型定义：`frontend/src/features/resume/templateCatalog.ts` 的 `ResumeTemplateTheme` / `ResumeTemplatePreview`
- 颜色应用：`createTemplateStyleVariables(template)` 生成 `--template-*` CSS 变量，`index.css` 里约 36 处 `var(--template-*)` 引用
- AntD v6 已引入，自带 `ColorPicker`（支持 alpha、hex/rgb/hsb 多格式输出）
- 后端持久化：`ResumeTemplateEntity.themeJson` / `previewJson`（字符串 JSON），DTO `TemplateCatalogDtos`，迁移 `V2__create_resume_templates.sql`
- 项目无 i18n 框架，文案直接内联

## 关键技术约束（必须先解决）

部分 theme 字段在内置模板里**存的是渐变（linear-gradient）而非纯色**，单一 ColorPicker 表达不了：

| 字段 | 内置模板示例 | 类型 |
|---|---|---|
| `heroBackground` | `linear-gradient(135deg, rgba(27,47,93,0.96), rgba(67,100,188,0.9))` | 渐变为主 |
| `panelBackground` | `linear-gradient(160deg, rgba(255,255,255,0.94), rgba(232,239,255,0.86))` | 渐变为主 |
| `railBackground`、`accentSoft` | 部分模板用渐变 | 混合 |
| 其余 12 个字段 | 全部纯色（hex 或 rgba） | 纯色 |

→ 决定「渐变字段如何编辑」是设计上最大的分歧点。

## Assumptions (待用户确认)

- 中文化范围**只限模板编辑页**，不含 AppProviders 主题、index.css 全局变量、AntD 组件 locale
- 颜色编辑使用 AntD 自带 `ColorPicker`（不引第三方）
- 透明度通过 ColorPicker 内置 alpha slider 实现，统一以 `rgba(...)` 字符串落库
- 后端 schema 不变（仍是字符串），不需要 Flyway 迁移

## Decisions

- **D1**：渐变字段（heroBackground / panelBackground / railBackground / accentSoft）使用「完整渐变编辑器」——两个色 stop（起/止，各带 alpha）+ 角度滑块 + 实时预览条
- **D2**：渐变字段锁定为渐变形态，不提供「渐变↔纯色」类型切换；想要近似纯色把两个 stop 设成同色即可
- **D3**：渐变编辑器只支持 2 个 stop（与所有内置模板一致；多 stop 留作未来需要时再加）

## 提议方案（待 Q2 确认）

**字段中文化对照表**：

Theme tokens（主题样式）：
| 字段 | 中文 label | UI 形态 |
|---|---|---|
| pageBackground | 页面背景 | ColorPicker |
| borderColor | 边框颜色 | ColorPicker |
| mutedText | 弱化文字 | ColorPicker |
| accent | 主强调色 | ColorPicker |
| accentSoft | 浅强调色 | ColorPicker（修正：4 个内置模板均为纯 rgba，无渐变形态） |
| accentText | 强调色上的文字 | ColorPicker |
| heroBackground | 头部背景 | **渐变编辑器** |
| heroText | 头部文字 | ColorPicker |
| heroMuted | 头部弱化文字 | ColorPicker |
| railBackground | 侧栏背景 | **渐变编辑器** |
| panelBackground | 面板背景 | **渐变编辑器** |

Preview tokens（预览样式）：
| 字段 | 中文 label | UI 形态 | 内置模板现状 |
|---|---|---|---|
| canvasBackground | 画布背景 | **渐变编辑器** | 4/4 渐变 |
| sheetBackground | 纸张背景 | ColorPicker | 4/4 纯色 (#ffffff) |
| heroBackground | 预览头部背景 | **渐变编辑器** | 3/4 渐变, 1 纯色 (pure-form 的 `#eef2f7` 会被两 stop 同色表达) |
| asideBackground | 预览侧栏背景 | ColorPicker | 4/4 rgba 纯色 |
| lineColor | 分隔线颜色 | ColorPicker | 4/4 rgba 纯色 |

> 综上：**6 个字段需要渐变编辑器**（theme: heroBackground / panelBackground / railBackground / accentSoft + preview: canvasBackground / heroBackground），**10 个字段用 ColorPicker**。

其他文案：
- "Template key" → 模板标识（保持 disabled 不变）
- "Theme tokens" → 主题样式
- "Preview tokens" → 预览样式
- "Built-in" / "Custom"（预览区 Tag）→ 内置 / 自定义

**纯色输出格式**：始终输出 `rgba(r, g, b, a)`（用 AntD `ColorPicker.toRgbString()`）。理由：单一格式简化序列化逻辑、避免 hex/rgba 在不同字段间混乱；alpha=1 时 `rgba(r,g,b,1)` 也是合法 CSS。

**重置按钮**：每个字段右侧加一个小图标按钮「↺」，点击恢复为该模板**当前已保存值**（不是内置默认值）——即等价于"撤销本次未保存的修改"。比"恢复出厂"更常用。仅在 `editorMode === 'edit'` 且 `selectedTemplate` 存在时显示。

## Requirements (evolving)

- [ ] `THEME_FIELDS` 16 个 label 改为中文（页面背景、强调色、英雄区背景…）
- [ ] `PREVIEW_FIELDS` 5 个 label 改为中文
- [ ] Collapse 面板标题 "Theme tokens" / "Preview tokens" 改为中文
- [ ] "Template key"、"Built-in" / "Custom" 等残留改中文
- [ ] 纯色字段从 `<Input>` 替换为 `<ColorPicker showText format='rgb'>`，支持 alpha slider
- [ ] 渐变字段处理方案（待 Q1 决策）
- [ ] 保持现有保存校验逻辑（非空 trim）

## Acceptance Criteria (evolving)

- [ ] 进入模板配置/新建模板，所有 label 均为中文
- [ ] 修改颜色 → 右侧预览实时变化（不破坏现有 `editorDraft` 单向数据流）
- [ ] 调透明度滑块 → 预览的 hero/panel 背景透出底色变化可见
- [ ] 保存后刷新页面，颜色仍正确反序列化展示
- [ ] 内置模板里既有的渐变字段不会因为本次改动丢失渐变（必须保留兼容）

## Definition of Done

- 前端 build 通过，无新增 TS 错误
- 所有内置模板（north-star / grid-slate / pure-form / ink-flow）在编辑器中加载、修改、保存的回路正常
- 现有简历的 `templateKey` 关联不受影响

## Out of Scope (explicit)

- 全站 i18n 框架引入
- AppProviders 全局主题色可视化
- index.css 中 `:root` 全局 CSS 变量编辑
- 后端 schema 变更
- 字体、间距、圆角等非颜色 token 的可视化

## Technical Notes

- 文件：`frontend/src/pages/TemplateGalleryPage.tsx:67-87, 622-700`
- 类型：`frontend/src/features/resume/templateCatalog.ts`
- 应用 CSS 变量：`createTemplateStyleVariables` 同上
- AntD ColorPicker 文档：`format='rgb'` + `value` 接受字符串 + `onChange((color) => color.toRgbString())` 即可输出 `rgba(...)`
