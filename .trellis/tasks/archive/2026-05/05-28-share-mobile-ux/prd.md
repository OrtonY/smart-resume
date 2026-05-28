# brainstorm: optimize share password and mobile version UX

## Goal

Improve two user-facing flows in the resume product: password-protected public share access and the mobile resume version history experience. The password-protected share page should guide visitors straight into a clear password entry experience, and the mobile version history should separate selection from inspection so version choice, diff viewing, and restore actions feel easier to use on small screens.

## What I already know

* `frontend/src/pages/PublicSharePage.tsx` currently calls `GET /api/public/shares/{shareCode}` immediately on page open, then switches to the password form only after the request fails with a password-related error.
* `frontend/src/pages/PublicSharePage.tsx` already contains a password form (`Input.Password` + verify button), so the current issue is the entry flow, not the absence of a form implementation.
* `backend/src/main/java/com/smartresume/share/service/ShareService.java` enforces password protection inside `getPublicShare(...)` by verifying the share token before returning resume content.
* There is currently no lightweight public endpoint that exposes share metadata such as `hasPassword` before attempting to load the protected content.
* `frontend/src/features/resume/components/editor/ResumeVersionTimelineModal.tsx` renders version selection and version detail/diff inside one modal layout.
* On mobile, the same version timeline modal is shown through `ResponsiveModal`, but the information architecture is still list + detail in a single continuous view.
* Frontend guidelines require mobile adaptation for user-facing features and all new text to be internationalized.

## Assumptions (temporary)

* The requested mobile optimization targets the resume version history modal, not the share creation modal.
* Desktop behavior should remain mostly unchanged unless a small consistency tweak is needed.
* We should keep code changes focused on the affected UX flows and avoid unrelated refactors.

## Open Questions

* None.

## Requirements (evolving)

* Password-protected public share links should use a lightweight preflight check to determine whether a password is required before attempting to load protected resume content.
* When a public share requires a password, the page should lead directly to a clear password entry experience with a visible input field and no confusing intermediate state.
* Mobile version history should separate version selection from version detail/diff viewing into a two-level flow.
* After choosing a version on mobile, the second-level page should directly show version summary, diff, and restore action on the same screen.
* Users should still be able to inspect differences and restore a selected version on mobile.
* Existing desktop version history behavior should remain available.

## Acceptance Criteria (evolving)

* [ ] Opening a public share first performs a lightweight preflight check to determine whether password protection is enabled.
* [ ] Opening a password-protected public share shows a clear password access experience before the user can view the resume.
* [ ] Visitors can enter a password and continue into the shared resume without a broken or misleading transition.
* [ ] On mobile, version history first shows a version selection screen and then a second-level detail screen after a version is chosen.
* [ ] On mobile, users can navigate back from the version detail screen to the version list.
* [ ] On mobile, the selected version's diff information remains accessible.
* [ ] Desktop version history remains usable after the change.

## Definition of Done (team quality bar)

* Tests added/updated when behavior changes in a test-covered area
* Lint / typecheck / relevant verification green
* i18n updated for any new user-facing text
* Mobile behavior checked for <= 480px

## Out of Scope (explicit)

* Redesigning the full desktop share page visual language
* Changing share permission rules beyond the UX needed for password access
* Reworking unrelated editor or preview flows

## Technical Notes

* Relevant frontend files:
  * `frontend/src/pages/PublicSharePage.tsx`
  * `frontend/src/features/resume/components/editor/ResumeVersionTimelineModal.tsx`
  * `frontend/src/index.css`
  * `frontend/src/i18n/locales/zh-CN/share.json`
  * `frontend/src/i18n/locales/en-US/share.json`
  * `frontend/src/i18n/locales/zh-CN/workspace.json`
  * `frontend/src/i18n/locales/en-US/workspace.json`
* Relevant backend files if we choose a preflight metadata approach:
  * `backend/src/main/java/com/smartresume/share/controller/ShareController.java`
  * `backend/src/main/java/com/smartresume/share/service/ShareService.java`
  * `backend/src/main/java/com/smartresume/share/dto/ShareDtos.java`
* Constraint: if we introduce reusable mobile flow states or repeated UI thresholds, keep them centralized instead of copying literals.

## Decision (ADR-lite)

**Context**: Mobile version history currently mixes selection and inspection in one modal layout, which is crowded on small screens.

**Decision**: Use a two-level mobile flow: first screen for version selection, second screen for selected version detail. The second-level screen shows version summary, diff, and restore action together.

**Consequences**: Mobile navigation becomes clearer and requires less scrolling context-switching, while avoiding a third navigation level for diff viewing.

### Password-Protected Public Share Entry

**Context**: The current public share page attempts to load protected resume content immediately, then falls back into password mode only after the API rejects the request.

**Decision**: Add a lightweight public preflight capability that tells the frontend whether the share requires a password before protected content is requested.

**Consequences**: The share page can enter the correct UX state immediately, but backend and frontend contracts both need a small extension.
