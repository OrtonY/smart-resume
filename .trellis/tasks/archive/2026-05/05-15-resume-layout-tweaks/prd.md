# brainstorm: 优化默认简历模块顺序与分隔线

## Goal

Adjust the default resume layout so education appears immediately after personal information, simplify visual section separation by removing the extra divider line between sections while keeping the section-title treatment, improve the resume editor's long-text inputs so they do not soft-wrap unless the user inserts line breaks manually, and allow editor/template previews to show multiple A4 pages when content exceeds one page.

## What I Already Know

* The default persisted section order is defined in `frontend/src/features/resume/types.ts`.
* The workspace structure rail and editor collapse order both derive from `createDefaultResumeLayout()`, so changing the shared default order updates the initial editor experience as well as preview ordering for default layouts.
* The resume preview section container adds a `border-bottom` in `frontend/src/index.css`, while each section title already renders its own trailing line via `.resume-template__section-title::after`.
* The user also wants editor long-text fields such as personal summary and work content to avoid automatic soft wrapping during input.
* The repeatable section cards in `frontend/src/pages/WorkspacePage.tsx` currently render short inputs and long textareas in the same auto-fit grid, which can place long text fields beside short fields instead of below them.
* The editor preview and template-change preview currently rely on single-page A4 rendering, so overflowing content does not appear as page 2+ in those views.
* The backend still uses the legacy layout default order for new resumes in `ResumeService`, and the database column default in `layout_json` also still points to the legacy order.

## Assumptions (Temporary)

* "Personal information" refers to the fixed `personal-info` editor module / resume header area that is always shown before reorderable sections.
* The requested change applies to the default order for newly created or legacy-normalized layouts, not to already customized user layouts stored in persistence.

## Open Questions

* None currently. The requested scope is specific enough to implement directly.

## Requirements (Evolving)

* Move `education` to the first position in the default reorderable resume section list.
* Keep all existing section keys and layout normalization behavior intact.
* Remove the extra divider between rendered section containers in the resume preview.
* Keep the section title visual line so section headers remain distinct.
* Long-text editor fields should preserve only user-entered line breaks and should not soft-wrap automatically while typing.
* In repeatable editor cards, long-text inputs should sit below the short metadata inputs and span the full row.
* Date fields should remain ordinary text inputs without behavior changes.
* The template-change page header should no longer show a "return to current resume" action because the preview area already provides that navigation.
* The editor preview and template-change preview should display additional A4 pages when rendered content exceeds one page.
* Small list-card previews do not need to switch to multipage rendering.
* Backend defaults for newly created resumes should also use the education-first layout order.
* Existing stored resumes should not be migrated or rewritten.
* Multipage previews should use square page corners so on-screen pagination matches print composition more closely.
* From page 2 onward, preview pages should leave a small top margin for better visual rhythm.

## Acceptance Criteria (Evolving)

* [ ] A default resume layout places education before summary, work experience, project experience, and other reorderable sections.
* [ ] The workspace/editor default module order reflects the new education-first order under personal information.
* [ ] Resume preview sections no longer show an additional horizontal divider between modules.
* [ ] Section headers still display their built-in title line styling.
* [ ] Personal summary and repeatable description textareas no longer soft-wrap text unless the user manually inserts a newline.
* [ ] Education, work, project, and honor cards render long-text fields beneath the short fields.
* [ ] Date inputs remain standard single-line text inputs.
* [ ] The top action row on the template-change page no longer shows "返回当前简历".
* [ ] The editor-side preview shows page 2+ when resume content exceeds one A4 page.
* [ ] The template-change page preview shows page 2+ when resume content exceeds one A4 page.
* [ ] New resumes created through the backend default to education-first section order.
* [ ] Existing persisted resumes keep their current stored section order.
* [ ] Multipage preview pages render without rounded corners.
* [ ] Preview page 2+ shows a small top gap before content continues.

## Definition of Done (Team Quality Bar)

* Tests added/updated when practical for this scope
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (Explicit)

* Changing stored custom section orders for existing resumes
* Redesigning template-specific markup or typography
* Adding new resume sections or changing hide/show behavior

## Technical Notes

* Relevant files inspected:
  * `frontend/src/features/resume/types.ts`
  * `frontend/src/features/resume/components/ResumePreview.tsx`
  * `frontend/src/pages/WorkspacePage.tsx`
  * `frontend/src/index.css`
* Trellis frontend guidance read:
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/frontend/type-safety.md`
  * `.trellis/spec/frontend/component-guidelines.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
  * `.trellis/spec/guides/index.md`
