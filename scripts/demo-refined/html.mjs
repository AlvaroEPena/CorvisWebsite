/** Pure HTML/CSS transforms for the built demo. No I/O, so they are unit tested. */

const ROOT_ATTRIBUTE = /(\s(?:href|src|action|poster)=)(["'])(\/(?!\/)[^"']*)\2/g;
const ROOT_CSS_URL = /url\((["']?)(\/(?!\/)[^)"']*)\1\)/g;
const ANCHOR_TAG = /<a\b[^>]*>/g;
const EXTERNAL_HREF = /\shref=(["'])(?:https?:)?\/\/[^"']*\1/i;
const SRCSET_ATTRIBUTE = /(\ssrcset=)(["'])([^"']*)\2/g;

const isUnderBase = (url, base) => url === base || url.startsWith(`${base}/`);

function withBase(url, base) {
  if (isUnderBase(url, base)) return url;
  return url === '/' ? `${base}/` : `${base}${url}`;
}

/** Prefix hardcoded root-absolute URLs ("/events", "/favicon.svg") in HTML attributes. */
export function prefixRootPaths(html, base) {
  const withAttributes = html.replace(
    ROOT_ATTRIBUTE,
    (_match, prefix, quote, url) => `${prefix}${quote}${withBase(url, base)}${quote}`,
  );
  return withAttributes.replace(SRCSET_ATTRIBUTE, (_match, prefix, quote, list) => {
    const candidates = list.split(',').map((candidate) => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      const fixed = url.startsWith('/') && !url.startsWith('//') ? withBase(url, base) : url;
      return [fixed, ...descriptor].join(' ');
    });
    return `${prefix}${quote}${candidates.join(', ')}${quote}`;
  });
}

/** Prefix hardcoded root-absolute `url(/...)` references in CSS. */
export function prefixCssUrls(css, base) {
  return css.replace(
    ROOT_CSS_URL,
    (_match, quote, url) => `url(${quote}${withBase(url, base)}${quote})`,
  );
}

/** External links open in a new tab and cannot reach window.opener. */
export function markExternalLinks(html) {
  return html.replace(ANCHOR_TAG, (tag) => {
    if (!EXTERNAL_HREF.test(tag)) return tag;
    const cleaned = tag
      .replace(/\s(?:target|rel)=(["'])[^"']*\1/gi, '')
      .replace(/\s(?:target|rel)=[^\s>]+/gi, '');
    return cleaned.replace(/>$/, ' target="_blank" rel="noopener noreferrer">');
  });
}

/** One noindex meta per page, and no canonical pointing at the live site. */
export function applyNoindex(html) {
  const stripped = html
    .replace(/<meta\s+name=(["'])robots\1[^>]*>\s*/gi, '')
    .replace(/<link\s+rel=(["'])canonical\1[^>]*>\s*/gi, '');
  const robots = '<meta name="robots" content="noindex, nofollow">';
  if (/<meta\s+charset[^>]*>/i.test(stripped)) {
    return stripped.replace(/(<meta\s+charset[^>]*>)/i, `$1${robots}`);
  }
  if (!/<head[^>]*>/i.test(stripped)) throw new Error('HTML page has no <head>');
  return stripped.replace(/(<head[^>]*>)/i, `$1${robots}`);
}

export function transformPage(html, base) {
  return applyNoindex(markExternalLinks(prefixRootPaths(html, base)));
}
