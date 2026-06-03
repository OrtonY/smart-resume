# Research: source-css-audit

- Query: ResumeScoreButton modal/drawer result rendering source and CSS performance audit
- Scope: mixed
- Date: 2026-06-02

## Findings

### Files found

- `frontend/src/features/ai/components/ResumeScoreButton.tsx` - AI resume scoring button, persisted score restore, scoring request, and full result rendering tree.
- `frontend/src/index.css` - global score-panel styling, responsive drawer styling, and mobile containment rules for `.resume-score-*`.
- `frontend/src/components/shared/ResponsiveModal.tsx` - modal-to-drawer adapter used by scoring UI on mobile.
- `frontend/src/features/resume/components/editor/ResumeEditorView.tsx` - editor toolbar integration points for `ResumeScoreButton`.
- `.trellis/spec/frontend/index.md` - confirms stack: TypeScript + Ant Design.
- `.trellis/spec/frontend/quality-guidelines.md` - relevant conventions: mobile features must use `ResponsiveModal`, avoid duplicated stable thresholds.
- `.trellis/spec/frontend/state-management.md` - relevant convention: keep transient UI state local and explicit.
- `.trellis/spec/frontend/type-safety.md` - relevant convention: typed feature-local API/view models.

### Current render path and why long Layout is source-driven

1. Opening the score UI immediately mounts `ResponsiveModal` with `destroyOnHidden={false}` and the entire panel body in the React tree (`ResumeScoreButton.tsx:195-210`, `ResumeScoreButton.tsx:211-466`). On mobile, `ResponsiveModal` switches to AntD `Drawer` (`ResponsiveModal.tsx:30-85`), so the same child tree is laid out inside a bottom drawer.

2. First open triggers persisted score restore in `useEffect`. When the API returns, one async branch sets multiple states and finally `setResult(persisted.result)` plus `setShowJobDescriptionInput(false)` (`ResumeScoreButton.tsx:111-149`, especially `124-130`). This turns the drawer/modal from input/empty state into a large result tree in a single React commit.

3. The result tree is broad and nested: dashboard `Progress` (`ResumeScoreButton.tsx:268-276`), summary/tags (`277-284`), strengths map (`287-295`), section heatmap map (`312-340`), requirement match cards (`344-423`), and suggestion groups (`443-453`). The important point is not "data is large" by itself; source code synchronously materializes every eligible subtree in one open/restore frame.

4. Mobile pagination currently only limits `requirementMatches`: `visibleRequirementMatches` slices requirements only when `isMobile` (`ResumeScoreButton.tsx:106-109`), and `getInitialVisibleRequirementCount` only reads `result.requirementMatches` (`ResumeScoreButton.tsx:84-87`). `sectionHeatmap`, `strengths`, and `suggestionGroups` still render fully on restore/score (`ResumeScoreButton.tsx:287-340`, `443-453`). Within each visible requirement, mobile initially hides detail blocks unless expanded (`ResumeScoreButton.tsx:350-351`, `377-419`), but the outer card, tags, score bar, and heading still mount.

5. `ResponsiveModal` mobile drawer body receives flex column, `overflow: auto`, and `flex: 1` (`ResponsiveModal.tsx:59-67`). The score caller also passes body `maxHeight: 70vh` and overflow styles (`ResumeScoreButton.tsx:203-209`), but the mobile adapter strips `height`, `maxHeight`, and `overflow` before applying body styles (`ResponsiveModal.tsx:55-67`). Therefore mobile relies on drawer body defaults plus CSS, not the caller's `70vh` cap.

6. `destroyOnHidden={false}` preserves the hidden tree after close (`ResumeScoreButton.tsx:200`, `ResponsiveModal.tsx:76`, `ResponsiveModal.tsx:101`). This helps reopen state but also means a restored result can remain mounted across close/open. It does not explain first restore cost, but it can keep a heavy hidden subtree alive and make subsequent editor renders include the score component's stateful children until the parent unmounts.

7. `ResumeScoreButton` is rendered in both desktop and mobile action containers in the editor (`ResumeEditorView.tsx:367-375`, `391-393`). CSS likely hides one variant, but React still instantiates two independent scoring components with their own local state. On mobile this is especially relevant because the hidden desktop instance still exists in React. Minimum-impact option: keep the UI placement but conditionally render only one instance based on `useIsMobile` at the editor level, or move score action into a shared action model rendered once.

### CSS patterns that amplify layout/paint

1. Score cards use layered backgrounds on several high-level containers: `.resume-score-result__hero`, `.resume-score-result__strengths`, `.resume-score-group`, `.resume-score-heatmap` share a linear gradient plus radial gradient (`index.css:2278-2288`). These are visually expensive during first paint and repeated invalidation, especially inside a scrolling drawer.

2. Many nested AntD descendants are targeted to force wrapping and width containment (`index.css:2302-2313`) plus a large `min-width/max-width` selector group (`index.css:2214-2239`). This prevents overflow, but it makes style matching and layout dependency broad. Mobile adds another deep universal descendant rule for score cards (`index.css:4417-4420`), which applies to every descendant under each section card and requirement card.

3. Layout uses multiple flex-wrap and grid containers: intro and actions wrap (`index.css:2204-2212`, `2264-2270`), hero is a two-column grid (`2290-2295`), section heatmap is a two-column grid (`2369-2373`), requirement headings flex-wrap (`2385-2392`). These are valid layouts, but mounting many nested cards with tags and wrapping text forces line-breaking and size negotiation across the whole subtree.

4. Mobile contains only part of the subtree: `.resume-score-heatmap`, `.resume-score-section-heatmap`, `.resume-score-requirements`, and `.resume-score-requirements__list` get `contain: layout paint` inside score drawers (`index.css:4410-4415`). The hero, strengths, suggestion groups, individual cards, and drawer body are not isolated. There is no `content-visibility: auto` or `contain-intrinsic-size`, so offscreen sections still participate in initial layout.

5. The score modal CSS sets `.resume-score-modal .ant-modal-content { overflow: hidden; }` and `.resume-score-modal .ant-modal-body { overflow-x: hidden; }` (`index.css:2189-2195`), while runtime styles put vertical scrolling on modal body (`ResumeScoreButton.tsx:203-209`). Mobile drawer CSS only adds `overscroll-behavior: contain` for score drawer body (`index.css:4337-4339`) and inherits generic drawer body overflow from the mobile block (`index.css:4287-4291`). This works for reachability but does not create a dedicated inner scroll viewport for score results that can be isolated with containment.

6. Dashboard `Progress` is the only AntD dashboard usage in this component (`ResumeScoreButton.tsx:270-275`; search found other Progress usages only in interview report). AntD dashboard progress renders an SVG arc plus text and may be heavier than a simple static score display. It is not the only cause, but it is a low-value heavy component in the first visible viewport.

### Prioritized root causes

1. Highest: synchronous full result mount on restore/score. `setResult` swaps in all result sections in one commit (`ResumeScoreButton.tsx:124-130`, `176-181`, `256-455`). This explains long Layout without blaming the backend payload size: the component chooses to synchronously create a deep, wrapping, styled DOM tree at modal/drawer open time.

2. High: mobile optimization is partial. Only `requirementMatches` are paginated (`ResumeScoreButton.tsx:106-109`), while section heatmap and suggestion groups remain full synchronous maps. Mobile also keeps AntD tags/buttons/typography for every visible card.

3. High: drawer/modal scroll and containment are not aggressive enough. Current CSS contains some heatmap/list wrappers (`index.css:4410-4415`) but does not defer offscreen rendering, does not isolate the entire score result, and does not establish a score-specific body/result scroll container with intrinsic-size hints.

4. Medium: duplicated `ResumeScoreButton` instances in desktop and mobile action areas (`ResumeEditorView.tsx:367-375`, `391-393`). This doubles component instances and local state paths; only one is user-visible at a time.

5. Medium: AntD-heavy first viewport. `Progress type="dashboard"`, many `Tag`, `Typography`, `Space`, `Button`, `Alert`, `Spin`, and `Empty` instances are mounted together. The dashboard progress is especially easy to replace or defer.

6. Medium: CSS paint complexity. Layered gradients and deep descendant selectors increase first paint/style recalculation cost across many cards (`index.css:2278-2288`, `2302-2313`, `4417-4420`).

### Recommended minimal fixes

1. Stage result rendering in React. After restore/score, first show shell + hero/summary, then reveal heatmap, requirements, and suggestions in later frames. Practical options: `requestAnimationFrame`/`setTimeout(0)` stage state, `startTransition`, or an `activeResultSections` state. Keep persisted data in memory but do not mount every section in the same commit.

2. Add pagination/windowing beyond requirements. Keep mobile initial requirement count, but also limit suggestion groups and optionally section cards at first paint. For desktop, consider collapsed groups or "render details after shell" rather than full list virtualization if data sizes are bounded.

3. Memoize derived slices and section components. Use `useMemo` for `requirementMatches`, `sectionHeatmap`, `visibleRequirementMatches`, and `hasHeatmap`; split `ScoreHero`, `SectionHeatmap`, `RequirementList`, `SuggestionGroups` into `React.memo` components. This will not fix first mount alone, but it reduces re-render cost when toggling input, expanding a requirement, typing JD, or reopening.

4. Avoid duplicate editor instances. In `ResumeEditorView.tsx`, render `ResumeScoreButton` once per viewport branch using `useIsMobile`, or move the action into `MoreActionsMenu`/desktop toolbar through a single shared component instance. This is a smaller fix than changing API shape and reduces hidden React work.

5. Replace or defer dashboard `Progress`. Use a CSS/static score meter for the hero or render AntD dashboard only after the shell is visible. The existing custom `HeatmapScoreBar` (`ResumeScoreButton.tsx:60-82`) shows the local code already has a lightweight progress pattern.

6. Add score-specific CSS containment and offscreen deferral. Candidates:
   - `.resume-score-result`, `.resume-score-result__groups`, `.resume-score-group`, `.resume-score-section-card`, `.resume-score-requirement`: `content-visibility: auto` plus `contain-intrinsic-size`.
   - Keep `contain: layout paint` on larger sections, but extend to suggestion groups and individual cards where it does not break sticky/positioning.
   - Prefer a `.resume-score-result-scroll` inner container for drawer/modal body so containment applies inside one predictable scrollport.

7. Simplify paint-heavy card backgrounds. Replace repeated layered `linear-gradient + radial-gradient` on every major card with a flat translucent background or apply the decorative background only to the hero. This is low risk and directly reduces paint work.

8. Remove or narrow universal/deep CSS selectors. Replace `.resume-score-section-card *` / `.resume-score-requirement *` (`index.css:4417-4420`) with targeted text/tag/list selectors, and avoid broad AntD descendant chains unless a specific overflow bug requires them.

### External references

- MDN CSS `content-visibility`: documents skipping rendering work for offscreen content and pairing with intrinsic size hints.
- MDN CSS containment: `contain: layout paint` limits layout/paint effects to an element subtree.
- React docs: `memo` and `useMemo` are appropriate for reducing re-render work after props/derived data are stable; they do not eliminate first mount cost.
- Ant Design 6.4.3 is the installed UI library (`frontend/package.json`). AntD `Modal`/`Drawer` support `destroyOnHidden`; current code deliberately keeps score content mounted when hidden.

### Verification approach

1. Chrome Performance profile for desktop and mobile before/after:
   - open score drawer/modal with persisted result;
   - measure first visible content, longest Layout task, Recalculate Style, Paint, and total blocking time;
   - verify the first open no longer mounts heatmap/requirements/suggestions in one frame.

2. React Profiler:
   - profile first open restore;
   - confirm staged components commit separately;
   - verify expanding one requirement does not re-render all section heatmap and suggestion groups.

3. DOM/count sanity:
   - count `.resume-score-requirement`, `.resume-score-section-card`, `.resume-score-group`, `.ant-tag`, `.ant-progress` nodes after initial mobile open;
   - ensure only intended initial sections are mounted before "show more" or deferred phase.

4. Mobile viewport QA at 375px:
   - drawer remains scrollable;
   - no horizontal overflow;
   - "show more" and requirement detail expansion remain reachable;
   - score result still fits inside `ResponsiveModal` drawer behavior required by frontend quality guidelines.

5. CSS validation:
   - test `content-visibility` fallback behavior in target browsers;
   - confirm `contain` does not break AntD drawer sizing, focus behavior, or scroll restoration;
   - compare paint cost after simplifying gradients.

## Caveats / Not Found

- This audit did not edit business code or CSS.
- `rg` was unavailable in this environment due to an access-denied error, so file discovery/search used PowerShell fallback.
- Trace files were not analyzed in this artifact; conclusions are source/CSS-level and should be correlated with the separate Chrome trace audit before implementation priority is finalized.
- AntD internals were not profiled directly here; dashboard `Progress` is identified as a likely heavy first-viewport component based on source usage and DOM/SVG expectations, not as a measured isolated culprit.
