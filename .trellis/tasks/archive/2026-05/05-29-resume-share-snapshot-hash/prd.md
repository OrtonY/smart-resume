# Resume Share Snapshot Hash

## Goal

Optimize snapshot-based resume sharing so a share can point to an immutable snapshot that reflects the current resume data and selected template only when that data changed. Snapshot management should also become visible and controllable: users can delete snapshots, see which share links are attached to each snapshot, and deleting a snapshot invalidates associated share links.

## What I already know

* The user wants sharing to compare against the latest snapshot hash; if the hash differs, create a new snapshot.
* The hash data source should be resume information and template.
* Snapshots should support deletion.
* Snapshot UI should show associated share links.
* If a snapshot is deleted, share links targeting it should become invalid.
* Existing backend has separate `resume`, `share`, and `template` domains.
* Existing `SNAPSHOT` share currently binds to the latest `resume_versions` row, creating a snapshot only when no snapshot exists.
* Existing public share access loads `targetVersionId` for `SNAPSHOT` shares; if the target version no longer exists, the public share can fail with not found.
* Existing frontend has `ResumeVersionTimelineModal` for snapshot list/detail/restore, and `ShareLinksModal` for share link management.
* Custom templates have editable render-relevant fields (`layout`, `theme`, `preview`) and `updatedAt`, so using only `templateKey` would miss custom template edits.

## Assumptions

* Hash comparison applies to `SNAPSHOT` share creation. `LATEST` share continues to point at the live resume and should not create snapshots.
* The hash should cover resume title, template key, normalized content, and normalized layout. It should not include full resolved template metadata.
* Snapshot deletion can be a hard delete of the version row if database references are handled safely.
* Associated snapshot share links may remain in the share list, but public access must become invalid after the snapshot is deleted.

## Requirements

* Add a stable content hash to resume snapshots.
* When creating a `SNAPSHOT` share, compute the current resume/template hash and compare it with the latest snapshot for that resume/user.
* Reuse the latest snapshot when hashes match.
* Create a new snapshot when there is no latest snapshot or the latest snapshot hash differs.
* Return enough snapshot metadata for the frontend to show associated share links on each snapshot.
* Add snapshot deletion for owned snapshots.
* After snapshot deletion, share links that targeted that snapshot must be marked inactive and must no longer resolve publicly.
* Preserve current LATEST share behavior unless explicitly expanded.
* Public access to any unavailable share must show the neutral message `链接已失效`, including user-deleted share links, disabled share links, and snapshot-deletion invalidated share links, without exposing the specific reason.

## Acceptance Criteria

* [ ] Creating a `SNAPSHOT` share twice without changing resume title/content/layout/template reuses the same snapshot id.
* [ ] Creating a `SNAPSHOT` share after changing resume content creates a new snapshot id.
* [ ] Creating a `SNAPSHOT` share after changing the selected template creates a new snapshot id.
* [ ] Snapshot list/detail UI shows share links associated with each snapshot.
* [ ] A user can delete an owned snapshot from the snapshot timeline UI.
* [ ] Deleting a snapshot marks associated share links inactive and invalidates public access for share links targeting that snapshot.
* [ ] Existing share password, active toggle, access logs, and PDF export behavior continue to work for valid share links.
* [ ] Backend tests cover hash reuse/create behavior and deletion invalidation.
* [ ] Frontend type-check/lint passes after API and UI updates.

## Definition of Done

* Backend schema migration added for snapshot hash and any needed reference behavior.
* Backend service/controller/dto changes implemented with owner checks.
* Frontend API/types and snapshot timeline UI updated.
* User-facing text added for both `zh-CN` and `en-US` locales.
* Minimal necessary backend tests and frontend checks run.
* Trellis quality check and spec-update judgment completed before wrap-up.

## Out of Scope

* Changing `LATEST` share semantics.
* Full snapshot diff redesign beyond the existing timeline behavior.
* Share analytics redesign.
* Detailed public invalidation reasons; the public page should only show `链接已失效` for deleted, disabled, or snapshot-invalidated links.

## Technical Approach

Recommended MVP approach: store `content_hash` on `resume_versions`, compute it server-side from canonical JSON containing title, template key, normalized layout, and normalized content, then update snapshot share creation to call a new `captureSnapshotIfChanged` style service method. Add snapshot deletion that deletes the owned version and marks associated share links inactive safely. Extend version summary/detail responses with associated share link summaries so the existing timeline modal can display them.

## Decision (ADR-lite)

**Context**: Snapshot share creation needs a stable hash source. Template data can mean either the selected template key or the full resolved template metadata.

**Decision**: Include only `templateKey` for the template portion of the hash.

**Consequences**: Changing the selected template creates a new snapshot, while editing the internals of a custom template with the same key does not. This keeps the MVP simple and avoids snapshot churn from template styling edits.

## Technical Notes

* Backend share service: `backend/src/main/java/com/smartresume/share/service/ShareService.java`
* Backend share controller: `backend/src/main/java/com/smartresume/share/controller/ShareController.java`
* Backend share entity/dto: `backend/src/main/java/com/smartresume/share/domain/ResumeShareEntity.java`, `backend/src/main/java/com/smartresume/share/dto/ShareDtos.java`
* Backend snapshot service: `backend/src/main/java/com/smartresume/resume/service/ResumeVersionService.java`
* Backend resume content normalization: `backend/src/main/java/com/smartresume/resume/service/ResumeContentService.java`
* Backend template service: `backend/src/main/java/com/smartresume/template/service/TemplateCatalogService.java`
* Backend resume controller: `backend/src/main/java/com/smartresume/resume/controller/ResumeController.java`
* Frontend API/types: `frontend/src/features/resume/api/resumeApi.ts`, `frontend/src/features/resume/types.ts`
* Frontend snapshot UI: `frontend/src/features/resume/components/editor/ResumeVersionTimelineModal.tsx`
* Frontend share link UI: `frontend/src/pages/WorkspacePage.tsx`
* `rg.exe` was unavailable in this environment due to access denied; repo searches used PowerShell `Get-ChildItem` + `Select-String`.
* `apply_patch` is also blocked by local access policy in this session; the initial Trellis PRD was written with PowerShell due to that tooling limitation.




