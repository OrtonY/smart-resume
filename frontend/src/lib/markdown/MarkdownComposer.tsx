import { useRef, useState } from 'react'
import { Button, Input, Segmented, Space, Tooltip } from 'antd'
import {
  BoldOutlined,
  CodeOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { MarkdownMessage } from './MarkdownMessage'
import './MarkdownComposer.css'

const { TextArea } = Input

interface MarkdownComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  autoSize?: { minRows?: number; maxRows?: number }
}

type Mode = 'edit' | 'preview'

export function MarkdownComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  rows,
  autoSize,
}: MarkdownComposerProps) {
  const [mode, setMode] = useState<Mode>('edit')
  const textAreaRef = useRef<TextAreaRef>(null)

  function applyFormat(prefix: string, suffix: string = prefix, placeholder = '') {
    const el = textAreaRef.current?.resizableTextArea?.textArea
    if (!el) {
      onChange(`${value}${prefix}${placeholder}${suffix}`)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + prefix.length + selected.length + suffix.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  function applyBlock(marker: string) {
    const el = textAreaRef.current?.resizableTextArea?.textArea
    if (!el) {
      onChange(`${value}\n${marker} `)
      return
    }
    const start = el.selectionStart
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const next = `${value.slice(0, lineStart)}${marker} ${value.slice(lineStart)}`
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + marker.length + 1
      el.setSelectionRange(cursor, cursor)
    })
  }

  function applyCodeBlock() {
    const el = textAreaRef.current?.resizableTextArea?.textArea
    if (!el) {
      onChange(`${value}\n\`\`\`\n\n\`\`\``)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const next =
      value.slice(0, start) + '\n```\n' + (selected || '') + '\n```\n' + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + 5
      el.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div className="markdown-composer">
      <div className="markdown-composer__toolbar">
        <Space size={4}>
          <Tooltip title="粗体">
            <Button
              size="small"
              type="text"
              icon={<BoldOutlined />}
              disabled={disabled || mode === 'preview'}
              onClick={() => applyFormat('**', '**', '粗体')}
            />
          </Tooltip>
          <Tooltip title="斜体">
            <Button
              size="small"
              type="text"
              icon={<ItalicOutlined />}
              disabled={disabled || mode === 'preview'}
              onClick={() => applyFormat('_', '_', '斜体')}
            />
          </Tooltip>
          <Tooltip title="行内代码">
            <Button
              size="small"
              type="text"
              icon={<CodeOutlined />}
              disabled={disabled || mode === 'preview'}
              onClick={() => applyFormat('`', '`', 'code')}
            />
          </Tooltip>
          <Tooltip title="代码块">
            <Button
              size="small"
              type="text"
              disabled={disabled || mode === 'preview'}
              onClick={applyCodeBlock}
            >
              {'</>'}
            </Button>
          </Tooltip>
          <Tooltip title="无序列表">
            <Button
              size="small"
              type="text"
              icon={<UnorderedListOutlined />}
              disabled={disabled || mode === 'preview'}
              onClick={() => applyBlock('-')}
            />
          </Tooltip>
          <Tooltip title="有序列表">
            <Button
              size="small"
              type="text"
              icon={<OrderedListOutlined />}
              disabled={disabled || mode === 'preview'}
              onClick={() => applyBlock('1.')}
            />
          </Tooltip>
          <Tooltip title="链接">
            <Button
              size="small"
              type="text"
              icon={<LinkOutlined />}
              disabled={disabled || mode === 'preview'}
              onClick={() => applyFormat('[', '](url)', '链接文本')}
            />
          </Tooltip>
        </Space>
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { label: '编辑', value: 'edit' },
            { label: '预览', value: 'preview' },
          ]}
        />
      </div>
      {mode === 'edit' ? (
        <TextArea
          ref={textAreaRef}
          className="markdown-composer__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          autoSize={autoSize}
          onPressEnter={(e) => {
            if (!e.shiftKey && onSubmit) {
              e.preventDefault()
              onSubmit()
            }
          }}
        />
      ) : (
        <div className="markdown-composer__preview">
          {value ? (
            <MarkdownMessage content={value} />
          ) : (
            <span className="markdown-composer__preview-empty">暂无内容</span>
          )}
        </div>
      )}
    </div>
  )
}
