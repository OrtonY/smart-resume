import { Button, Input } from 'antd'
import type { TextAreaProps, TextAreaRef } from 'antd/es/input/TextArea'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

const { TextArea } = Input

const BOLD_TOKEN = '**'

interface MarkdownTextAreaProps extends Omit<TextAreaProps, 'onChange'> {
  value?: string
  onChange?: TextAreaProps['onChange']
}

/**
 * Wraps antd `Input.TextArea` and adds a small inline toolbar that appears
 * when the textarea is focused. Clicking the B button:
 * - If text is selected: wraps/unwrap the selection with `**`
 * - If no text is selected: inserts `****` and places the cursor in the middle
 */
export function MarkdownTextArea(props: MarkdownTextAreaProps) {
  const { value, onChange, className, ...rest } = props
  const ref = useRef<TextAreaRef>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const restoreSelectionRef = useRef<{ start: number; end: number } | null>(null)

  const getTextarea = useCallback((): HTMLTextAreaElement | null => {
    const node = ref.current?.resizableTextArea?.textArea ?? null
    return (node as HTMLTextAreaElement | null) ?? null
  }, [])

  // Restore selection after value mutation triggered by toolbar button.
  useEffect(() => {
    if (!restoreSelectionRef.current) return
    const textarea = getTextarea()
    if (!textarea) return
    const target = restoreSelectionRef.current
    restoreSelectionRef.current = null
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(target.start, target.end)
    })
  }, [value, getTextarea])

  const applyBold = useCallback(() => {
    const current = typeof value === 'string' ? value : ''
    const textarea = getTextarea()
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const hasSelection = start !== end
    const tokenLen = BOLD_TOKEN.length

    let nextValue: string
    let nextSelection: { start: number; end: number }

    if (hasSelection) {
      const before = current.slice(0, start)
      const inner = current.slice(start, end)
      const after = current.slice(end)
      const alreadyWrapped =
        before.endsWith(BOLD_TOKEN) && after.startsWith(BOLD_TOKEN)

      if (alreadyWrapped) {
        nextValue = before.slice(0, -tokenLen) + inner + after.slice(tokenLen)
        nextSelection = {
          start: start - tokenLen,
          end: end - tokenLen,
        }
      } else {
        nextValue = before + BOLD_TOKEN + inner + BOLD_TOKEN + after
        nextSelection = {
          start: start + tokenLen,
          end: end + tokenLen,
        }
      }
    } else {
      // No selection: insert **** and place cursor in the middle
      const before = current.slice(0, start)
      const after = current.slice(start)
      nextValue = before + BOLD_TOKEN + BOLD_TOKEN + after
      const cursorPos = start + tokenLen
      nextSelection = { start: cursorPos, end: cursorPos }
    }

    restoreSelectionRef.current = nextSelection

    // Use the native input value setter so React onChange fires.
    const proto = Object.getPrototypeOf(textarea)
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
    const setter = descriptor?.set
    if (setter) {
      setter.call(textarea, nextValue)
    } else {
      textarea.value = nextValue
    }
    const event = new Event('input', { bubbles: true })
    textarea.dispatchEvent(event)
  }, [value, getTextarea])

  const handleFocus = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true)
    rest.onFocus?.(event)
  }

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    // Defer blur so a click on a toolbar button still registers
    requestAnimationFrame(() => {
      const active = document.activeElement
      if (!containerRef.current?.contains(active)) {
        setIsFocused(false)
      }
    })
    rest.onBlur?.(event)
  }

  const toolbarStyle: CSSProperties = {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    display: 'flex',
    gap: 4,
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
    padding: '2px 4px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    transition: 'opacity 0.15s',
    opacity: isFocused ? 1 : 0,
    pointerEvents: isFocused ? 'auto' : 'none',
  }

  return (
    <div
      ref={containerRef}
      className="markdown-textarea-container"
      style={{ position: 'relative' }}
    >
      <TextArea
        {...rest}
        className={className}
        ref={ref}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <div style={toolbarStyle} role="toolbar" aria-label="格式工具栏">
        <Button
          type="text"
          size="small"
          onMouseDown={(event) => event.preventDefault()}
          onClick={applyBold}
          style={{ fontWeight: 700, padding: '0 6px' }}
          title="加粗"
        >
          B
        </Button>
      </div>
    </div>
  )
}
