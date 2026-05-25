import type { Root } from "mdast";
import { describe, expect, it } from "vitest";

import { remarkHashtags } from "./remark-hashtags";

function transform(tree: Root) {
  remarkHashtags()(tree);
  return tree;
}

describe("remarkHashtags", () => {
  it("turns hashtags in text nodes into tag links", () => {
    const tree = transform({
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "hello #React" }],
        },
      ],
    });

    expect(tree.children[0]).toMatchObject({
      type: "paragraph",
      children: [
        { type: "text", value: "hello " },
        {
          type: "link",
          url: "/tags/react",
          children: [{ type: "text", value: "#React" }],
        },
      ],
    });
  });

  it("does not create nested tag links inside existing links", () => {
    const tree = transform({
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              url: "/tags/react",
              children: [{ type: "text", value: "#React" }],
            },
          ],
        },
      ],
    });

    expect(tree.children[0]).toMatchObject({
      type: "paragraph",
      children: [
        {
          type: "link",
          url: "/tags/react",
          children: [{ type: "text", value: "#React" }],
        },
      ],
    });
  });
});
