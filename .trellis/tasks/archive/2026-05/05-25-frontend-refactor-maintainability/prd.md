# PRD: Frontend Refactor for Maintainability

## Goal

Improve frontend extensibility, readability, and initial-load performance through a behavior-preserving structural refactor.

## Scope

### Page-level decomposition
- `WorkspacePage.tsx`: extract `ResumeEditorView`, `ResumeVisualCard`, `ResumeVisualGrid`, `moduleDefinitions`, `constants`, and `useResumePreviewDetails`.
- `TemplateGalleryPage.tsx`: extract `TemplateGalleryCatalogPanel`, `TemplateGalleryEditorPanel`, `TemplateGalleryPreviewPanel`, `TemplateGallerySummaryCard`, `useTemplateGalleryController`, and `templateGalleryUtils`.
- `InterviewPage.tsx`: extract `InterviewCenterView`, `InterviewCreateModal`, `InterviewDetailView`, and `interviewPageUtils`.
- `ResumePreview.tsx`: extract `previewTypes`, `previewUtils`, `previewPagination`, `PreviewPrimitives`, `InlineMarkdown`, `useResumePreviewMetrics`, and four template renderers under `preview/templates/`.

### Performance / code-splitting
- `AppRouter.tsx`: convert page imports to `React.lazy` + `Suspense` so each route ships its own chunk.
- `MarkdownMessage.tsx`: replace eager `react-syntax-highlighter` import with `LazyCodeBlock` (per-language dynamic import, registry-based).

### Dependency hygiene
- Bump antd 6.0→6.4, `@ant-design/icons`, `react-router-dom`, `react-i18next` 15→17, `i18next` 23→26, plus dev dep patch bumps.

### Constraints
- Behavior preserving: no route, API, translation, or visual changes.
- antd v6 CSS-in-JS is in effect (`ConfigProvider` only, no global stylesheet) — extracted components must keep using real antd components rather than hand-written `ant-*` class names, or styles will not be injected.

## Non-Goals

- No visual redesign.
- No backend contract changes.
- No new product features.
- No route changes.
- No i18n key changes.

## Success Criteria

- Each refactored page is substantially smaller and focused on orchestration; presentational and form logic lives in feature-local components.
- Repeated list / recycle-bin / preview-fetching logic is centralized behind shared hooks.
- Initial bundle is split: auth, workspace, template gallery, interview, public share, and syntax highlighter each load on demand.
- Syntax highlighter languages are loaded per-language; unsupported languages fall back to plain `<pre><code>`.
- Frontend `lint`, `tsc`, and `build` pass after the refactor.
- Manual smoke (see Validation) passes with no visible regressions.

## Risks

- **antd v6 CSS-in-JS regression**: hand-written `ant-result` / `ant-typography-secondary` etc. produce unstyled output because no antd component instance triggers style injection. Mitigation: always render real antd components (`Result`, `Typography.Text`).
- **i18next 23→26 + react-i18next 15→17 breaking changes**: namespace loading or `Trans` behavior may shift. Mitigation: smoke test zh-CN / en-US toggling on every refactored page.
- **Lazy language registry coverage**: languages absent from `LANGUAGE_LOADERS` lose syntax highlighting. Mitigation: keep registry list visible at the top of `LazyCodeBlock.tsx` with a maintenance note; expand as needed.
- **Suspense fallback flicker**: route chunk download adds a loading state where there was none. Mitigation: shared `RouteLoadingFallback` (full-page Spin) that matches existing loading UI.
- Regressions in autosave, preview pagination, mobile expand/collapse, share modal, or PDF export.
- Shared extraction accidentally changing mobile responsive behavior or i18n wiring.

## Validation

### Static
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### Manual smoke (zh-CN and en-US)
- Workspace: list, recycle bin, editor autosave, section drag/hide/show, share modal, PDF export (client + server), apply patch.
- Template gallery: catalog, create / edit / delete custom template, built-in read-only state, apply to resume, mobile edit/preview tabs.
- Interview: center list filters and pagination, create modal, detail chat (send / regenerate / stop streaming), AI answer & scoring, report panel.
- Resume preview: A4 paged + A4 fit modes, all four templates, hidden sections, language switch repagination.
- Markdown message: code blocks in supported languages render with highlight; unsupported language falls back cleanly.
- Routing: route chunks lazy-load without errors; Suspense fallback shows briefly on cold navigation.
