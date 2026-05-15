# Current Editor Audit

## Scope

Audit of the current resume workspace implementation before proposing a new editing model.

## Findings

1. The left sidebar currently mixes document management and workspace navigation.
   It shows resume list, create/delete/restore controls, and logout, but it does not represent the structure of the active resume.

2. The main editor is form-first rather than structure-first.
   In [frontend/src/pages/WorkspacePage.tsx](D:/Project/IDEA/study/smart-resume/frontend/src/pages/WorkspacePage.tsx), the core editing surface is a single `Collapse` containing personal info, summary, education, work, project, skills, honors, and certificates.

3. Section actions exist mostly at the item level, not at the section level.
   Repeated sections can add/remove items, but there is no section reorder, hide/show, rename, or quick jump model.

4. The preview is visible, but it is not treated as a primary docked editing companion.
   The two-column layout in [frontend/src/index.css](D:/Project/IDEA/study/smart-resume/frontend/src/index.css) gives one column to forms and one to preview/share content, but the preview panel is not clearly sticky, pageable, or overflow-aware for the workspace.

5. Secondary actions dilute the editing focus.
   Template summary, share actions, export actions, and share-link history occupy the same workspace context as content editing.

## Product Implications

* The page behaves like a "resume management dashboard with inline editing", not a "dedicated resume builder".
* Users must understand multiple mental models at once:
  which resume am I editing, which section am I in, what does the output look like, and where do I manage export/share/template.
* The reference image instead prioritizes one mental model:
  "I am editing the structure and content of this one resume right now."

## Recommended Direction

Move from dashboard-style editing to editor-style editing:

* Separate "resume list" from "active resume structure"
* Promote section navigation and section operations into first-class UI
* Keep preview always legible and spatially stable
* Push template/share/export/history into drawers, panels, or dedicated secondary entry points
