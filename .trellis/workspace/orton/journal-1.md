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
