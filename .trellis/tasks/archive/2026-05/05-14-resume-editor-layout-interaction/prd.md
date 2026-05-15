# brainstorm: 简历编辑器布局与交互重构

## Goal

将当前“工作区型”简历编辑页重构为更贴近专业简历编辑器的体验，让用户可以围绕“模块组织、内容编辑、实时预览、导出分享”完成高频操作，而不是在简历列表、模板入口、分享卡片和大段表单之间来回切换。

## What I already know

* 用户明确表示当前简历修改的布局和操作逻辑不是想要的效果，并给出了一张参考图。
* 参考图的核心模式是三段式工作台：
  左侧是“可添加的简历模块清单”，中间是“按模块展开的编辑区”，右侧是“实时预览”。
* 参考图中的每个模块卡片都带有局部操作，至少包含排序、显示/隐藏、删除。
* 当前实现位于 [frontend/src/pages/WorkspacePage.tsx](D:/Project/IDEA/study/smart-resume/frontend/src/pages/WorkspacePage.tsx)。
* 当前页面的左侧栏主要承担“简历列表/创建/回收站/退出”职责，而不是“当前简历的结构导航”。
* 当前页面主体通过 `Collapse` 承载各个 section 的表单编辑，右侧展示预览和分享链接。
* 当前布局样式位于 [frontend/src/index.css](D:/Project/IDEA/study/smart-resume/frontend/src/index.css)，`workspace-columns` 是一个双栏网格，而不是“结构导航 + 内容编辑 + 预览”的编辑器布局。
* 当前重复 section（教育、工作、项目、技能等）支持“添加条目/删除条目”，但缺少 section 级排序、显隐、重命名、结构导航和页面溢出反馈。

## Assumptions (temporary)

* 这次调整优先级在前端交互和信息架构，不以改动后端数据模型为前提。
* 用户更想要的是“编辑器式工作流重构”，不是单纯换视觉皮肤。
* MVP 可以先聚焦桌面端主工作流，移动端保持可用即可，不追求完全一致的高级交互。

## Open Questions

* 暂无

## Requirements

* 编辑器需要把“当前简历结构”与“简历列表管理”拆开，避免一个左侧栏承担两种心智模型。
* 编辑器整体方向确定为“模块驱动编辑器”，以“左侧结构、中间编辑、右侧预览”为主骨架。
* MVP 先只覆盖固定核心模块的排序、显隐、增删，不引入自定义模块和复杂跨模块布局。
* 进入单份简历编辑器后，不保留完整的简历切换能力；切换其他简历应回到列表页完成。
* 桌面端右侧预览区默认始终常驻，以强化“边编辑边预览”的主工作流。
* 中间编辑区默认按模块纵向排开，用户可按需展开/折叠单个模块。
* 当前简历的各个 section 需要具备更明确的结构导航与局部操作能力。
* 预览区应保持高可见性，并与编辑行为形成稳定的空间映射。
* 自动保存、导出、分享、模板切换等全局动作不能打断内容编辑主线。
* 布局和交互应服务于真实的简历编辑高频动作：
  新增 section、编辑字段、调整顺序、控制显隐、检查预览、处理分页/导出。

## Acceptance Criteria

* [ ] 新的编辑器信息架构清楚区分“简历管理”和“当前简历编辑”。
* [ ] 编辑器主布局采用“结构导航 + 内容编辑 + 实时预览”的模块驱动模式。
* [ ] MVP 中固定核心模块支持排序、显隐、增删。
* [ ] 单份简历编辑器不再混入完整简历列表侧栏。
* [ ] 桌面端右侧预览区在编辑过程中始终可见。
* [ ] 中间编辑区保留整份简历的模块连续感，而不是一次只编辑一个模块。
* [ ] 用户可以快速理解每个 section 在简历中的位置、状态和可执行操作。
* [ ] 预览区在编辑时保持稳定反馈，不需要频繁跳转页面查看结果。
* [ ] 自动保存状态、导出、分享、模板操作有明确位置，不挤占内容编辑主区域。
* [ ] MVP 范围被清楚限定，避免把模板系统、分享系统、导入导出一次性全做重。

## Technical Approach

* 将当前“简历列表 + 编辑器”混合页收敛为单份简历编辑器页面。
* 顶部保留全局动作：
  返回列表、简历标题、自动保存状态、导出、分享、模板切换。
* 左侧改为当前简历结构栏：
  固定核心模块列表、模块显隐状态、排序入口、添加模块入口。
* 中间改为模块编辑栈：
  所有核心模块纵向排列，每个模块为独立卡片，支持展开/折叠和局部操作。
* 右侧改为常驻预览栏：
  实时预览、保存状态反馈、后续可扩展页码/溢出提示。
* 第一版尽量复用现有 `ResumePreview` 和各 section 表单字段，只先重组布局与交互壳层。

## Decision (ADR-lite)

**Context**: 当前工作区更像“简历管理页 + 大表单”，与用户期待的专业简历编辑器操作流不一致。  
**Decision**: 采用“模块驱动编辑器”方向，主界面重构为左侧结构导航、中间模块编辑、右侧实时预览。  
**Consequences**: 需要弱化当前左栏中的简历列表职责，并重新安置模板、分享、导出等次级操作；但能显著改善 section 导航、局部操作和实时预览体验。

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope

* 本轮不先讨论 AI 润色、JD 匹配、翻译、语法检查等增强功能的细节。
* 本轮不默认改动简历数据 schema，除非后续确认“section 排序/显隐/自定义 section”无法只靠前端完成。
* 本轮不先定义所有模板视觉重构，只聚焦编辑器运行模式。

## Technical Notes

* Current page: [frontend/src/pages/WorkspacePage.tsx](D:/Project/IDEA/study/smart-resume/frontend/src/pages/WorkspacePage.tsx)
* Current workspace styles: [frontend/src/index.css](D:/Project/IDEA/study/smart-resume/frontend/src/index.css)
* Preview component: [frontend/src/features/resume/components/ResumePreview.tsx](D:/Project/IDEA/study/smart-resume/frontend/src/features/resume/components/ResumePreview.tsx)
* Research references:
  * [research/current-editor-audit.md](D:/Project/IDEA/study/smart-resume/.trellis/tasks/05-14-resume-editor-layout-interaction/research/current-editor-audit.md)
  * [research/resume-builder-benchmarks.md](D:/Project/IDEA/study/smart-resume/.trellis/tasks/05-14-resume-editor-layout-interaction/research/resume-builder-benchmarks.md)
