# State Management

> How state is managed in this project.

---

## Overview

This project is form-heavy and centered on a single-user resume editor, so state management should stay simple, explicit, and close to the feature that owns it.

The main state challenge in MVP is coordinating editor form state, template preview state, auto-save status, and server-synced resume data without introducing unnecessary global state.

---

## State Categories

* Local component state: transient UI interactions such as modal open state, tab selection, and inline editor controls.
* Feature state: resume section edit state, template selection, save status, and validation summaries inside the resume editor feature.
* Server state: resume lists, resume detail payloads, share records, export jobs or export metadata, and system password bootstrap state.
* URL state: active resume id, selected page or route, and public share token or share path.

---

## When to Use Global State

Promote state to a shared/global layer only when:

* multiple distant parts of the app need the same value at the same time
* the value must survive route changes
* the value represents app-wide bootstrap state, such as whether a password has been configured

Do not use global state for section form fields that belong to one editing screen.

---

## Server State

* Server state should be fetched and synchronized separately from local form editing state.
* The editor should load a canonical resume payload from the backend, then manage in-progress edits locally before auto-save sync.
* Auto-save should be debounced and should expose explicit UI states such as `saving`, `saved`, and `save_failed`.
* Share and export operations should not mutate local form state directly; they should work from persisted resume data or an explicit snapshot flow.

---

## Common Mistakes

* Mixing server payload objects directly into uncontrolled form mutations.
* Treating every keypress as a full save event without debounce or save-state feedback.
* Storing page-local editor state in a global store too early.
* Letting template preview state drift from the persisted resume content model.

## Scenario: Resume Grid Pagination and Thumbnail Entry

### 1. Scope / Trigger
- Trigger: the homepage now renders resume thumbnails in a fixed 6-slot horizontal grid, and the thumbnail itself is the editor entry point.

### 2. Signatures
- Homepage state:
  - active list pages through 6 items at a time
  - empty slots are rendered intentionally when fewer than 6 resumes exist on a page
- Resume card actions:
  - thumbnail click opens `/app/resumes/{resumeId}`
  - share dialog opens from the thumbnail card
- Recycle-bin state:
  - separate route consumes deleted-only resume data from the backend
  - reuse the same 6-slot thumbnail grid and pagination behavior as the homepage
  - the primary action on each card is restore, not edit

### 3. Contracts
- Page size is fixed at 6 for the homepage resume grid
- The grid must preserve a visible 6-column slot structure on desktop
- The editor affordance is the thumbnail itself; separate "open editor" buttons are not part of the primary card face
- Share and delete actions are secondary controls around the thumbnail, not the primary entry target

### 4. Validation & Error Matrix
- Fewer than 6 resumes on a page -> render empty slots instead of collapsing the grid
- More than 6 resumes -> paginate and advance on user action
- Deleted items must not leak into the active homepage grid

### 5. Good/Base/Bad Cases
- Good: five active resumes still occupy six stable slots, with one empty placeholder.
- Base: exactly six items render a complete row of preview cards.
- Bad: the homepage collapses to an auto-fit masonry grid, making visual density and paging unpredictable.

### 6. Tests Required
- Frontend build/lint for grid and card rendering changes.
- Route behavior for active list vs recycle bin vs editor entry.

### 7. Wrong vs Correct
#### Wrong
- Treat the homepage as a generic list and let the browser auto-pack cards.
#### Correct
- Fix the grid to six visible slots and make the thumbnail itself the primary navigation target.

## Scenario: Template Directory Preview Before Create

### 1. Scope / Trigger
- Trigger: users browse templates from the homepage template directory before creating a resume.

### 2. Signatures
- Template card click:
  - selects the template
  - updates the right-side preview
  - does not create a resume
- Create action:
  - available from the preview/action area after selection
  - calls resume creation only when the user explicitly clicks create
- Template management action:
  - available from the homepage template directory as catalog-level controls
  - does not create or apply a resume template by itself

### 3. Contracts
- The template directory without `resumeId` is a preview-first creation flow.
- The template directory with `resumeId` remains an apply-to-current-resume flow.
- Template card clicks only select the template and refresh preview/configuration state.
- Template management controls may create, update, or delete templates, but resume creation remains an explicit preview-side action.

### 4. Validation & Error Matrix
- Clicking multiple templates should only change preview state.
- A new resume is created only by the explicit create button.
- Creation failures should surface as a message without changing the selected preview.
