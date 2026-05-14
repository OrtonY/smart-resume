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
