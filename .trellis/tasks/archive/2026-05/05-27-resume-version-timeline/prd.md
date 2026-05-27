# Resume Version Timeline, Diff, and Restore

## Goal

Expose resume version snapshots as a user-facing workflow so users can manually create snapshots, browse historical versions, compare a selected snapshot with the current draft, and restore a snapshot when needed. The version comparison UI must work on mobile, and the web modal must keep a fixed viewport-bounded height with timeline and diff data scrolling inside the panel.

## Background

- Backend snapshot persistence already exists through resume version storage.
- Before this task, users had no visible version timeline, snapshot creation action, diff review surface, or restore workflow in the resume editor.
- The implementation touches backend version APIs, frontend API types, the editor action surface, i18n strings, and responsive CSS.
- The latest layout requirement is explicit: the version snapshot diff comparison must adapt to mobile, while desktop/web should keep a fixed height and let data sections scroll within the page/modal.

## Scope

- Add backend endpoints and DTOs needed by the frontend to list versions, create a snapshot, fetch a version detail, and restore/rebuild resume state from a selected snapshot.
- Add typed frontend API methods for resume version operations.
- Add a resume editor action that opens the version timeline.
- Add a version timeline modal with:
  - snapshot list
  - manual snapshot creation
  - selected snapshot summary
  - section-level diff against the current draft
  - restore confirmation
- Keep all new user-facing text internationalized in `zh-CN` and `en-US`.
- Make the version timeline and diff UI mobile-usable.
- On desktop/web, keep the modal content height fixed within the viewport and make timeline/diff data scroll inside their own areas.

## Out of Scope

- Automatic snapshot policy tuning.
- Full field-by-field visual diff highlighting.
- Branching a snapshot into a separate resume copy.
- Reviewer comments or collaboration workflows.
- Share-link expiry, visit caps, or advanced share controls.

## Acceptance Criteria

- [ ] Users can open a version timeline from the resume editor.
- [ ] Users can manually create a version snapshot.
- [ ] Users can select a historical snapshot and see its metadata.
- [ ] Users can compare the selected snapshot with the current draft through a section-level diff summary.
- [ ] Users can restore a selected snapshot only after a confirmation step.
- [ ] The restored content updates the current editor draft without requiring a full page reload.
- [ ] Mobile view at 375px width has no horizontal overflow and all controls remain tappable.
- [ ] Desktop/web view keeps the version comparison modal height bounded to the viewport.
- [ ] Timeline and diff data scroll inside the modal instead of stretching the page.
- [ ] Frontend build passes after the implementation.

## Technical Notes

- Frontend editor entry: `frontend/src/features/resume/components/editor/ResumeEditorView.tsx`
- Version timeline UI: `frontend/src/features/resume/components/editor/ResumeVersionTimelineModal.tsx`
- Workspace draft coordination: `frontend/src/pages/WorkspacePage.tsx`
- Frontend API/types/constants: `frontend/src/features/resume/api/resumeApi.ts`, `frontend/src/features/resume/types.ts`, `frontend/src/features/resume/constants.ts`
- Main responsive styling: `frontend/src/index.css`
- Backend controller/DTO/service: `backend/src/main/java/com/smartresume/resume/controller/ResumeController.java`, `backend/src/main/java/com/smartresume/resume/dto/ResumeDtos.java`, `backend/src/main/java/com/smartresume/resume/service/ResumeVersionService.java`

## Verification

- Run the frontend build with `npm run build` from `frontend/`.
- Manually verify the version timeline modal on desktop and mobile widths.
- Confirm desktop modal content remains fixed-height and internal scroll areas are usable.
- Confirm mobile drawer layout remains single-column and no controls overflow horizontally.
