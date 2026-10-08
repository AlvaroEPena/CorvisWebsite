/**
 * Pure HTML transforms for the Grit demo. The generic ones (base prefixing, external links,
 * noindex) are shared with the Refined demo and imported read-only.
 */
import { applyNoindex, markExternalLinks, prefixRootPaths } from '../demo-refined/html.mjs';

export {
  applyNoindex,
  markExternalLinks,
  prefixCssUrls,
  prefixRootPaths,
} from '../demo-refined/html.mjs';

const SOCIAL_META = /<meta\s+(?:property=(["'])og:[^"']*\1|name=(["'])twitter:[^"']*\2)[^>]*>/gi;
const JSON_LD = /<script\s+type=(["'])application\/ld\+json\1[^>]*>[\s\S]*?<\/script>/gi;

/**
 * Drop head tags that only matter to search and social crawlers (Open Graph, Twitter cards,
 * JSON-LD). They point at the live site, and a demo must not advertise itself.
 */
export function stripSeoHead(html) {
  return html.replace(SOCIAL_META, '').replace(JSON_LD, '');
}

export function transformPage(html, base) {
  return applyNoindex(markExternalLinks(prefixRootPaths(stripSeoHead(html), base)));
}

const SCRIPT_OR_STYLE = /<(script|style|noscript)\b[\s\S]*?<\/\1>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<[^>]+>/g;
const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** Visible text of an HTML page (no scripts/styles), whitespace collapsed. Used by the overlap check. */
export function visibleText(html) {
  return html
    .replace(SCRIPT_OR_STYLE, ' ')
    .replace(COMMENT, ' ')
    .replace(TAG, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
}
