import DOMPurify from 'dompurify';

// DOMPurify needs a browser DOM — in Jest (jsdom) it works fine.
// In SSR or pure Node environments it would need isomorphic-dompurify.
export function sanitizeHtml(html) {
  if (!html) return '';
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'blockquote', 'pre', 'code',
        'span', 'div', 'img',
      ],
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'class',
        'src',
        'alt',
        'title',
        'style',
        'data-align',
      ],
    });
  } catch {
    // Fallback: just strip all tags
    return html.replace(/<[^>]+>/g, '');
  }
}
