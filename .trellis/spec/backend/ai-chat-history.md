# AI Chat History Persistence

> How the resume AI assistant stores and reuses conversation history.

---

## Overview

AI chat history is persisted on the backend and grouped by `resumeId`.
Each resume may have multiple selectable conversations.
The backend uses Spring AI `ChatClient` with `MessageChatMemoryAdvisor` and a JDBC-backed `ChatMemoryRepository`.
The frontend sends only the current user message and bound resume context; Spring AI persists the conversation memory by `conversationId` and reuses it on the next stream.

---

## Persistence Rules

* Use `ai_chat_conversations` as the resume-scoped conversation metadata table.
* Use `ChatMemory.CONVERSATION_ID` as the selected conversation id, not as the resume id.
* New conversation ids should be unique per chat, such as `resume-{resumeId}-{uuid}`, so a resume can have multiple independent history threads.
* Use `MessageWindowChatMemory` with a bounded message window for prompt reuse.
* Keep read APIs for listing a resume's conversations and loading messages for a selected conversation.
* Prefer `stream().content()` for SSE text output; the frontend can render each content chunk directly.
* Do not switch the frontend to a newly-created conversation until the current stream is complete, otherwise the history reload can overwrite the in-progress streamed assistant message.

---

## Common Mistakes

* Passing the full conversation history from the browser on every request.
* Hand-rolling persistence when `MessageChatMemoryAdvisor` already stores and replays memory.
* Loading unbounded history into the prompt context.
* Letting SSE endpoint exceptions fall through to the global JSON exception handler; emit an SSE `error` event instead.
* Collapsing all chats for the same resume into a single conversation id, which prevents users from choosing and continuing distinct histories.
