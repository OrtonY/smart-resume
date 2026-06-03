# brainstorm: optimize frontend responsive layout

## Goal

Improve two frontend responsive layout issues: keep the mobile AI chat toolbar controls on one row, and prevent the resume-home share details modal from expanding the page when many share links or access details are shown.

## What I already know

* The user reported mobile AI chat controls for language style and new chat wrap, and wants them to stay aligned with current/history conversation controls.
* The user reported resume-home share details should scroll internally when content is long instead of enlarging the page.
* The frontend is React + TypeScript + Ant Design.
* Relevant files are `frontend/src/features/ai/components/AiResumeAssistant.tsx`, `frontend/src/pages/WorkspacePage.tsx`, and `frontend/src/index.css`.
* The code already uses `ResponsiveModal`, so mobile modal/drawer behavior should be preserved.

## Assumptions (temporary)

* No new labels or product copy are required.
* A local CSS/layout-only fix is preferred over new dependencies or larger component refactors.

## Open Questions

* None blocking; implementation can derive the layout targets from existing code and CSS.

## Requirements (evolving)

* On narrow mobile widths, the AI chat segmented control, style selector, and new-chat button should remain in one toolbar row.
* The style selector and new-chat button may be visually smaller on mobile, but remain tappable and readable.
* Share details content should use an internal scroll region when it exceeds available viewport height.
* AI chat history should scroll on both desktop modal and mobile drawer.
* The retention hint should make clear that only the history list is capped, not the current chat.
* Mobile AI chat context should fit in one row without changing desktop context layout.
* Mobile retention hint popover should not reflow the AI chat context row when opened.
* Existing desktop behavior should remain materially unchanged.

## Acceptance Criteria (evolving)

* [ ] AI chat toolbar does not wrap the style selector and new-chat button below the current/history segmented control at mobile width.
* [ ] Share links modal caps its content height and scrolls internally with many rows or expanded details.
* [ ] AI chat history list scrolls on desktop and mobile.
* [ ] Retention copy no longer implies that the current chat is limited to 10 messages.
* [ ] Mobile AI chat context hides the bound-resume tag, shortens the style tag, and exposes the retention hint through a question icon.
* [ ] Opening the mobile retention hint does not change the context row layout.
* [ ] Frontend build or the smallest available frontend verification passes, or any unrelated blocker is reported.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate for the risk level.
* Lint / typecheck / build checked as practical.
* Docs/notes updated only if behavior or conventions change.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* Changing share data contracts or access-log APIs.
* Redesigning the AI chat modal.
* Adding new user-facing text.

## Technical Notes

* `rg.exe` is currently blocked by the local environment, so local search used Git-tracked files and PowerShell `Select-String`.
* Code index retry returned HTTP 500 twice, so local file inspection was used.
* Trellis inline mode skips JSONL curation; frontend specs were read directly before code changes.
