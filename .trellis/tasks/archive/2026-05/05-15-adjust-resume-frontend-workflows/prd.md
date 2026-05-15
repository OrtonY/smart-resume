# brainstorm: adjust resume frontend workflows

## Goal

Adjust the resume list, template browsing, sharing, deletion, and editor template-switching workflows so the product behaves more predictably: deleted resumes move into a dedicated recycle bin, active resumes are shown visually with thumbnails, templates can be browsed before creation, and the editor's template switch flow can return to the current resume.

## What I already know

* The homepage should not expose a "show deleted" toggle.
* Deleted resumes should be accessible through a recycle-bin concept and support restore from deleted state.
* The homepage should render resumes visually as thumbnails, with at most 6 resumes displayed at a time.
* Each resume thumbnail should include a bottom-right "view share" action that opens a dialog showing the current share link.
* The homepage should add a template directory entry near the top.
* Clicking a template from the template directory should create a resume directly from that template.
* Resume creation should no longer start with "create resume, then choose template" as the primary discovery path.
* In the resume editor, "模板中心" should be renamed to "修改模板".
* The editor's template-changing flow should keep the existing later logic but add a way to return to the current resume.
* Frontend routes already include `/app`, `/app/resumes/:resumeId`, and `/app/templates`.
* Backend already supports soft-delete and restore through `DELETE /api/resumes/{resumeId}` and `POST /api/resumes/{resumeId}/recover`.
* Backend/frontend already support listing and creating share links through `/api/resumes/{resumeId}/shares`.
* The existing template gallery can already be opened standalone or with `?resumeId=<id>` for applying a template to an existing resume.
* The current backend list API supports active-only and include-deleted-all modes, but not a deleted-only mode.
* The homepage should render exactly 6 resume slots per page in a horizontal row/grid, leaving empty slots when fewer than 6 exist.
* Opening the editor should happen by clicking the thumbnail itself; the explicit "open editor" button should be removed.

## Assumptions (temporary)

* Resume thumbnails should use the existing `ResumePreview` rendering component where enough resume detail is available.
* "At most 6 resumes" means pagination with 6 per page in a single horizontal row/grid, not permanently hiding additional resumes.
* "View share" should reuse existing share-link generation if available.

## Open Questions

* Confirm whether resume thumbnails should render actual resume content, even if that means loading detail data for the visible 6 cards.

## Requirements (evolving)

* Replace the homepage deleted-resume toggle with a dedicated recycle-bin entry/page.
* Allow deleted resumes to be restored from the recycle-bin view.
* Show active resumes on the homepage as visual thumbnail cards, capped at 6 per page/view.
* Add a share-link dialog launched from each resume thumbnail.
* Add a template directory entry at the top of the homepage.
* From the template directory, selecting a template creates a new resume based on that template.
* Keep editor-origin template changes on the existing `/app/templates?resumeId=<id>` flow, applying selected templates to the current resume.
* Rename the editor's "模板中心" label to "修改模板".
* Add a return-to-current-resume action to the editor template-changing flow.

## Acceptance Criteria (evolving)

* [ ] The homepage no longer contains a "显示已删除" control.
* [ ] A recycle-bin flow lists deleted resumes separately from active resumes.
* [ ] Deleted resumes can be restored and then appear again in the active resume list.
* [ ] The homepage renders resume cards with visual thumbnails and no more than 6 resumes per page/view.
* [ ] The homepage renders exactly 6 horizontal slots per page, leaving empty space when fewer than 6 resumes exist.
* [ ] Clicking the thumbnail itself opens the editor.
* [ ] Each resume thumbnail has a bottom-right share action that opens a dialog with the current share link.
* [ ] A top homepage template-directory entry allows users to browse templates before creating a resume.
* [ ] Clicking a template in the directory creates a resume from that template.
* [ ] The resume editor uses the label "修改模板" instead of "模板中心".
* [ ] The editor template-changing flow provides a clear action to return to the current resume.

## Definition of Done (team quality bar)

* Tests added/updated where project test structure supports the changed behavior.
* Lint / typecheck / build checks pass for touched frontend/backend surfaces.
* Backend changes are included only if existing APIs cannot support restore/share/template-create flows.
* Rollback considered for any API contract changes.

## Out of Scope (explicit)

* Redesigning resume templates themselves.
* Changing resume PDF/export rendering unless required for thumbnail reuse.
* Adding public sharing permissions beyond exposing the existing current share link.

## Technical Notes

* Task directory: `.trellis/tasks/05-15-adjust-resume-frontend-workflows`
* Key frontend file: `frontend/src/pages/WorkspacePage.tsx`.
* Template directory file: `frontend/src/pages/TemplateGalleryPage.tsx`.
* Routing file: `frontend/src/app/router/AppRouter.tsx`.
* Resume API file: `frontend/src/features/resume/api/resumeApi.ts`.
* Existing preview component: `frontend/src/features/resume/components/ResumePreview.tsx`.
* Resume summary currently contains `id`, `title`, `templateKey`, `deleted`, and `updatedAt`, but not resume content/layout.
* Real content thumbnails require fetching details for visible resume cards or extending the summary API. Since the requested display cap is 6, fetching visible details in the frontend is likely sufficient for this task.
* Recycle bin now requires backend support for deleted-only queries.

## Technical Approach

* Homepage list: call `listResumes(false)` for active resumes and remove the deleted toggle.
* Recycle bin: add a dedicated route or view backed by a deleted-only API mode instead of client-side filtering.
* Resume cards: paginate active resumes at 6 per page and render visual cards.
* Share dialog: load existing shares for the clicked resume, show full public URLs, and allow copying.
* Template directory creation: when `/app/templates` is opened from the homepage without `resumeId`, selecting a template should create a resume directly instead of acting as pure template administration.
* Editor template change: keep `/app/templates?resumeId=<id>` for editing the current resume's template, rename page copy/actions to "修改模板", and add a return button to `/app/resumes/<id>`.
* Route shape: keep `/app` for active resumes, add a separate recycle-bin route, and keep `/app/templates` as the template directory / editor entry.
* Thumbnail behavior: the preview card itself is the editor trigger; inline helper buttons should be removed from the main card face.

## Decision (ADR-lite)

**Context**: The homepage previously mixed active and deleted resumes behind a toggle, which made the primary workflow noisy.

**Decision**: Use a separate recycle-bin route instead of a homepage toggle.

**Consequences**: The homepage stays focused on active resumes; deleted items move to an explicit recovery area. This keeps the main list simpler and makes restore behavior easier to discover, at the cost of one extra route and nav entry.
