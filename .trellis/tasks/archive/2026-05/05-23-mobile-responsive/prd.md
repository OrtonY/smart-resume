# brainstorm: mobile responsive adaptation

## Goal

为「智慧简历」前端做移动端适配，让用户在手机/平板上也能流畅地浏览、编辑、分享简历，并完成面试相关流程。在桌面端体验保持不变的前提下，把现有 1280/900/720 三档断点延伸出一档真正面向手机（≤480px）的专项布局。

## Requirements

### 1. 断点策略
- **桌面**（≥1281px）：保持现状，不做任何视觉变更
- **平板**（481–1280px）：沿用现有 `@media (max-width: 1280px)` 与 `@media (max-width: 900px)` 规则，仅修复发现的 bug
- **手机**（≤480px）：新增 `@media (max-width: 480px)` 专项规则，覆盖下列所有页面与组件

### 2. 全局导航
- 顶部工具栏在 ≤480px 时收纳为汉堡菜单 + 右侧 Drawer
- header 仅保留：返回/品牌、语言切换、会话头像、菜单按钮（☰）
- Drawer 内容：模板库、面试中心、AI 配置、回收站、退出

### 3. 工作台（WorkspacePage 列表态）
- hero 区域：标题字号缩小、描述折行、按钮组改为汉堡菜单
- 简历卡片网格：从桌面 6 列 → 手机单列（现状是 ≤900px 时已是 2 列，需进一步压缩为 1 列）
- 分页器在窄屏下保持可用

### 4. 简历编辑器（WorkspacePage 编辑态）
- ≤480px 切换为 **Tab 形态**：「编辑」/「预览」两个 Tab，默认进入「编辑」
- 「编辑」Tab：所有 section 折叠面板纵向单列展开；表单 input 占满宽度；模板配置（颜色、渐变、字段）单列布局
- 「预览」Tab：A4 简历用 CSS `transform: scale(屏宽/A4宽)` 等比缩放到屏宽显示，保留浏览器原生双指缩放查看细节
- 顶部操作（保存状态、分享、复制、删除、PDF 导出按钮组）收纳到 ⋮ 菜单中

### 5. 拖拽排序（section 顺序）
- 引入 `@dnd-kit/core` 的 `TouchSensor`，配置 250ms 长按延迟和 5px 容忍距离，避免与页面滚动冲突
- section 卡片在手机上显示更明显的 `HolderOutlined` 拖拽手柄（右侧固定 44×44 触控区）
- 桌面端继续使用 `PointerSensor`，不受影响

### 6. Modal → Drawer
- 在 ≤480px 时，下列 Modal 自动改为底部全屏 Drawer：
  - 分享对话框
  - 模板选择/配置
  - AI 助手面板
  - 面试报告查看
  - 删除/恢复确认（保持 Popconfirm，不必改）
- 实现方式：用一个 `useIsMobile()` hook + 条件渲染包装，桌面继续 Modal，手机用 `Drawer placement="bottom" height="92vh"`

### 7. 面试中心（InterviewPage）
- 列表卡片：≤900px 已经单列，≤480px 进一步压缩 padding
- 详情聊天页：消息流占满宽度、底部输入框固定贴底（适配 iOS Safari 100vh 问题，使用 `100dvh`）
- 顶部操作按钮（暂停、结束、下一轮等）改为图标 + ⋮ 菜单

### 8. 模板库（TemplateGalleryPage）
- 模板卡片：单列，预览图按比例缩小
- 模板编辑器：表单字段单列，渐变控件 stops 行改为标签在上、控件在下

### 9. 公开分享页（PublicSharePage）
- 简历预览同样使用等比缩放策略
- 分享密码输入框、操作按钮在小屏下不挤压

### 10. 触控目标
- 所有可点击/可拖拽元素最小 44×44pt
- 表单 input 使用 16px 字体，避免 iOS Safari 触发自动缩放

## Acceptance Criteria

- [ ] iPhone 14（390×844）和 Pixel 7（412×915）模拟下，所有页面无横向滚动、无内容重叠
- [ ] 工作台→打开简历→切换到「预览」→返回工作台 全流程在手机上可顺畅完成
- [ ] 在手机上完整完成一次「新建简历→填写个人信息→添加工作经历→拖拽排序→保存→分享→预览分享链接」
- [ ] 在手机上完整完成一次面试：创建→进行→查看报告
- [ ] 桌面端（≥1281px）视觉与交互与改造前完全一致（视觉回归通过）
- [ ] 手机端汉堡菜单可打开/关闭，Drawer 内所有跳转入口可用
- [ ] Modal 在手机上以底部 Drawer 形式呈现，可下滑关闭
- [ ] 拖拽 section 顺序在手机上长按可生效，不与页面滚动冲突

## Definition of Done

- 在 Chrome DevTools 移动设备模拟下手测主要流程（iPhone 14 / Pixel 7 / iPad mini 横竖屏）
- `npm run lint` 通过
- `npm run build` 通过（含 tsc -b）
- 桌面端视觉无回归（人工对比关键页面截图）
- 媒体查询集中在 `index.css` 末尾，便于后续维护

## Technical Approach

**核心策略：CSS-first，最小化 JS 改造**

1. **CSS 层**：新增 `@media (max-width: 480px)` 段（追加到 `index.css` 末尾），重写关键布局类的网格/Flex 规则
2. **JS 层**：仅在三处必须感知设备的地方使用 `useIsMobile()` hook：
   - 编辑器 Tab 切换（手机才显示 Tab，桌面继续两栏）
   - Modal → Drawer 条件渲染
   - dnd-kit 的 sensor 切换（TouchSensor vs PointerSensor）
3. **Hook 实现**：`window.matchMedia('(max-width: 480px)')` + `useSyncExternalStore`，避免 SSR 闪烁（Vite SPA 项目其实无 SSR，但写法保持稳健）
4. **A4 预览缩放**：在 `ResumePreview` 容器上加 `transform: scale(var(--mobile-scale))` + `transform-origin: top left`，外层包一个等高占位元素维持滚动尺寸；变量在 ≤480px 媒体查询里设为 `calc(100vw / 794)`

## Decision (ADR-lite)

**Context**：项目原本只为桌面 + 平板设计，最窄断点 720px 仅做了少量调整；用户希望手机也能流畅查看 + 完整编辑。

**Decision**：
- 采用 Tab 切换形态作为手机端编辑器布局，而非堆叠或抽屉
- 顶部多按钮工具栏在手机上收纳为汉堡菜单 + 右侧 Drawer
- 增加 `≤480px` 专项断点，桌面（≥1281px）和平板（481–1280px）保持现状
- Modal 在手机上自动转为底部 Drawer
- 拖拽排序在手机上通过 dnd-kit `TouchSensor`（250ms 长按）+ 显式手柄实现
- A4 简历预览采用 CSS scale 等比缩放到屏宽

**Consequences**：
- 桌面端代码不动，回归风险极低
- 引入一个 `useIsMobile()` hook 作为设备感知的唯一入口，便于未来扩展
- PDF 导出在手机上仍依赖 html2canvas，可能在 iOS Safari 上有 DPI/内存问题，本期不做完整支持，已列入 Out of Scope
- 软键盘弹起、横屏特殊优化未纳入，可能在 iOS Safari 上 input 聚焦时有视觉跳动，后续如有反馈再开新任务

## Out of Scope

- **手机端 PDF 导出完整支持**：html2canvas + jspdf 在 iOS Safari 上的 DPI/内存问题需专项验证和分页降级，留作下一期
- **横屏 + 软键盘弹起特殊处理**：input 聚焦时的视觉避让、横屏时 A4 预览的额外放大策略
- **平板独立优化**：481–1280px 沿用现有规则，不做新增专项设计
- **原生 App 化（PWA / 离线）**：不在本次目标内

## Technical Notes

- 现有媒体查询位置：`frontend/src/index.css:1900`（720px）、`:2711`（1280px）、`:2767`（900px）
- `WorkspacePage.tsx` 是工作台 + 编辑器双形态的承载页（约 1200 行）
- `ResumePreview.tsx` 已支持 `previewMode: "auto" | "a4-fit" | "a4-paged"`，可直接复用 a4-fit 思路，但 mobile scale 是新增需求
- `index.html` 已有 `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`，无需改动
- Antd 6 的 `Drawer` 原生支持 `placement="bottom"`，无需额外依赖
- 依赖现状：`@dnd-kit/core` 已装，自带 `TouchSensor`
