# Journal - orton (Part 1)

> AI development session journal
> Started: 2026-05-14

---



## Session 1: AI Resume Tool Implementation

**Date**: 2026-05-14
**Task**: AI Resume Tool Implementation
**Branch**: `master`

### Summary

Completed initial implementation of AI resume tool with Spring Boot backend, React + Ant Design frontend, single-user auth, resume CRUD, auto-save, multi-template support, PDF export, and public sharing features.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `a4dee3e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Resume template center and management

**Date**: 2026-05-14
**Task**: Resume template center and management
**Branch**: `master`

### Summary

Implemented a dynamic resume template center with backend catalog CRUD, backup restore flow, dedicated frontend management UI, and updated Trellis specs.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `57d35bc` | (see git log) |
| `13bf9ca` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Resume editor layout persistence and A4 preview workflow

**Date**: 2026-05-15
**Task**: Resume editor layout persistence and A4 preview workflow
**Branch**: `master`

### Summary

Persisted resume editor section order and hidden state across frontend, API, backend, and snapshots, then refined the editor layout with per-panel scrolling, inline hide toggles, share-link viewing from the list page, and A4-based preview behavior with centered modal preview.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `76b8bc2` | (see git log) |
| `b89a90c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Adjust resume frontend workflows

**Date**: 2026-05-15
**Task**: Adjust resume frontend workflows
**Branch**: `master`

### Summary

Adjusted resume homepage thumbnail pagination, recycle bin flow, template directory behavior, and editor template-switch return path; updated frontend state-management guidance and verified frontend lint/build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1c46819` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Resume preview pagination fix

**Date**: 2026-05-15
**Task**: Resume preview pagination fix
**Branch**: `master`

### Summary

Updated resume defaults and editor preview behavior, then fixed paged preview rendering to clip at module-level page breaks with square A4 pages and continuation spacing.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3ce0177` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Implement PDF and DOCX export

**Date**: 2026-05-15
**Task**: Implement PDF and DOCX export
**Branch**: `master`

### Summary

Implemented browser-based PDF export and template-aware DOCX export for resume editor, with UI wiring, dynamic loading, and verification.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4ab81b7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Add AI resume chat assistant

**Date**: 2026-05-16
**Task**: Add AI resume chat assistant
**Branch**: `master`

### Summary

Added backend AI configuration, Spring AI streaming chat with backend conversation history, Ollama support, resume editor AI configuration UI, draggable chat assistant, conversation list, and synchronized PRD/spec documentation.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3a763b1` | (see git log) |
| `74053cd` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: AI model provider modularization + DeepSeek adapter

**Date**: 2026-05-16
**Task**: AI model provider modularization + DeepSeek adapter
**Branch**: `master`

### Summary

Refactored AI model integration from if/else factory to strategy pattern with 3 providers (OpenAI, Ollama, DeepSeek). Added vendor metadata API, dynamic model listing endpoint, and localized frontend config panel with filterable model picker.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `2e1d9fa` | (see git log) |
| `ee00d56` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Frontend UX: drag-sort, toolbar consolidation, AI chat redesign

**Date**: 2026-05-16
**Task**: Frontend UX: drag-sort, toolbar consolidation, AI chat redesign
**Branch**: `master`

### Summary

Implemented three editor UX improvements: @dnd-kit drag-and-drop for module reordering, Dropdown menus for share/export toolbar consolidation, and a tab-based AI chat modal that defaults to new conversations.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b8562fb` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Resume pagination split & share preview fix

**Date**: 2026-05-16
**Task**: Resume pagination split & share preview fix
**Branch**: `master`

### Summary

Refined pagination algorithm to entry/fragment granularity; fixed public share page to use a4-paged mode and removed workspace back button.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `01cf1d6` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Share feature: password protection, access analytics, and management

**Date**: 2026-05-17
**Task**: Share feature: password protection, access analytics, and management
**Branch**: `master`

### Summary

Enhanced share links with optional password protection (BCrypt + HMAC token), per-visit access logging (time + IP), inline analytics in ShareLinksModal, and toggle/delete share management. Unified share creation modal with type radio + password switch.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3946c63` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 12: 模板编辑器可视化与中文化

**Date**: 2026-05-17
**Task**: 模板编辑器可视化与中文化
**Branch**: `master`

### Summary

Replaced raw text inputs on TemplateGalleryPage with AntD ColorPicker (10 fields) and a custom 2-stop linear-gradient editor (4 fields). Localized residual English (Theme tokens, Preview tokens, Template key, Built-in/Custom) to Chinese. Added per-field reset and unparseable-value fallback. Spec scenario added to state-management.md capturing kind classification rule, rgba canonicalization, and no-coerce fallback discipline.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `dcae9af` | (see git log) |
| `fd494e3` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 13: Add age field to resume personal info

**Date**: 2026-05-17
**Task**: Add age field to resume personal info
**Branch**: `master`

### Summary

Added age string field to PersonalInfo across frontend types, editor form, preview, DOCX export, and backend DTO. Includes render-time validation (formatAge) and legacy JSON deserialization test. Documented the resume content field addition pattern in spec.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `e562a37` | (see git log) |
| `9a9de91` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 14: Add inline markdown bold for resume description fields

**Date**: 2026-05-17
**Task**: Add inline markdown bold for resume description fields
**Branch**: `master`

### Summary

Added segment-level bold formatting to 5 resume description fields using markdown **bold** syntax. Includes mdast-based parser, MarkdownTextArea component with inline B toolbar (focused-visible, click to insert or toggle), and consistent rendering across Web preview, DOCX, and PDF exports. Also fixed missing age field in TemplateGalleryPage DEMO_RESUME.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1960fd4` | (see git log) |
| `b86b821` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 15: 前端UI优化：品牌重命名与精简

**Date**: 2026-05-17
**Task**: 前端UI优化：品牌重命名与精简
**Branch**: `master`

### Summary

品牌统一为智慧简历，移除冗余提示信息，移动恢复按钮位置，移除编辑页模板介绍，为所有输入框添加固定标签

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `331fbf6` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 16: Interview module scaffold

**Date**: 2026-05-17
**Task**: Interview module scaffold
**Branch**: `master`

### Summary

Implemented the interview module scaffold across backend and frontend, including optional resume binding, multi-interviewer rounds, placeholder interview flow, report placeholders, and Spring AI chat memory mirroring via stable interview conversation ids.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5ecbcfa` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 17: Resume scoring flow in editor

**Date**: 2026-05-18
**Task**: Resume scoring flow in editor
**Branch**: `master`

### Summary

Added editor-side resume scoring with optional JD input, a mock backend scoring contract/service, persistence of the latest score in local storage, and spec coverage for the cross-layer API.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0d8ab94` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 18: Merge interview actions in resume editor

**Date**: 2026-05-18
**Task**: Merge interview actions in resume editor
**Branch**: `master`

### Summary

Merged resume editor interview actions into one dropdown button while preserving create and related interview routes.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0f93263` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 19: Fix chat auto-scroll follow

**Date**: 2026-05-18
**Task**: Fix chat auto-scroll follow
**Branch**: `master`

### Summary

Implemented auto-scroll follow behavior for AI resume chat and interview chat message lists; added near-bottom detection to avoid forcing scroll when users read older messages; verified with frontend lint and build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9042640` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 20: Refactor AI conversation decoupling and migrate resume scoring to real AI

**Date**: 2026-05-18
**Task**: Refactor AI conversation decoupling and migrate resume scoring to real AI
**Branch**: `master`

### Summary

Extracted AiChatService as the shared AI invocation layer (stream / call / callStructured) with AiInvocationRequest, AiFeatureType enum, and AiConversationIdGenerator that produces a uniform {resumeId}_{featureCode}_{timestamp} id format. AiAgentService keeps only resume-chat specific concerns (system prompt assembly, 12ms char-level SSE delay) and now delegates to AiChatService.stream. AiChatHistoryService uses the new generator for resume-chat ids. AiResumeScoringService migrated from mock scoring to real AI via callStructured + BeanOutputConverter, response mode is now "ai", parse failures retry once then surface as service errors with no mock fallback. Vendor branching handles OpenAI/DeepSeek native JSON schema vs Ollama soft-constraint prompt injection. Added unit tests (AiChatServiceImplTest covers happy/error/retry/no-fallback paths; AiResumeScoringServiceTest updated for AI mode). Added reactor-test dep to backend/pom.xml. Documented the contract in three specs: new .trellis/spec/backend/ai-chat-service.md, refreshed ai-resume-scoring.md (mode=ai, retry policy, no mock fallback) and ai-chat-history.md (unified id generator), index updated.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c1fc157` | (see git log) |
| `a9049db` | (see git log) |
| `7ad042c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 21: 重构简历对话：聚焦+建议-确认-应用闭环

**Date**: 2026-05-18
**Task**: 重构简历对话：聚焦+建议-确认-应用闭环
**Branch**: `master`

### Summary

把自由 AI 对话重构为受控的「智慧简历 AI」：system prompt 收紧身份/范围/默认形态；SSE 末尾追加 type=suggestion 事件（哨兵协议 + 兜底）；新增 AiResumeSuggestion/Plan DTO 通用包；前端建议卡片状态机 + Apply/Skip + 全部应用/跳过 + dismissed 摘要回传；WorkspacePage section+field 分发到 setDraft 自动保存。修复：extractContent null 守护、persistenceSanitizer 阻止哨兵入 chat memory、skipNextHistoryReloadRef 防止历史重载吞掉当前轮 suggestions。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1f13bf1` | (see git log) |
| `bae22b8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: Interview module AI integration

**Date**: 2026-05-19
**Task**: Interview module AI integration
**Branch**: `master`

### Summary

Replaced placeholder interview responses with AI-powered questioning via AiChatService. Added role-specific prompts (HR/Leader/项目深挖/场景题/行为面试), difficulty-based question depth, per-round question counting (12-18), frontend timer with visibility-change pause, and at-least-one validation for resume/JD.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0b5a114` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 23: Implement AI Interview Report Generation

**Date**: 2026-05-19
**Task**: Implement AI Interview Report Generation
**Branch**: `master`

### Summary

Implemented full-stack AI interview report: async per-round evaluation with structured JSON output, SSE status push, startup recovery for stuck GENERATING state, duplicate generation guard, and frontend report panel with score visualization and collapsible question details.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `840e6cd` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 24: Markdown 渲染 + 面试 SSE 流式 + 输入框/报告抽屉 UI 修复

**Date**: 2026-05-19
**Task**: Markdown 渲染 + 面试 SSE 流式 + 输入框/报告抽屉 UI 修复
**Branch**: `master`

### Summary

完成会话界面 Markdown 渲染、面试官回复 SSE 流式输出、ABORTED 状态落库；修复面试详情页输入框未固定底部（.interview-detail__main flex 改为 1）、面试报告抽屉宽度改为 50% 视口。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `309bc34` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 25: Interview multi-round UI

**Date**: 2026-05-19
**Task**: Interview multi-round UI
**Branch**: `master`

### Summary

Add round_index column + multi-round UI: compact topbar, round tabs, thinking bubble, response-aware next-round overlay, and optimistic-message render fix.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `627b335` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 26: Remove DOCX export and lock built-in templates

**Date**: 2026-05-20
**Task**: Remove DOCX export and lock built-in templates
**Branch**: `master`

### Summary

Removed DOCX export feature (deleted docxExport.ts, narrowed types, simplified export button to direct PDF). Locked built-in templates: frontend shows read-only Result for builtIn templates, removed restore-from-backup UI, backend rejects update on builtIn templates with 403. Fixed pre-existing bug where re-clicking the selected custom template cleared the editor.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `06f46c3` | (see git log) |
| `732f344` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 27: Unify frontend layout and styles

**Date**: 2026-05-20
**Task**: Unify frontend layout and styles
**Branch**: `master`

### Summary

Unified button styles, added Smart Resume tag, replaced report Drawer with centered Modal, added markdown rendering to report rounds, tightened markdown spacing, removed lock-workspace from non-homepage views.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `cd6a7a1` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 28: Interview center layout fix + resume markdown editor unification

**Date**: 2026-05-20
**Task**: Interview center layout fix + resume markdown editor unification
**Branch**: `master`

### Summary

Fixed interview center flex layout (consistent 1-row/2-row display, scrollable JD). Unified resume editor to MarkdownComposer with full toolbar. Extended inline markdown parser to support italic, code, links in preview.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d8f12c7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 29: Interview conversation optimization

**Date**: 2026-05-20
**Task**: Interview conversation optimization
**Branch**: `master`

### Summary

Optimized interview round context isolation, timer persistence, regenerated-message controls, and structured topic extraction prompts.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0c9d58e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 30: Home and interview AI UX polish

**Date**: 2026-05-20
**Task**: Home and interview AI UX polish
**Branch**: `master`

### Summary

Moved AI configuration to the home page, improved interview completion and paused-session behavior, made chat sending button-only with Enter for newlines, adjusted report layout, and fixed authenticated report SSE streaming.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d9bfd07` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 31: Add Apache 2.0 open-source metadata

**Date**: 2026-05-20
**Task**: Add Apache 2.0 open-source metadata
**Branch**: `master`

### Summary

Added Apache 2.0 LICENSE and NOTICE files, updated bilingual README license sections, corrected the documented Node.js prerequisite, and archived the completed open-source metadata task.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ced803f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 32: Interview company context and modal UX

**Date**: 2026-05-21
**Task**: Interview company context and modal UX
**Branch**: `master`

### Summary

Added interview company-context persistence and polished the interview creation/detail UI, including modal scrolling, interviewer ordering, and discoverable company hover details.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1847311` | (see git log) |
| `04997b6` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 33: Optimize project readmes

**Date**: 2026-05-21
**Task**: Optimize project readmes
**Branch**: `master`

### Summary

Refreshed the English and Chinese project READMEs, rewrote the frontend README, and integrated all docs screenshots into the root documentation tour.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `db60f6c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 34: Multi-user support implementation and wrap-up

**Date**: 2026-05-22
**Task**: Multi-user support implementation and wrap-up
**Branch**: `codex/multi-user-support`

### Summary

Implemented multi-user account isolation across backend and frontend, added auth/workspace flow updates, then archived task 05-21-multi-user-support.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4ad90b4` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
