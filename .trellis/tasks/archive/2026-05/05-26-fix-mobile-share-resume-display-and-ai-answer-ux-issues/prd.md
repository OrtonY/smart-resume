# fix: mobile share, resume display, and AI answer UX issues

## Goal

修复三个前端问题：手机端分享链接创建失败（writeText undefined）、首页简历卡片个人信息居中显示异常、AI 答案改为点击后生成。

## Requirements

### Bug 1: 手机端分享链接 writeText undefined

- `navigator.clipboard` 在非安全上下文（HTTP）或部分移动浏览器中为 undefined
- 需要添加 fallback 机制：优先使用 clipboard API，失败时回退到 `document.execCommand('copy')`
- 涉及两处：`WorkspacePage.tsx:316`（创建分享时自动复制）和 `:921`（分享列表复制按钮）

### Bug 2: 手机端首页简历个人信息居中

- `.resume-template__masthead--compact` 设置了 `align-items: center`
- 在首页卡片预览（`.resume-list-card__preview`）中，缩放后的 A4 纸内 masthead 视觉上居中
- 需要在卡片预览上下文中让个人信息左对齐

### Bug 3: AI 答案改为点击生成

- 当前 `AiAnswerModal.tsx` 打开时自动触发 `startAnswerStream()`
- 需要移除自动触发逻辑，改为显示"生成答案"按钮，用户点击后再生成
- 保留已有的"重新生成"和"停止"按钮逻辑不变

## Acceptance Criteria

- [ ] 手机端（非 HTTPS 环境）点击分享能成功复制链接，不报 writeText undefined
- [ ] 首页简历卡片中个人信息（姓名、职位、联系方式）左对齐显示
- [ ] 打开 AI 答案弹窗时不自动生成，显示"生成答案"按钮
- [ ] 点击"生成答案"按钮后正常流式生成
- [ ] 已有答案时仍显示"重新生成"按钮（行为不变）

## Definition of Done

- Lint / typecheck / build green
- 三个问题均修复验证

## Out of Scope

- 不改变分享链接的创建逻辑（后端）
- 不重构简历预览组件结构
- 不改变 AI 评分的自动生成行为

## Technical Notes

- `WorkspacePage.tsx:316,921` — clipboard 调用点
- `index.css:1265` — `.resume-template__masthead--compact { align-items: center }`
- `AiAnswerModal.tsx:102-125` — 自动触发逻辑
- i18n keys 需要添加：`aiAnswer.generate`（中英文）
