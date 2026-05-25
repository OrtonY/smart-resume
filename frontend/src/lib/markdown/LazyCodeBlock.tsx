import { useEffect, useState } from 'react'

type RegisterLanguage = (name: string, language: unknown) => void
type SyntaxHighlighterComponent = typeof import('react-syntax-highlighter/dist/esm/prism-light')['default']
type SyntaxStyle = typeof import('react-syntax-highlighter/dist/esm/styles/prism')['oneDark']

interface LazyCodeBlockProps {
  code: string
  language: string
}

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
}

// To support a new language: add its loader here and a type declaration in react-syntax-highlighter.d.ts
const LANGUAGE_LOADERS: Record<string, () => Promise<unknown>> = {
  javascript: () => import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
  jsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/jsx'),
  typescript: () => import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
  tsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
  json: () => import('react-syntax-highlighter/dist/esm/languages/prism/json'),
  bash: () => import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
  css: () => import('react-syntax-highlighter/dist/esm/languages/prism/css'),
  markdown: () => import('react-syntax-highlighter/dist/esm/languages/prism/markdown'),
  sql: () => import('react-syntax-highlighter/dist/esm/languages/prism/sql'),
  diff: () => import('react-syntax-highlighter/dist/esm/languages/prism/diff'),
  python: () => import('react-syntax-highlighter/dist/esm/languages/prism/python'),
  java: () => import('react-syntax-highlighter/dist/esm/languages/prism/java'),
  xml: () => import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
  html: () => import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
}

export function LazyCodeBlock({ code, language }: LazyCodeBlockProps) {
  const [loaded, setLoaded] = useState<{
    SyntaxHighlighter: SyntaxHighlighterComponent
    style: SyntaxStyle
  } | null>(null)
  const normalizedLanguage = LANGUAGE_ALIASES[language.toLowerCase()] ?? language.toLowerCase()
  const languageLoader = LANGUAGE_LOADERS[normalizedLanguage]

  useEffect(() => {
    let active = true

    if (!languageLoader) {
      return
    }

    void Promise.all([
      import('react-syntax-highlighter/dist/esm/prism-light'),
      import('react-syntax-highlighter/dist/esm/styles/prism'),
      languageLoader(),
    ]).then(([syntaxModule, styleModule, languageModule]) => {
      if (!active) {
        return
      }

      const registerLanguage = syntaxModule.registerLanguage as RegisterLanguage
      registerLanguage(normalizedLanguage, (languageModule as { default: unknown }).default)

      setLoaded({
        SyntaxHighlighter: syntaxModule.default,
        style: styleModule.oneDark,
      })
    })

    return () => {
      active = false
    }
  }, [languageLoader, normalizedLanguage])

  if (!languageLoader || !loaded) {
    return (
      <pre className="markdown-message__code-loading">
        <code>{code}</code>
      </pre>
    )
  }

  const { SyntaxHighlighter, style } = loaded

  return (
    <SyntaxHighlighter style={style} language={language} PreTag="div">
      {code}
    </SyntaxHighlighter>
  )
}
