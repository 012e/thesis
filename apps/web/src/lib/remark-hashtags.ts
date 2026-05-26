import type { Root, Text, PhrasingContent } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Remark plugin that transforms hashtags (e.g. #React, #AI) in text nodes
 * into link nodes pointing to /tags/:slug.
 *
 * Rules match the backend tag parser:
 * - preceded by start-of-string, whitespace, or punctuation
 * - # followed by letters, digits, underscores (at least one letter)
 * - max 50 characters after #
 */

const TAG_REGEX =
  /(?:^|(?<=[\s.,!?;:'"()\[\]{}<>\/\\|@~`^&*+=\-]))#([A-Za-z_]\w{0,49}|[\d_]*[A-Za-z]\w{0,49})/g;

export function remarkHashtags() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      if (parent.type === "link" || parent.type === "linkReference") return;

      const matches: {
        start: number;
        end: number;
        tag: string;
        slug: string;
      }[] = [];
      let match: RegExpExecArray | null;
      TAG_REGEX.lastIndex = 0;

      while ((match = TAG_REGEX.exec(node.value)) !== null) {
        const raw = match[1];
        // Must contain at least one letter
        if (!/[A-Za-z]/.test(raw)) continue;
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          tag: match[0],
          slug: raw.toLowerCase(),
        });
      }

      if (matches.length === 0) return;

      const children: PhrasingContent[] = [];
      let lastEnd = 0;

      for (const m of matches) {
        if (m.start > lastEnd) {
          children.push({
            type: "text",
            value: node.value.slice(lastEnd, m.start),
          });
        }
        children.push({
          type: "link",
          url: `/tags/${m.slug}`,
          children: [{ type: "text", value: m.tag }],
          data: {
            hProperties: {
              className: "hashtag-link",
            },
          },
        });
        lastEnd = m.end;
      }

      if (lastEnd < node.value.length) {
        children.push({
          type: "text",
          value: node.value.slice(lastEnd),
        });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
}
