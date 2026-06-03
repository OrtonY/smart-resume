# brainstorm: optimize resume score rendering

## Goal

Improve the rendering performance of `ResumeScoreButton.tsx` and its related styles so the resume score UI reaches second-level visible/display performance on web and mobile, using source-level analysis plus the provided Chrome trace files as evidence.

## What I already know

* The user reports severe rendering problems in the current content display.
* Web rendering is slow and mobile rendering is worse.
* The user explicitly asks to ignore data volume as the primary explanation and analyze code-level rendering causes.
* Trace files are available at `C:\Users\sunwenzhuang\Downloads\Trace-web.json.gz` and `C:\Users\sunwenzhuang\Downloads\Trace-mobile.json.gz`.
* Current branch is `codex/optimize-resume-score-rendering`; git working directory was clean before task creation.

## Assumptions (temporary)

* The performance issue is likely caused by render loops, expensive synchronous work, unnecessary reconciliation, layout/style thrashing, animation/paint costs, or repeated heavy DOM generation rather than simply large input data.
* The target is practical UX improvement to second-level display time, not a speculative full rewrite.

## Open Questions

* None yet; source and trace inspection should answer the initial technical questions.

## Requirements (evolving)

* Analyze `ResumeScoreButton.tsx` and related CSS/style files at source level.
* Analyze both web and mobile trace files for main-thread, scripting, layout, paint, and long-task evidence.
* Identify code-level bottlenecks and implement minimal, targeted fixes.
* Keep changes scoped to the score rendering path and existing project conventions.
* Requirement matches must remain fully browseable without batch "load more" interaction or scroll-triggered remount/reflow behavior.
* The score modal/drawer must expose a reliable internal scrollbar so all data remains reachable while page-level layout stays stable.

## Acceptance Criteria (evolving)

* [ ] Web score UI reaches second-level visible/display performance in local verification or trace-informed measurement.
* [ ] Mobile score UI avoids the current severe slow rendering pattern, especially long main-thread blocking work.
* [ ] Source changes are backed by trace/code evidence.
* [ ] Relevant lint/type/test or build checks are run, or any inability to run them is explicitly documented.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / build checks pass where available.
* Rollout/rollback risk considered if changes touch user-visible scoring behavior.

## Out of Scope (explicit)

* Backend scoring algorithm changes unless source inspection proves they are directly responsible for frontend rendering stalls.
* Treating the issue as only a data-volume problem without code-level analysis.
* Broad UI redesign unrelated to performance.

## Technical Notes

* Initial task directory: `.trellis/tasks/06-02-optimize-resume-score-rendering`.
* Trace files verified to exist.
* `rg` was unavailable due to an environment access-denied error; local PowerShell enumeration will be used as fallback.
* Trace evidence: web trace includes `Layout` events around 8.0s and 5.4s; mobile trace includes `Layout` around 45.1s, 19.0s, and 10.5s. The dominant cost is browser layout, not network/API compute.
* Implemented direction: removed the score path's heavy AntD progress/tag wrappers where they amplified layout work, replaced them with lightweight static HTML/CSS, and made the modal/drawer use a fixed-height body with an explicit `.resume-score-scroll-region` internal scroller. Removed virtual-list/content-visibility direction because it caused scroll-back reactivation and poor mobile UX.
