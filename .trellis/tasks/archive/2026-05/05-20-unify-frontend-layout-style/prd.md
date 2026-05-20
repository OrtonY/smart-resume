# 统一前端布局和样式

## Goal

统一首页、模板目录、面试中心、面试对话、回收桶页面的按钮大小、颜色风格和布局框架，使整体 UI 一致性更强。

## Requirements

### 1. 首页 (ResumeListView)
- h1"智慧简历"上方增加 `<Tag color="blue">Smart Resume</Tag>` 英文小字标签
- "模板目录"按钮去掉 `type="primary"`，改为白色默认样式
- 所有 action 按钮去掉 `size="large"`，统一为默认中号

### 2. 模板目录页 (TemplateGalleryPage)
- "返回工作区"按钮外面增加外框容器，样式参考 `resume-editor-shell__meta`（圆角边框 + 半透明背景）

### 3. 面试中心 (InterviewPage 列表视图)
- "新建面试"按钮去掉 `type="primary"`，改为白色默认样式
- 所有 action 按钮去掉 `size="large"`，统一为默认中号

### 4. 面试对话页 (InterviewDetailView)
- "查看报告"按钮从 `type="text"` 图标按钮改为默认样式文字按钮，显示文字"查看报告"
- 报告展示从 `<Drawer width="50%">` 改为居中 `<Modal>`：
  - 横向宽度占页面 2/3
  - 纵向满屏
  - 内容超出使用内部滚动（Modal body 内滚动，非页面滚动）

### 5. 回收桶 (RecycleBinView)
- "返回首页"按钮去掉 `type="primary"`，改为白色默认样式
- 所有 action 按钮去掉 `size="large"`，统一为默认中号

## Acceptance Criteria

- [ ] 首页"智慧简历"上方有 `<Tag color="blue">Smart Resume</Tag>`
- [ ] 首页"模板目录"为白色默认按钮
- [ ] 首页/面试中心/回收桶所有 action 按钮为默认中号
- [ ] 模板目录页"返回工作区"有外框容器
- [ ] 面试中心"新建面试"为白色默认按钮
- [ ] 回收桶"返回首页"为白色默认按钮
- [ ] "查看报告"显示为带边框的文字按钮
- [ ] 报告以居中 Modal 展示，纵向满屏，横向 2/3，内容内部滚动

## Definition of Done

* Lint / typecheck green
* 各页面按钮风格视觉一致

## Technical Approach

### 涉及文件
- `frontend/src/pages/WorkspacePage.tsx` — 首页 + 回收桶按钮修改
- `frontend/src/pages/InterviewPage.tsx` — 面试中心按钮 + 查看报告改 Modal
- `frontend/src/pages/TemplateGalleryPage.tsx` — 返回工作区加外框
- `frontend/src/index.css` — 外框样式（可复用 `resume-editor-shell__meta` 或新建类）

### 实现要点
1. 按钮统一：去掉 `type="primary"` 和 `size="large"`
2. 英文标签：复用面试中心已有的 `<Tag color="blue">` 模式
3. 模板目录外框：新增一个包裹容器，应用类似 `resume-editor-shell__meta` 的样式
4. 报告 Modal：用 Ant Design `<Modal>` 替换 `<Drawer>`，设置 `width="66%"`，通过 CSS 控制满屏高度和内部滚动

## Out of Scope

- 简历编辑页按钮样式不变（已有独立布局）
- 模板目录页不新增"锁定工作区"按钮
- 按钮功能逻辑不变，仅调整视觉样式

## Technical Notes

- 首页按钮区：`WorkspacePage.tsx:707-726`
- 面试中心按钮区：`InterviewPage.tsx:366-374`
- 回收桶按钮区：`WorkspacePage.tsx:1212-1221`
- 查看报告按钮：`InterviewPage.tsx:707-712`
- 报告 Drawer：`InterviewPage.tsx:849-870`
- 模板目录返回按钮：`TemplateGalleryPage.tsx:504-507`
- 外框参考样式：`index.css:389-394` (resume-editor-shell__meta)
