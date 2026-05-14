# resume-template-redesign

## Goal

Redesign the current resume template preview so it matches real-world resume layout patterns instead of only changing header colors. Keep the existing structured resume data and editor flow, but implement genuinely distinct template renderings with stronger visual hierarchy and more believable resume composition.

## What I already know

* The current frontend implementation is centered around `frontend/src/pages/WorkspacePage.tsx`.
* Template options are defined in `frontend/src/lib/constants/templates.ts`.
* Resume preview rendering is currently handled by a single component: `frontend/src/features/resume/components/ResumePreview.tsx`.
* The current "multi-template" behavior is mostly cosmetic: the same markup is reused for all templates and only hero-area styling changes in `frontend/src/index.css`.
* The frontend stack is TypeScript + Ant Design, and the project spec explicitly expects template-specific preview rendering.
* Existing resume content sections are already defined and should continue to work: personal info, summary, education, work experience, project experience, skills, honors, and certificates.
* The user wants multiple templates to choose from, while keeping the resume metadata/schema relatively fixed.
* The user provided a concrete reference image from JadeAI's template list, which emphasizes a gallery-style template picker and broad style coverage across multiple resume categories.
* The user now wants templates to support future dynamic loading so AI-parsed template files and manual template additions can be introduced later without hardcoding everything in the current page.
* The user also wants template selection moved to a dedicated page because the current workspace area is too cramped.

## Assumptions (temporary)

* This task should focus on frontend preview/template presentation, not backend schema changes.
* The editor form structure can stay mostly unchanged unless a small supporting UI tweak is needed for template clarity.
* We should keep the current template key mechanism and reuse the same content model across templates.
* PDF/share flows should continue using the same preview structure as much as possible, so the redesign should not introduce template logic that only works in one view.

## Open Questions

* Should dynamic template loading use a backend-managed template catalog API as the source of truth, or should the first pass load from frontend/local JSON with a later backend upgrade?

## Requirements (evolving)

* Replace the current near-identical preview templates with visibly different resume layouts.
* Keep one fixed structured resume schema and support multiple presentation templates on top of it.
* Keep all existing resume sections renderable from the same structured data model.
* Preserve template switching from the workspace.
* Move template selection toward a gallery/card-based experience rather than only a plain dropdown description.
* Move template selection out of the cramped workspace area into a dedicated page/route.
* Make the preview feel like a real resume sample rather than a generic card UI.
* Align each template with recognizable real-world resume patterns gathered from actual resume-builder examples.
* Keep the result responsive enough for the current workspace preview panel.
* Avoid decorative choices that break readability or make future PDF export harder.
* Prioritize template diversity in layout, hierarchy, and section treatment rather than adding more resume fields.
* This round should deliver a gallery-style picker plus 4 initial templates with clearly different styles.
* The 4 initial templates should cover: classic professional, modern two-column, minimal ATS-friendly, and editorial/creative.
* The architecture should allow future AI-generated or manually added template definitions to be loaded dynamically instead of requiring all templates to be baked into a static frontend array forever.

## Acceptance Criteria (evolving)

* [ ] Multiple templates are implemented with clearly differentiated layouts, not just palette changes.
* [ ] A visual template gallery/picker is available in the workspace instead of relying only on a plain select control.
* [ ] A dedicated template selection page/route exists and provides enough room to browse templates comfortably.
* [ ] The first release of the redesign includes 4 initial templates with distinct layout personalities.
* [ ] Template rendering logic is structured so additional real templates can be added without cloning one giant component.
* [ ] Template catalog data can be loaded through an abstraction layer instead of only importing a hardcoded array directly everywhere.
* [ ] The preview meaningfully uses resume data hierarchy: name/headline/contact, summary, chronology, supporting metadata, and skills.
* [ ] Existing sections still render correctly when present and disappear cleanly when empty.
* [ ] Workspace template switching still works.
* [ ] Frontend lint/build remain green after the redesign.

## Definition of Done (team quality bar)

* Implementation follows frontend spec conventions
* Lint / typecheck / build green
* Template structure is maintainable enough for future expansion
* Research notes are captured in task files

## Out of Scope (explicit)

* Backend API or persistence changes
* Adding new resume data fields
* Rebuilding the entire editor experience
* Designing a full marketplace/library of many templates in one pass
* Perfect print-tuned PDF pagination for every edge case

## Research References

* [`research/resume-template-benchmarks.md`](./research/resume-template-benchmarks.md) - Real-world resume builder patterns and candidate template directions
* JadeAI template gallery reference image: https://raw.githubusercontent.com/LingyiChen-AI/JadeAI/main/images/template-list.png

## Research Notes

### Current gap in our code

* `ResumePreview.tsx` uses one shared DOM structure for all templates.
* `index.css` only changes the hero background for `north-star`, `ink-flow`, and `grid-slate`.
* This means the product currently offers color themes, not true resume templates.
* The redesign therefore needs to treat the schema as stable and move variation into presentation architecture.
* The current selector UX also underplays template diversity because it is still just a dropdown, while the reference points toward a visual gallery.
* The current catalog is still compiled from frontend constants, which is not enough for future AI-imported template files.

### Feasible approaches here

**Approach A: Executive Two-Column** (Recommended)

* How it works: narrow left rail for contact, skills, certificates; dominant right column for summary, experience, education, projects.
* Pros: closest to common professional resume examples; easy to scan; strongest visual change from current state; works well with existing data model.
* Cons: needs careful responsive collapse behavior in the workspace preview.

**Approach B: Modern Editorial**

* How it works: bold top identity block, asymmetric content bands, stronger typography, project/achievement emphasis.
* Pros: more memorable and portfolio-like; fits product/design candidates well.
* Cons: easier to overdesign; higher risk for future PDF/export consistency.

**Approach C: Minimal ATS-First**

* How it works: single-column, restrained separators, compact chronology, low decoration.
* Pros: cleanest for export and readability; safe default for broad job use.
* Cons: visually less transformative; may still feel too close to the current simple card layout unless tuned carefully.

### Chosen MVP scope

* Build a gallery-style template selection experience.
* Deliver 4 templates in this round:
  * classic professional
  * modern two-column
  * minimal ATS-friendly
  * editorial/creative
* Keep resume metadata/schema fixed and shared across all templates.

## Technical Approach

Split preview rendering into template-aware layout components instead of a single monolithic preview with color modifiers. Keep shared section primitives where useful, but let each template decide:

* overall page structure
* primary information grouping
* sidebar vs main-column usage
* section heading style
* how skills/contact/supporting metadata are presented
* how the template thumbnail/card is represented in the gallery

## Decision (ADR-lite)

**Context**: The current template system does not create meaningful layout variation.
**Decision**: Move from palette-only styling to template-specific render layouts.
**Consequences**: Preview rendering will become componentized by template, but future template additions become much easier and more honest.

**Context**: The same resume data must support multiple visual directions without schema churn.
**Decision**: Keep metadata/content structure relatively fixed and express diversity at the template/layout layer.
**Consequences**: Template components should consume the same typed resume content and vary grouping, emphasis, and styling rather than requiring template-specific data models.

**Context**: The user wants multiple choices similar to a template gallery reference instead of a hidden theme selector.
**Decision**: This round will ship a gallery-style picker and 4 initial templates rather than attempting a larger but shallower template library.
**Consequences**: We optimize for strong diversity in a smaller first set, while the rendering architecture remains extensible for future template additions.

**Context**: The user expects future AI parsing and manual curation to add templates over time.
**Decision**: The template catalog should move behind a loadable data abstraction and the selector should live on a dedicated page.
**Consequences**: We should avoid scattering direct `RESUME_TEMPLATES` imports through page code, and prepare a path where template metadata can come from an API or external manifest while keeping `templateKey` as the persisted link on resumes.

## Technical Notes

* Current task directory: `.trellis/tasks/05-14-resume-template-redesign/`
* Likely frontend files to change:
  * `frontend/src/features/resume/components/ResumePreview.tsx`
  * `frontend/src/index.css`
  * `frontend/src/lib/constants/templates.ts`
  * possibly `frontend/src/pages/WorkspacePage.tsx`
