# Journal - orton (Part 2)

> Continuation from `journal-1.md` (archived at ~2000 lines)
> Started: 2026-05-29

---



## Session 60: Invalidate deleted snapshot share links

**Date**: 2026-05-29
**Task**: Invalidate deleted snapshot share links
**Branch**: `codex/resume-share-snapshot-hash`

### Summary

Added hash-aware snapshot sharing, soft-delete snapshot handling, invalid share target state, frontend invalid/disabled distinction, and migration support for invalid snapshot share targets.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d6295ae` | (see git log) |
| `9c8ab9a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 61: Physical delete AI history

**Date**: 2026-05-29
**Task**: Physical delete AI history
**Branch**: `codex/physical-delete-ai-history`

### Summary

Implemented physical delete flows for resumes and interviews with associated AI history cleanup and UI actions.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `be53a55` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 62: Implement AI chat style modes (savage & sarcastic)

**Date**: 2026-05-29
**Task**: Implement AI chat style modes (savage & sarcastic)
**Branch**: `feat/resume-ai-chat-style-modes`

### Summary

Added per-conversation style selector with savage/sarcastic personas, backend enum + migration + prompt map, frontend segmented control, i18n, and unit tests.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ca38831` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 63: 简历投递台 CRUD with mobile and view support

**Date**: 2026-05-30
**Task**: 简历投递台 CRUD with mobile and view support
**Branch**: `feat/job-applications`

### Summary

Implemented job application tracker: backend CRUD APIs with physical delete, frontend page with desktop table + mobile card list, create/edit/view modals, workspace navigation, i18n. Mobile modal height capped to prevent page stretch.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d991bee` | (see git log) |
| `8814194` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 64: Resume DOCX export

**Date**: 2026-05-31
**Task**: Resume DOCX export
**Branch**: `feature/docx-export`

### Summary

Implemented DOCX export layout routing for the three resume templates, fixed date and personal info rendering in DOCX output, and added frontend wording for the Word export notice.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `6dbc695` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 65: Resume text rewrite finish

**Date**: 2026-05-31
**Task**: Resume text rewrite finish
**Branch**: `codex/bullet-ai-rewrite`

### Summary

Added AI rewrite for resume text spans across personal summary, education highlights, work experience, and project descriptions; preview-first apply flow with selection-or-full-text behavior.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `242b709` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 66: Optimize DOCX resume export layout

**Date**: 2026-06-01
**Task**: Optimize DOCX resume export layout
**Branch**: `codex/optimize-docx-export-format`

### Summary

Compared exported PDF and DOCX samples, then fixed DOCX masthead layout, avatar embedding, age display, and timeline field positioning for the resume templates.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `537a0c9` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 67: Release v1.1.2

**Date**: 2026-06-01
**Task**: Release v1.1.2
**Branch**: `codex/finish-release-1-1-2`

### Summary

Released Smart Resume v1.1.2: bumped frontend/backend versions, merged release PRs, created tag v1.1.2, and published GitHub Release with backend-1.1.2.jar.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `acab376` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 68: JSON import/export

**Date**: 2026-06-01
**Task**: JSON import/export
**Branch**: `codex/json-import-export`

### Summary

Added JSON import/export for resumes, including lightweight JSON export from visible sections, unified template catalog JSON import, and backend parsing that keeps missing modules visible as empty data under the default layout.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `16cd0b8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 69: Resume translation workflow

**Date**: 2026-06-01
**Task**: Resume translation workflow
**Branch**: `codex/resume-translation`

### Summary

Implemented editor-driven Chinese/English resume translation with backend AI structured output, copy/overwrite flows, conservative normalization, avatar stripping for AI prompts, tests, and code-spec updates.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b8b1d25` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 70: Optimize mobile resume JD heatmap

**Date**: 2026-06-02
**Task**: Optimize mobile resume JD heatmap
**Branch**: `codex/resume-jd-heatmap-eval`

### Summary

Added resume JD heatmap scoring and optimized the mobile heatmap rendering path with lightweight score bars, mobile requirement pagination, and detail toggles to avoid Drawer scroll freezes.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `233f963` | (see git log) |
| `8c548b5` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 71: Optimize resume score rendering

**Date**: 2026-06-03
**Task**: Optimize resume score rendering
**Branch**: `codex/optimize-resume-score-rendering`

### Summary

Refactored resume score rendering to reduce layout pressure, restore reliable modal/drawer internal scrolling, replace heavy scoring visuals with lightweight markup, and document trace-backed findings.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `8aae96b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 72: Frontend responsive layout fixes

**Date**: 2026-06-03
**Task**: Frontend responsive layout fixes
**Branch**: `codex/frontend-responsive-layout`

### Summary

Fixed mobile AI chat toolbar/context layout, restored scroll behavior for chat history, constrained share details content scrolling, and moved mobile retention help tooltip out of the drawer layout flow.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ce56489` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 73: Refresh bilingual README screenshots

**Date**: 2026-06-03
**Task**: Refresh bilingual README screenshots
**Branch**: `codex/rewrite-readme-screenshots`

### Summary

Rewrote English and Chinese README files to use the new web and mobile screenshot directories, included all 44 screenshots, and removed obsolete root docs screenshots.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `060bee2` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 74: Release v1.2.0

**Date**: 2026-06-03
**Task**: Release v1.2.0
**Branch**: `codex/finish-release-1.2.0`

### Summary

Published Smart Resume v1.2.0: bumped backend/frontend versions, verified frontend/backend builds and tests, merged release PRs, tagged v1.2.0, and created the GitHub Release.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d576276` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 75: Add cover letter generation

**Date**: 2026-06-03
**Task**: Add cover letter generation
**Branch**: `codex/cover-letter-generation`

### Summary

Implemented persisted AI cover letter generation from the resume editor with optional application linkage, editable history, backend API/storage/tests, frontend modal/i18n, and code-spec documentation.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `33fe5f8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 76: Interview question bank

**Date**: 2026-06-04
**Task**: Interview question bank
**Branch**: `codex/interview-question-bank`

### Summary

Added user-managed interview question banks with backend CRUD/sampling integration and responsive frontend management flows.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f8d178a` | (see git log) |
| `2beb8d8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 77: Validate job application resume ownership

**Date**: 2026-06-05
**Task**: Validate job application resume ownership
**Branch**: `codex/boss-browser-extension`

### Summary

Enforced per-user resume ownership when creating or updating job applications, hid cross-user resume titles in responses, and added service regression tests for cross-user resume rejection.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4cf75d3` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
