# 前端细节优化：品牌重命名与UI精简

## Goal

对前端界面进行品牌统一和UI精简：将产品名称统一为"智慧简历"，移除冗余提示信息，调整按钮位置，并为编辑页输入框添加固定标签以提升可用性。

## What I already know

- 首页 hero 区域使用 `<Tag color="gold">Resume Studio</Tag>`，下方有副标题段落
- 模板目录页有多处提示性 Alert（数据源说明、操作提示）
- "从备份恢复内置模板"按钮在模板编辑工具栏中，仅编辑模式显示；"新建模板"按钮在模板目录卡片 header 的 extra 中
- 简历编辑页顶部有 `resume-editor-shell__meta` 区域，显示模板名称、摘要和"右侧预览常驻"标签
- 所有输入框仅有 placeholder，用户输入后无法知道字段含义

## Requirements

1. **品牌统一**：首页 `Resume Studio` → `智慧简历`，同时精简下方描述文字
2. **模板目录提示移除**：移除模板目录页的提示性 Alert（操作提示 + 数据源说明）
3. **恢复内置模板按钮移位**：将"从备份恢复内置模板"按钮移至"新建模板"按钮旁边（模板目录卡片 header 的 extra 区域）
4. **编辑页模板介绍移除**：移除简历编辑页顶部的模板样式介绍区域（`resume-editor-shell__meta`）
5. **输入框添加固定标签**：在每个 Input 上方添加小号灰色标签文本（`<Text type="secondary" style={{ fontSize: 12 }}>标签</Text>`），使用户输入内容后仍能识别字段含义

## Acceptance Criteria

- [ ] 首页显示"智慧简历"品牌名，无英文品牌名残留
- [ ] 模板目录页无冗余提示 Alert
- [ ] "从备份恢复内置模板"按钮出现在"新建模板"按钮旁边
- [ ] 简历编辑页顶部无模板样式介绍区域
- [ ] 所有编辑区域输入框在用户输入后仍能通过标签识别字段含义
- [ ] lint / typecheck 通过

## Definition of Done

- Lint / typecheck / CI green
- 手动验证：首页、模板目录、编辑页三个页面均符合预期

## Out of Scope

- 输入框标签的样式微调（如字体大小、颜色）后续可迭代
- 移动端适配调整

## Technical Notes

### 涉及文件

- `frontend/src/pages/WorkspacePage.tsx` — 首页 hero、编辑页 meta 区域、输入框
- `frontend/src/pages/TemplateGalleryPage.tsx` — 模板目录提示 Alert、按钮位置

### 输入框标签方案

当前输入框仅有 placeholder，用户输入后 placeholder 消失。需要添加固定标签。推荐方案：

- 个人信息区：使用 Ant Design `<Form.Item label="...">` 包裹，或为每个 Input 添加上方/左侧 label 文本
- 重复卡片区（教育/工作/项目/技能/荣誉/证书）：同上，在 Input 上方添加小号标签文本

具体标签文本对应关系：

| 模块 | 字段 | 标签 |
|------|------|------|
| 个人信息 | fullName | 姓名 |
| 个人信息 | headline | 职位/头衔 |
| 个人信息 | phone | 电话 |
| 个人信息 | email | 邮箱 |
| 个人信息 | city | 所在城市 |
| 个人信息 | website | 个人网站 |
| 个人信息 | expectedSalary | 期望薪资 |
| 个人信息 | age | 年龄 |
| 个人简介 | personalSummary | 个人简介 |
| 教育 | school | 学校 |
| 教育 | degree | 学位 |
| 教育 | major | 专业 |
| 教育 | startDate | 开始日期 |
| 教育 | endDate | 结束日期 |
| 教育 | description | 亮点描述 |
| 工作 | company | 公司 |
| 工作 | role | 职位 |
| 工作 | startDate | 开始日期 |
| 工作 | endDate | 结束日期 |
| 工作 | description | 工作内容 |
| 项目 | name | 项目名称 |
| 项目 | role | 角色 |
| 项目 | startDate | 开始日期 |
| 项目 | endDate | 结束日期 |
| 项目 | description | 项目描述 |
| 技能 | name | 技能名称 |
| 技能 | level | 熟练度 |
| 荣誉 | title | 奖项名称 |
| 荣誉 | issuer | 颁发机构 |
| 荣誉 | awardedAt | 获奖时间 |
| 荣誉 | description | 奖项说明 |
| 证书 | name | 证书名称 |
| 证书 | issuer | 签发机构 |
| 证书 | issuedAt | 签发时间 |
| 证书 | credentialId | 证书编号 |
