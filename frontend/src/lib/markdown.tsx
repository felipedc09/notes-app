"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  content: string;
  className?: string;
  /**
   * FR-20/FR-21: card previews strip block-level elements (headings,
   * images, code blocks, blockquotes) so multi-line Markdown collapses into
   * flowing text that CSS line-clamping can truncate cleanly.
   */
  preview?: boolean;
}

const PREVIEW_DISALLOWED_ELEMENTS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "pre",
  "code",
  "hr",
  "blockquote",
];

const markdownComponents: Components = {
  // FR-26: links carry rel="noopener noreferrer"; the default `urlTransform`
  // (left untouched — never overridden) already strips javascript:/data:
  // hrefs before this component ever sees them.
  a: ({ href, children, ...props }) => (
    <a {...props} href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ),
};

/**
 * FR-26: `react-markdown` renders to React elements and never touches
 * `dangerouslySetInnerHTML`, so raw HTML embedded in note content (e.g. a
 * `<script>` tag) is escaped rather than executed. This is structural, not
 * a bolted-on sanitizer pass — **never add `rehype-raw`**, which would
 * reopen exactly the injection sink this component exists to close.
 */
export function Markdown({ content, className, preview = false }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={preview ? PREVIEW_DISALLOWED_ELEMENTS : undefined}
        unwrapDisallowed={preview}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
