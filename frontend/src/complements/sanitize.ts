/**
 * The descriptions of the catalog are HTML. Only simple formatting is kept: paragraphs, links, emphasis, lists and code. Scripts,
 * event handlers, styles and any other tag are removed, and a link opens in a new tab without sending the referrer.
 */
import DOMPurify from "dompurify";

/** The tags that a description can use. */
export const ALLOWED_TAGS = ["p", "br", "a", "em", "strong", "b", "i", "ul", "ol", "li", "code", "pre"] as const;

const purify = DOMPurify(window);
purify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Make the HTML of a description safe.
 *
 * @param html - The HTML of the catalog.
 * @returns HTML with only the allowed tags, and links that open in a new tab.
 */
export function sanitizeDescription(html: string): string {
  if (!purify.isSupported) {
    // Without a DOM that DOMPurify can use, nothing can be trusted: show the text, never the markup.
    return escapeHtml(html);
  }
  return purify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

/** The text of a description, without any tag. It serves for the search and for the excerpt of the list. */
export function plainText(html: string): string {
  if (!purify.isSupported) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  // A space before the end of a block keeps the words of two paragraphs apart.
  return purify.sanitize(html.replace(/<\/(p|li|ul|ol|pre)>|<br\s*\/?>/gi, " $&"), { ALLOWED_TAGS: [], KEEP_CONTENT: true }).replace(/\s+/g, " ").trim();
}
