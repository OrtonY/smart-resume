import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BOLD_COMPAT_MARKER, normalizeMarkdownBoldForCjk, stripMarkdownCompatMarkers } from './boldCompatibility'
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
    const normalized = normalizeMarkdownBoldForCjk(content)
    return streaming ? completeMarkdown(normalized) : normalized
  }, [content, streaming])

  return (
    <div className={`markdown-message ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkStripBoldCompatMarker]}
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

function remarkStripBoldCompatMarker() {
  return (tree: MarkdownAstNode) => {
    stripCompatMarkerFromTree(tree)
  }
}

interface MarkdownAstNode {
  type?: string
  value?: string
  children?: MarkdownAstNode[]
}

function stripCompatMarkerFromTree(node: MarkdownAstNode) {
  if (typeof node.value === 'string' && node.value.includes(BOLD_COMPAT_MARKER)) {
    node.value = stripMarkdownCompatMarkers(node.value)
  }

  for (const child of node.children ?? []) {
    stripCompatMarkerFromTree(child)
  }
}
