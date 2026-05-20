export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'code'; text: string }
  | { type: 'link'; url: string; children: InlineNode[] }

export type BlockNode =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: BlockNode[][] }
  | { type: 'codeBlock'; value: string }
