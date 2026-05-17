import { fromMarkdown } from 'mdast-util-from-markdown'
import type { InlineNode } from './types'

interface MdastNode {
  type: string
  value?: string
  children?: MdastNode[]
}

/**
 * Parse a string with a strict subset of markdown into InlineNode[].
 *
 * Supports: bold (`**...**`).
 * Disallows: HTML, links, images, code, lists, headings, italic — these node types
 * are flattened to plain text (their text content preserved, formatting dropped).
 *
 * Multiple paragraphs are flattened to a single inline node array, joined by `\n`.
 * Empty input returns `[]`.
 */
export function parseInlineMarkdown(input: string): InlineNode[] {
  if (!input) {
    return []
  }

  const tree = fromMarkdown(input) as MdastNode
  const paragraphs: InlineNode[][] = []
  collectParagraphInlines(tree, paragraphs)

  if (paragraphs.length === 0) {
    return []
  }

  // Flatten multiple paragraphs into a single inline list, separated by '\n'.
  const flattened: InlineNode[] = []
  paragraphs.forEach((paragraphNodes, index) => {
    if (index > 0) {
      flattened.push({ type: 'text', text: '\n' })
    }
    flattened.push(...paragraphNodes)
  })

  return mergeAdjacentText(flattened)
}

function collectParagraphInlines(node: MdastNode, paragraphs: InlineNode[][]): void {
  if (!node) {
    return
  }

  switch (node.type) {
    case 'root': {
      for (const child of node.children ?? []) {
        collectParagraphInlines(child, paragraphs)
      }
      return
    }
    case 'paragraph':
    case 'heading': {
      const inlines = walkInlines(node.children ?? [])
      if (inlines.length > 0) {
        paragraphs.push(inlines)
      }
      return
    }
    case 'list': {
      for (const item of node.children ?? []) {
        collectParagraphInlines(item, paragraphs)
      }
      return
    }
    case 'listItem':
    case 'blockquote': {
      for (const child of node.children ?? []) {
        collectParagraphInlines(child, paragraphs)
      }
      return
    }
    case 'thematicBreak': {
      return
    }
    case 'code': {
      const value = node.value ?? ''
      if (value) {
        paragraphs.push([{ type: 'text', text: value }])
      }
      return
    }
    case 'html': {
      return
    }
    default: {
      const inlines = walkInlines(node.children ?? [])
      if (inlines.length > 0) {
        paragraphs.push(inlines)
      }
    }
  }
}

function walkInlines(children: MdastNode[]): InlineNode[] {
  const result: InlineNode[] = []
  for (const child of children) {
    const nodes = walkInlineNode(child)
    result.push(...nodes)
  }
  return mergeAdjacentText(result)
}

function walkInlineNode(node: MdastNode): InlineNode[] {
  switch (node.type) {
    case 'text': {
      const value = node.value ?? ''
      if (!value) return []
      return [{ type: 'text', text: value }]
    }
    case 'strong': {
      const inner = walkInlines(node.children ?? [])
      if (inner.length === 0) return []
      return [{ type: 'bold', children: inner }]
    }
    case 'emphasis': {
      // Italic is not supported — flatten to plain text children.
      return walkInlines(node.children ?? [])
    }
    case 'break': {
      return [{ type: 'text', text: '\n' }]
    }
    case 'inlineCode': {
      const value = node.value ?? ''
      if (!value) return []
      return [{ type: 'text', text: value }]
    }
    case 'link':
    case 'linkReference': {
      return walkInlines(node.children ?? [])
    }
    case 'image':
    case 'imageReference': {
      return []
    }
    case 'html': {
      return []
    }
    default: {
      if (node.children) {
        return walkInlines(node.children)
      }
      const value = node.value ?? ''
      if (value) {
        return [{ type: 'text', text: value }]
      }
      return []
    }
  }
}

function mergeAdjacentText(nodes: InlineNode[]): InlineNode[] {
  if (nodes.length <= 1) return nodes
  const merged: InlineNode[] = []
  for (const node of nodes) {
    const last = merged[merged.length - 1]
    if (node.type === 'text' && last && last.type === 'text') {
      merged[merged.length - 1] = { type: 'text', text: last.text + node.text }
    } else {
      merged.push(node)
    }
  }
  return merged
}
