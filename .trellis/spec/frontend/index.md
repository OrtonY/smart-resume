# Frontend Development Guidelines

> Frontend conventions for the Smart Resume web application.

---

## Overview

This project uses TypeScript and Ant Design for a resume-building web interface.

The frontend should be organized around product features rather than a flat component dump. The initial focus is a maintainable editing workspace with clear typing and predictable state flow for create, edit, export, and share experiences.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Bootstrap baseline |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | To refine |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To refine |
| [State Management](./state-management.md) | Local state, global state, server state | Bootstrap baseline |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To refine |
| [Type Safety](./type-safety.md) | Type patterns, validation | Bootstrap baseline |

---

## Confirmed Stack

* UI library: Ant Design
* Language: TypeScript
* Product type: browser-based resume workspace
* Primary concerns: form-heavy editing, preview rendering, export/share interactions

## Expected Frontend Areas

The first implementation pass should leave room for:

* password setup and password entry pages
* resume editor pages
* shared form controls for sections like personal info, education, work experience, project experience, skills, personal summary, honors/awards, and certificates
* template selection and template-specific preview rendering
* preview/export related views
* share-related views and actions
* API client and request typing shared across features

---

**Language**: All documentation should be written in **English** and updated when implementation patterns stabilize.
