# brainstorm: bullet AI rewrite in resume editor

## Goal

Add an AI rewrite flow in the resume editor that can improve bullet points inside work experience and project experience descriptions, so users can rewrite each bullet more precisely instead of replacing the whole paragraph.

## What I already know

* The target area is the resume editor page.
* Work experience and project experience descriptions are stored as Markdown strings, not structured bullet arrays.
* The editor already uses `MarkdownComposer` for these fields.
* The app already has an AI assistant and an AI suggestion system that can apply field-level patches.
* The likely reuse path is to extend the existing AI flow rather than invent a separate assistant UI.

## Assumptions (temporary)

* The new feature should start on work experience and project experience descriptions.
* Bullet rewriting should be available from within the editor, close to the existing description field.
* The MVP can reuse the current AI provider configuration and request pipeline.

## Open Questions

* None.

## Requirements (evolving)

* The feature should work on list-style content inside resume description fields.
* The user should be able to trigger AI rewrite from the editor without leaving the page.
* The output should be easy to apply back into the resume draft.
* The UX should remain consistent with the existing Ant Design-based editor.
* The MVP is single-bullet rewrite, not whole-paragraph batch rewrite.
* The target bullet is the Markdown list item on the current cursor line.
* The trigger entry is an AI button in the top-right area of the description field.
* The rewritten bullet should be previewed first; the draft updates only after the user explicitly applies it.

## Acceptance Criteria (evolving)

* [ ] Users can invoke AI rewrite from work experience or project experience descriptions.
* [ ] The feature targets one bullet at a time rather than replacing unrelated text.
* [ ] The target is resolved from the cursor's current Markdown list item.
* [ ] The rewritten content is shown in a preview/confirmation UI before applying.
* [ ] Applying the preview replaces only the target bullet line in the draft.
* [ ] Cancelling the preview leaves the draft unchanged.
* [ ] The feature remains usable on mobile editor layouts.

## Definition of Done

* Tests added/updated where behavior is changed.
* Lint / typecheck green.
* Locale strings updated if new UI text is added.
* No unrelated editor behavior regressed.

## Out of Scope (explicit)

* Reworking resume content storage into a fully structured bullet model.
* Batch rewriting a whole description into multiple bullets.
* Adding new AI providers or changing provider configuration.
* Changing unrelated resume sections unless needed for the same interaction pattern.

## Technical Notes

* Relevant frontend files:
  * `frontend/src/features/resume/components/editor/ResumeEditorView.tsx`
  * `frontend/src/features/ai/components/AiResumeAssistant.tsx`
  * `frontend/src/features/ai/api/aiApi.ts`
  * `frontend/src/features/ai/types.ts`
  * `frontend/src/features/resume/types.ts`
* Relevant markdown utilities:
  * `frontend/src/lib/markdown/MarkdownComposer.tsx`
  * `frontend/src/features/resume/markdown/parseInlineMarkdown.ts`
* Relevant backend AI entry points:
  * `backend/src/main/java/com/smartresume/ai/controller/AiController.java`
  * `backend/src/main/java/com/smartresume/ai/service/AiAgentService.java`
  * `backend/src/main/java/com/smartresume/ai/dto/AiDtos.java`
* Relevant spec files:
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/frontend/component-guidelines.md`
  * `.trellis/spec/frontend/quality-guidelines.md`

## Decision (ADR-lite)

**Context**: Description fields are Markdown strings, so bullet-level rewrite needs to identify a line inside a textarea without changing the resume data model.

**Decision**: For the MVP, the cursor's current Markdown list item is the target bullet. The rewrite entry is a description-field AI button near the field label/toolbar, not a per-line floating action.

**Consequences**: This keeps the implementation local to description editing and avoids restructuring resume content. The tradeoff is that users must place the cursor on the intended bullet before invoking AI rewrite.

### Preview-before-apply

**Context**: AI output may not match the user's intent, and directly mutating resume content would make a bad rewrite feel risky.

**Decision**: The AI rewrite result is shown in a confirmation UI first. The user applies it with an explicit action; otherwise the draft remains unchanged.

**Consequences**: This adds a small confirmation step but keeps the editor trustworthy and makes rollback unnecessary for rejected rewrites.
