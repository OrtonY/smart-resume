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
