import { $isLinkNode, LinkNode } from "@lexical/link";
import * as Mdast from "mdast";
import { LexicalExportVisitor } from "../../exportMarkdownFromLexical";

export const LexicalLinkVisitor: LexicalExportVisitor<LinkNode, Mdast.Link> = {
  testLexicalNode: $isLinkNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const text = lexicalNode.getTextContent();
    if (
      lexicalNode.getURL().startsWith("/tags/") &&
      /^#([A-Za-z_]\w{0,49}|[\d_]*[A-Za-z]\w{0,49})$/.test(text)
    ) {
      actions.appendToParent(mdastParent, {
        type: "text",
        value: text,
      });
      return;
    }

    actions.addAndStepInto("link", {
      url: lexicalNode.getURL(),
      title: lexicalNode.getTitle(),
    });
  },
};
