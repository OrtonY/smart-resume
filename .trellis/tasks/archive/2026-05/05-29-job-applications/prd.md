# 简历投递台 - 投递记录 CRUD

## Goal

为 Smart Resume 新增「简历投递台」功能模块，让用户可以记录每次简历投递的信息（目标公司、职位、投递时间、状态等），并提供完整的增删改查能力，帮助用户追踪求职进度。

## Requirements

### 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 目标公司 | string | ✅ | 公司名称 |
| 投递职位 | string | ✅ | 职位名称 |
| 投递时间 | datetime | ✅ | 默认当前时间，可修改 |
| 状态 | enum | ✅ | 已投递 / 面试中 / 已通过 / 已拒绝 / 已放弃 |
| 投递渠道 | string | ❌ | 枚举默认值 + 自由输入（AutoComplete） |
| 关联简历 | FK (nullable) | ❌ | 可选关联 resumes 表 |
| 备注 | text | ❌ | 长文本备注 |

### 状态枚举

```
applied      已投递
interviewing 面试中
offered      已通过
rejected     已拒绝
withdrawn    已放弃
```

### 投递渠道默认值

`Boss直聘`、`智联招聘`、`猎聘`、`58同城`、`前程无忧`、`鱼泡`、`牛客`

前端 AutoComplete 提供以上候选项，用户可自由输入其他渠道。后端字段类型为 VARCHAR，不做枚举约束。

### 功能特性

* 表格列表视图：分页、状态筛选、关键词搜索（公司名 / 职位）
* 创建 / 编辑通过模态框完成（公司、职位、状态必填）
* 软删除（项目统一约定 `deleted` / `deleted_at`）
* 用户数据隔离（`user_id` 字段）
* 默认按投递时间倒序排列
* 关联简历为可选下拉，简历删除时投递记录保留（`resume_id` 置 NULL）

## Acceptance Criteria

* [ ] 用户可通过模态框创建投递记录，公司 + 职位 + 状态必填
* [ ] 列表支持分页（默认 PageSize 20）
* [ ] 列表支持按状态筛选
* [ ] 列表支持按关键词模糊搜索（公司或职位）
* [ ] 用户可编辑投递记录的所有字段
* [ ] 用户可删除投递记录（软删除）
* [ ] 渠道字段在创建/编辑时显示 AutoComplete 默认候选项
* [ ] 关联简历为可选下拉，删除简历后投递记录的 `resume_id` 置空
* [ ] 默认按投递时间倒序排列
* [ ] 多用户数据严格隔离

## Definition of Done

* 后端单元/集成测试覆盖 CRUD 核心路径
* 前端 lint / typecheck 通过
* i18n 中英文文案齐备
* Flyway migration 可正常 up

## Technical Approach

### 后端（参照 Interview 模块结构）

```
backend/src/main/java/com/smartresume/application/
├── controller/JobApplicationController.java
├── domain/JobApplicationEntity.java
├── dto/JobApplicationDtos.java
├── mapper/JobApplicationMapper.java
└── service/JobApplicationService.java
```

REST 端点：
- `GET    /applications` — 分页列表（status / keyword / page / pageSize）
- `POST   /applications` — 创建
- `GET    /applications/{id}` — 详情
- `PUT    /applications/{id}` — 更新
- `DELETE /applications/{id}` — 软删除

### 数据库（Flyway V27）

```sql
CREATE TABLE job_applications (
  id           VARCHAR(64)  PRIMARY KEY,
  user_id      VARCHAR(64)  NOT NULL,
  resume_id    VARCHAR(64)  NULL REFERENCES resumes(id) ON DELETE SET NULL,
  company      VARCHAR(255) NOT NULL,
  position     VARCHAR(255) NOT NULL,
  channel      VARCHAR(64)  NULL,
  status       VARCHAR(32)  NOT NULL,
  applied_at   TIMESTAMP    NOT NULL,
  notes        TEXT         NULL,
  deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at   TIMESTAMP    NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_applications_user ON job_applications(user_id, deleted, applied_at DESC);
CREATE INDEX idx_job_applications_resume ON job_applications(resume_id);
```

### 前端

```
frontend/src/features/application/
├── api/applicationApi.ts
├── components/
│   ├── ApplicationListView.tsx
│   ├── ApplicationCreateModal.tsx
│   └── ApplicationEditModal.tsx
├── constants/channels.ts   # 默认渠道枚举
└── types.ts

frontend/src/pages/ApplicationsPage.tsx
```

路由：`/app/applications`，添加到 `AppRouter.tsx` 的 authenticated routes。

UI：Ant Design `Table` + `Modal` + `Form` + `AutoComplete`（渠道字段）+ `Select`（状态、关联简历）。

## Out of Scope

* 投递统计 / 图表面板
* 面试日程提醒
* 与 Interview 模块联动（投递 → 自动创建模拟面试）
* 看板（Kanban）视图
* 用户自定义状态
* 回收站 / 软删除恢复 UI（后端支持，前端暂不暴露）

## Implementation Plan

* **PR1**: 后端 — Flyway V27 + entity + mapper + service + controller + 单元测试
* **PR2**: 前端 — features/application 模块 + 路由 + 列表/创建/编辑/删除 UI
* **PR3**: i18n（zh-CN / en-US）+ 边界处理 + 整体联调

## Technical Notes

* 参考模块：`com.smartresume.interview`（结构最相似的 CRUD 模块）
* 实体 ID 约定：预分配 UID（参考 `ResumeEntity` / `InterviewSessionEntity`）
* 分页：使用 `ApiPageDefaults` + `ApiResponse<T>` 包装
* 软删除：MyBatis-Flex 全局 logic-delete 配置已就位
* 前端分页：`lib/http/pageDefaults.ts`
* 前端 HTTP：`lib/http/apiClient.ts` 的 `request<T>` 函数
