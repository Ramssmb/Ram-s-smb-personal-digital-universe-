import "server-only";

import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** Every link written in Markdown opens safely and passes no ranking credit. */
function rehypeSafeLinks() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (node.type === "element" && node.tagName === "a" && node.properties) {
        const href = String(node.properties.href ?? "");
        if (/^https?:\/\//i.test(href)) {
          node.properties.rel = ["nofollow", "ugc", "noopener", "noreferrer"];
        }
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

// GitHub's sanitization schema, without inline images: images must come from the media library.
const schema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((tag) => tag !== "img"),
  protocols: { ...defaultSchema.protocols, href: ["http", "https", "mailto"] },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // Raw HTML in Markdown is dropped here (allowDangerousHtml is off).
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeSafeLinks)
  .use(rehypeStringify);

/**
 * Renders owner-written Markdown to HTML that is safe to inject: raw HTML,
 * scripts, event handlers and javascript: URLs are removed.
 */
export function renderMarkdown(markdown: string | null | undefined): string {
  if (!markdown?.trim()) return "";
  return String(processor.processSync(markdown));
}
