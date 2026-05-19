import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { completeMarkdown } from './completeMarkdown'
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
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                >
                  {codeString}
                </SyntaxHighlighter>
              )
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
