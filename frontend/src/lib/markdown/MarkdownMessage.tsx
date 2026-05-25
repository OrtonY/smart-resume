import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { completeMarkdown } from './completeMarkdown'
import { LazyCodeBlock } from './LazyCodeBlock'
import './MarkdownMessage.css'

interface MarkdownMessageProps {
  content: string
  streaming?: boolean
  className?: string
}

export function MarkdownMessage({ content, streaming, className }: MarkdownMessageProps) {
  const displayContent = useMemo(() => {
    if (!content) return ''
    return streaming ? completeMarkdown(content) : content
  }, [content, streaming])

  return (
    <div className={`markdown-message ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const codeString = String(children).replace(/\n$/, '')
            if (match) {
              return <LazyCodeBlock code={codeString} language={match[1]} />
            }
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  )
}
