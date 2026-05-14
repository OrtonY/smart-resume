# Type Safety

> Type safety patterns in this project.

---

## Overview

TypeScript should be used as a product design tool, not only as editor autocomplete.

The frontend will handle deeply nested resume data, dynamic sections, and AI-generated suggestions. That makes runtime validation and strict type ownership important from the beginning.

---

## Type Organization

* Keep feature-specific request and view model types inside the owning feature.
* Promote a type to `src/types/` only when multiple features depend on it.
* Keep API response types separate from UI state types when the UI needs richer derived fields.
* Prefer discriminated unions for section variants or workflow states.

The backend contract should be the source of truth for cross-layer DTO naming.

---

## Validation

Runtime validation tooling is still to be finalized, but the frontend must not trust AI-generated or backend-provided data blindly.

Initial direction:

* Use a schema-based validator for network boundaries and AI output normalization.
* Validate imported resume payloads before putting them into editable state.
* Keep Ant Design form rules for field-level UX, but do not treat them as sufficient domain validation.

Recommended MVP option to confirm later: `zod`

---

## Common Patterns

* Use explicit DTO types for API calls instead of `Record<string, unknown>`.
* Use `as const` only when it improves literal inference and does not hide a modeling problem.
* Prefer helper functions that transform backend models into UI view models over mutating objects inline.
* Model async request state explicitly when a flow has loading, success, and failure branches.

AI suggestion lists and resume section collections should favor typed mappers over ad hoc object reshaping in JSX.

---

## Forbidden Patterns

* `any` in feature code unless there is a temporary migration note.
* Double assertions like `value as unknown as X`.
* Untyped API helper return values.
* Passing partially validated AI output straight into form state.
