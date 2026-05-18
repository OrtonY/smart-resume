# brainstorm resume editor chat auto scroll

## Goal

Fix the resume editor AI chat and interview chat so the message panel follows new conversation updates automatically, reducing manual scrolling after sending/receiving messages.

## What I already know

* AI chat UI is implemented in `frontend/src/features/ai/components/AiResumeAssistant.tsx`.
* Interview conversation UI is implemented in `frontend/src/pages/InterviewPage.tsx` (`InterviewDetailView`).
* Both message list containers currently render messages but have no auto-scroll follow behavior.

## Requirements

* AI chat should auto-scroll to the latest message when:
* User sends a message.
* Assistant message is appended/streamed.
* Conversation history is switched or loaded.
* Interview chat should auto-scroll to the latest message when:
* User sends a reply and new messages are returned.
* Interview detail is loaded/refreshed with newer messages.
* If a user manually scrolls up, auto-follow should pause until they return near the bottom (or trigger a new send action).

## Acceptance Criteria

* [ ] In resume editor AI chat, new messages are visible without manual scrolling.
* [ ] In interview chat, new messages are visible without manual scrolling.
* [ ] Manual upward scrolling does not get forcibly overridden immediately.

## Definition of Done

* Frontend code updated with stable auto-scroll behavior for both chat views.
* Lint passes for frontend workspace.

## Out of Scope

* Redesigning chat UI styles.
* Backend API/protocol changes.
* Virtualized list migration.

## Technical Notes

* Keep implementation local to existing components; avoid introducing global state.
* Use message container refs + bottom-threshold detection for controlled auto-follow.
