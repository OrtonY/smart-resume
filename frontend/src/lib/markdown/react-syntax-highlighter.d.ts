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

declare module 'react-syntax-highlighter/dist/esm/prism-light' {
  import type { ComponentType } from 'react'

  interface SyntaxHighlighterProps {
    language?: string
    style?: Record<string, React.CSSProperties>
    children: string
    PreTag?: string
    [key: string]: unknown
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>
  export function registerLanguage(name: string, language: unknown): void
  export default SyntaxHighlighter
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const oneDark: Record<string, React.CSSProperties>
  const oneLight: Record<string, React.CSSProperties>
  const vscDarkPlus: Record<string, React.CSSProperties>
  export { oneDark, oneLight, vscDarkPlus }
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/javascript' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/jsx' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/typescript' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/tsx' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/json' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/bash' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/css' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/markdown' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/sql' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/diff' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/python' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/java' { const language: unknown; export default language }
declare module 'react-syntax-highlighter/dist/esm/languages/prism/markup' { const language: unknown; export default language }
