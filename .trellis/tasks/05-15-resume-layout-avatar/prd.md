# brainstorm: optimize resume layout and avatar support

## Goal

Improve the resume editing and preview experience so the content hierarchy feels closer to modern resume products, while also allowing users to add an optional avatar that appears naturally in supported resume layouts.

## What I already know

- The editing workspace lives in `frontend/src/pages/WorkspacePage.tsx`.
- The preview renderer lives in `frontend/src/features/resume/components/ResumePreview.tsx`.
- Resume content typing lives in `frontend/src/features/resume/types.ts`.
- The current editor uses a three-column workspace: structure rail, form stack, and sticky preview.
- The current preview renderer supports four built-in layouts: `classic`, `two-column`, `minimal`, and `editorial`.
- `personalInfo` currently contains `fullName`, `headline`, `phone`, `email`, `city`, and `website`, but no avatar field.
- The backend `ResumeDtos.PersonalInfo` record also has no avatar field, so avatar support requires frontend and backend changes.
- The backend stores resume section content as JSON, which means adding one more personal-info field is structurally compatible with the current persistence model.
- The chosen MVP persistence approach is to convert uploaded avatar images to base64/data URLs and store them in resume content, avoiding local file storage and a dedicated upload service.
- External resume references consistently use a strong top header, optional compact photo placement, and a narrative-first content order where summary/work/projects lead and supporting sections sit in a side area.

## Assumptions (temporary)

- Avatar support should be optional rather than mandatory.
- We should keep the existing four template layouts and improve their information hierarchy instead of replacing the whole template system.
- The editor shell can stay as a three-column workspace, but the personal info module and preview layout should become more logically grouped.
- MVP avatar input uses local upload rather than URL entry.
- MVP avatar persistence uses base64/data URL rather than backend file storage.

## Requirements (evolving)

- Add avatar support to resume personal info data on both frontend and backend.
- Expose local avatar upload controls inside the personal info module.
- Convert uploaded avatar files to base64/data URLs before saving.
- Prioritize a mainstream professional layout refresh rather than a more experimental editorial redesign.
- Improve the preview header hierarchy so identity, contact details, and avatar read as one coherent block.
- Rebalance template section placement so main career narrative remains in the primary reading path and supporting content stays secondary.
- Keep avatar rendering optional and avoid broken layout when no avatar is set.
- Preserve existing template switching, section ordering, and section hide/show behavior.

## Acceptance Criteria (evolving)

- [ ] A resume can persist an optional base64 avatar value together with other personal info fields.
- [ ] The editor provides a clear way to set, replace, and remove the avatar.
- [ ] Each built-in preview layout renders correctly with and without an avatar.
- [ ] The revised preview feels more logically ordered: identity first, contact block next to it, narrative sections in the main flow, supporting sections in a secondary flow.
- [ ] Existing resume editing features still work after the change, including autosave, template selection, and preview refresh.

## Definition of Done (team quality bar)

- Tests added or updated where the repo already has coverage for the touched area.
- Lint and type-check pass.
- Behavior is verified in the editor for both avatar-present and avatar-absent cases.
- Any new implementation constraint worth preserving is considered for spec update.

## Technical Approach

- Extend the shared resume contract by adding an optional avatar field under `personalInfo` in both frontend and backend.
- Handle avatar input in the editor through local file selection and browser-side conversion to base64/data URL before autosave.
- Keep persistence inside the existing resume JSON section flow so no new storage subsystem or API surface is needed.
- Refresh built-in preview templates toward mainstream professional hierarchy: stronger header block, compact avatar placement, clearer split between primary narrative sections and secondary supporting sections.
- Ensure every template still renders cleanly when the avatar is missing.

## Decision (ADR-lite)

**Context**: The user wants modernized resume layout plus avatar support, but the repo has no upload service or static file pipeline for media.

**Decision**: Use local upload with browser-side base64 conversion, store avatar data in existing resume content JSON, and optimize current templates toward mainstream professional clarity rather than introducing a new media subsystem or highly stylized layouts.

**Consequences**: Implementation stays focused and low-risk for MVP, but avatar payload size becomes part of resume content and should remain limited to modest image sizes.

## Out of Scope (explicit)

- Building a dedicated media storage service.
- Adding brand-new template families beyond the current built-in layouts.
- Redesigning the resume list page unless required by the avatar feature.

## Technical Notes

- Frontend types to update: `frontend/src/features/resume/types.ts`
- Preview renderer to update: `frontend/src/features/resume/components/ResumePreview.tsx`
- Editor form to update: `frontend/src/pages/WorkspacePage.tsx`
- Backend DTO/service to update:
  - `backend/src/main/java/com/smartresume/resume/dto/ResumeDtos.java`
  - `backend/src/main/java/com/smartresume/resume/service/ResumeService.java`
- Research reference:
  - `research/layout-benchmarks.md`
