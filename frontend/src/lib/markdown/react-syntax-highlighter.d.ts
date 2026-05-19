declare module 'react-syntax-highlighter' {
  import type { ComponentType } from 'react'

  interface SyntaxHighlighterProps {
    language?: string
    style?: Record<string, React.CSSProperties>
    children: string
    PreTag?: string
    [key: string]: unknown
  }

  export const Prism: ComponentType<SyntaxHighlighterProps>
  export const Light: ComponentType<SyntaxHighlighterProps>
  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>
  export default SyntaxHighlighter
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const oneDark: Record<string, React.CSSProperties>
  const oneLight: Record<string, React.CSSProperties>
  const vscDarkPlus: Record<string, React.CSSProperties>
  export { oneDark, oneLight, vscDarkPlus }
}
