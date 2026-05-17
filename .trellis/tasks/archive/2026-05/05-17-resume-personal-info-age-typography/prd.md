# 简历个人信息：新增年龄字段 + 字体样式可调（两期）

## Goal

让用户在简历个人信息里直接录入年龄，预览渲染为「N岁」；后续期再为模板/字段提供字体、字号、加粗等排版调整能力。两期串行推进，避免年龄字段在字体能力上线后被推翻样式。

## Scope (this task = PR1 only)

只交付「年龄字段」。字体/字号/加粗等排版能力作为独立 brainstorm 任务在 PR1 落地后再开。

## Confirmed decisions

1. 字段命名 / 存储：`PersonalInfo` 新增 `age: string`（与现有字段类型统一，全部 string；空字符串表示未填）
2. 录入：用户直接填岁数（如「28」），不存出生日期、不做日期换算
3. 录入控件：和现有字段一致的 antd `Input`，placeholder「年龄」
4. 渲染：在 `ResumePreview.createPreviewModel` 的 `contact` 数组里追加一项 `{ label: "年龄", value: "28岁" }`，DOCX 同样
5. 校验规则：`trim` 后 `parseInt`，仅当是 `[1, 150]` 区间整数时渲染，否则整项不渲染（静默 skip）
6. 兼容旧数据：后端 Jackson 默认 `FAIL_ON_UNKNOWN_PROPERTIES=false`（Spring Boot 默认），旧 JSON 缺 `age` 反序列化为 null/空字符串

## What I already know (from repo inspection)

- 简历内容前后端都以 JSON 流转，存 `content_json text` 列（`V1__init_schema.sql:23`），新增字段不需要数据库迁移
- 前端 `PersonalInfo` 类型：`frontend/src/features/resume/types.ts:1-10`
- 后端 record：`backend/src/main/java/com/smartresume/resume/dto/ResumeDtos.java:89-98`
- 编辑器表单：`frontend/src/pages/WorkspacePage.tsx:1706-1742`（每个字段一个 antd `Input`）
- 预览拼装：`frontend/src/features/resume/components/ResumePreview.tsx`（contact 数组，电话/邮箱/城市/链接/期望薪资）
- DOCX 导出：`frontend/src/features/resume/export/docxExport.ts:211+`
- `createEmptyResumeContent()` 在 `types.ts:143` —— 默认值要加 `age: ''`
- 模板系统目前只有颜色 token，无字体相关 token（PR2+ 范围）
- Spring Boot Jackson `FAIL_ON_UNKNOWN_PROPERTIES` 默认 false，未在 application.yml 中显式开启

## Requirements

- `PersonalInfo`（前端 interface + 后端 record）新增 `age: string`
- `createEmptyResumeContent` 默认 `age: ''`
- 编辑器表单新增「年龄」Input，与其他字段排在同一 SectionGrid 里
- `createPreviewModel` 在 contact 末尾追加 `{ label: '年龄', value: '<N>岁' }`，仅当 age 合法时
- DOCX 导出按相同规则在 contact 行追加年龄
- 旧简历（content_json 没有 age）打开不报错

## Acceptance Criteria

- [ ] 编辑器输入「28」，保存→重新打开，年龄保留
- [ ] 预览 contact 区出现「年龄：28岁」
- [ ] 输入「abc」/「0」/「200」/空 → 预览不出现年龄行
- [ ] 既有简历（无 age 字段）打开正常，年龄行不显示
- [ ] DOCX 导出和预览展示规则一致
- [ ] 后端单元测试覆盖：旧 JSON（无 age）反序列化为合法对象
- [ ] 前端 lint / typecheck / build 通过
- [ ] 后端 `mvn test` 通过

## Definition of Done

- 三处消费点（编辑器 / 预览 / DOCX）行为一致
- 前后端字段命名 / 类型同步
- 兼容性测试覆盖旧数据
- CI 全绿

## Out of Scope

- 字体、字号、字重、字体族等排版能力（PR2+ 独立任务）
- 出生日期录入（用户每年自行更新岁数）
- 国际化（"年龄"、"N岁" 文案直接硬编码中文）
- AI 助手 prompt 里使用 age

## Technical Approach

**前端**
- `types.ts`：`PersonalInfo` 加 `age: string`；`createEmptyResumeContent` 默认 `''`
- `WorkspacePage.tsx`：在 personal-info SectionGrid 内追加一个 Input（与 expectedSalary 同模式），placeholder「年龄」
- `ResumePreview.tsx`：新增 `formatAge(age: string): string | null` 辅助函数，在 `createPreviewModel` 里 push 到 contact
- `docxExport.ts`：复用同一个辅助函数（导出到 utils 或就近再写一份私有版本——按现有代码组织选择）

**后端**
- `ResumeDtos.java`：`PersonalInfo` record 加 `String age`
- 反序列化兼容性靠 Spring Boot Jackson 默认行为（`FAIL_ON_UNKNOWN_PROPERTIES=false`，缺失字段 → null）
- 新增/补充测试：用一段不含 age 的旧 JSON 反序列化，断言 age 为 null/空，其他字段正确

**渲染规则函数（伪代码）**
```ts
function formatAge(age: string): string | null {
  const trimmed = age?.trim()
  if (!trimmed) return null
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(n)) return null
  if (n < 1 || n > 150) return null
  return `${n}岁`
}
```

## Decision (ADR-lite)

**Context**: 用户希望在个人信息里加年龄字段，HR 一眼可读；同时希望未来能调整字体/字号/加粗。

**Decision**:
- 字段拆分为两期：年龄字段先做，字体可视化编辑后做
- 直接存岁数（string），渲染时校验范围后拼「岁」
- 年龄展示进 contact 数组，复用现有 label-value 渲染管线，不动模板布局

**Consequences**:
- 改动局限在 5 个文件，4 个模板天然继承新字段，无需改模板逻辑
- 简单字符串 + 渲染时校验，UI 改动量最小，用户输入非法时静默 skip 而非弹错（与现有所有字段一致）
- 用户每年要自己更新岁数；牺牲了"自动跟随时间"换来实现简单（用户决策）

## Implementation Plan (small PRs)

- **PR1**（本任务）: PersonalInfo 加 age + 编辑表单 + 预览 + DOCX + 后端兼容性测试
- **PR2+**（后续 brainstorm）: 字体可视化编辑能力，独立任务

## Technical Notes

- 字段位置：编辑器表单内排在「期望薪资」后（顺序：fullName / headline / phone / email / city / website / expectedSalary / age）
- contact 数组顺序：电话/邮箱/城市/链接/期望薪资/年龄（年龄附在末尾）
- 不做 antd `InputNumber` / `DatePicker`：与现有表单视觉一致性优先
