import sanitizeHtml from "sanitize-html";

const COOKIE_CONSENT_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u", "s", "small", "span",
  "a", "ul", "ol", "li",
];

/** Keep formatting useful in the compact banner while blocking stored XSS. */
export function sanitizeCookieConsentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: COOKIE_CONSENT_TAGS,
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
        },
      }),
    },
  });
}

export function hasCookieConsentText(html: string): boolean {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;
}
