import { fromMarkdown } from 'mdast-util-from-markdown'
import type { BlockNode, InlineNode } from './types'

interface MdastNode {
  type: string
  value?: string
  children?: MdastNode[]
  url?: string
  ordered?: boolean
}

/**
 * Parse a string with markdown into BlockNode[].
 *
 * Supports: bold, italic, inline code, links, lists, code blocks.
 * Disallows: HTML, images.
 */
export function parseMarkdownBlocks(input: string): BlockNode[] {
  if (!input) return []
  const tree = fromMarkdown(input) as MdastNode
  return collectBlocks(tree)
}

/**
 * Parse a string with markdown into InlineNode[] (legacy flat API).
 * Multiple paragraphs are joined by `\n`.
 */
export function parseInlineMarkdown(input: string): InlineNode[] {
  if (!input) return []
  const blocks = parseMarkdownBlocks(input)
  const flattened: InlineNode[] = []
  blocks.forEach((block, index) => {
    if (index > 0) {
      flattened.push({ type: 'text', text: '\n' })
    }
    if (block.type === 'paragraph') {
      flattened.push(...block.children)
    } else if (block.type === 'codeBlock') {
      flattened.push({ type: 'code', text: block.value })
    } else if (block.type === 'list') {
      block.items.forEach((item, i) => {
        if (i > 0) flattened.push({ type: 'text', text: '\n' })
        const prefix = block.ordered ? `${i + 1}. ` : '• '
        flattened.push({ type: 'text', text: prefix })
        item.forEach((subBlock) => {
          if (subBlock.type === 'paragraph') {
            flattened.push(...subBlock.children)
          }
        })
      })
    }
  })
  return mergeAdjacentText(flattened)
}

function collectBlocks(node: MdastNode): BlockNode[] {
  if (!node) return []
  const blocks: BlockNode[] = []

  switch (node.type) {
    case 'root': {
      for (const child of node.children ?? []) {
        blocks.push(...collectBlocks(child))
      }
      return blocks
    }
    case 'paragraph':
    case 'heading': {
      const inlines = walkInlines(node.children ?? [])
      if (inlines.length > 0) {
        blocks.push({ type: 'paragraph', children: inlines })
      }
      return blocks
    }
    case 'list': {
      const items: BlockNode[][] = []
      for (const item of node.children ?? []) {
        items.push(collectBlocks(item))
      }
      blocks.push({ type: 'list', ordered: node.ordered ?? false, items })
      return blocks
    }
    case 'listItem':
    case 'blockquote': {
      for (const child of node.children ?? []) {
        blocks.push(...collectBlocks(child))
      }
      return blocks
    }
    case 'code': {
      const value = node.value ?? ''
      if (value) {
        blocks.push({ type: 'codeBlock', value })
      }
      return blocks
    }
    case 'thematicBreak':
    case 'html': {
      return blocks
    }
    default: {
      for (const child of node.children ?? []) {
        blocks.push(...collectBlocks(child))
      }
      return blocks
    }
  }
}

function walkInlines(children: MdastNode[]): InlineNode[] {
  const result: InlineNode[] = []
  for (const child of children) {
    result.push(...walkInlineNode(child))
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
      const inner = walkInlines(node.children ?? [])
      if (inner.length === 0) return []
      return [{ type: 'italic', children: inner }]
    }
    case 'inlineCode': {
      const value = node.value ?? ''
      if (!value) return []
      return [{ type: 'code', text: value }]
    }
    case 'link':
    case 'linkReference': {
      const inner = walkInlines(node.children ?? [])
      if (inner.length === 0) return []
      return [{ type: 'link', url: node.url ?? '', children: inner }]
    }
    case 'break': {
      return [{ type: 'text', text: '\n' }]
    }
    case 'image':
    case 'imageReference':
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
