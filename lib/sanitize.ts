import sanitizeHtml from "sanitize-html";

export function sanitizeNewsletterHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      "p", "h2", "h3", "ul", "ol", "li",
      "strong", "em", "blockquote",
      "a", "figure", "figcaption", "img", "br",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "loading"],
      figure: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    disallowedTagsMode: "discard",
  });
}
