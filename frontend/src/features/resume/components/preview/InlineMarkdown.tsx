import { Fragment, type ReactNode } from "react";
import { parseInlineMarkdown } from "../../markdown/parseInlineMarkdown";
import type { InlineNode } from "../../markdown/types";

function renderInlineNodes(nodes: InlineNode[]): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return <Fragment key={index}>{node.text}</Fragment>;
      case "bold":
        return <strong key={index}>{renderInlineNodes(node.children)}</strong>;
      case "italic":
        return <em key={index}>{renderInlineNodes(node.children)}</em>;
      case "code":
        return <code key={index} style={{ padding: "0.1em 0.3em", borderRadius: 3, background: "rgba(0,0,0,0.06)", fontSize: "0.9em" }}>{node.text}</code>;
      case "link":
        return <a key={index} href={node.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{renderInlineNodes(node.children)}</a>;
    }
  });
}

export function InlineMarkdown({ text }: { text: string }) {
  if (!text) {
    return null;
  }

  const nodes = parseInlineMarkdown(text);
  if (nodes.length === 0) {
    return null;
  }

  return <>{renderInlineNodes(nodes)}</>;
}
