/**
 * Pure HTML transforms for the Mod Labs demo. The generic ones (base prefixing, external links,
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
const SITE_LINKS = /<link\s+rel=(["'])(?:manifest|sitemap)\1[^>]*>/gi;
const JSON_LD = /<script\s+type=(["'])application\/ld\+json\1[^>]*>[\s\S]*?<\/script>/gi;
const CONTACT_LINK = /(\shref=)(["'])\/contact\/?(?=[?#"'])/g;

/**
 * Drop head tags that only matter to search and social crawlers (Open Graph, Twitter cards, JSON-LD,
 * manifest, sitemap link). They point at the live site, and a demo must not advertise itself.
 */
export function stripSeoHead(html) {
  return html.replace(SOCIAL_META, '').replace(SITE_LINKS, '').replace(JSON_LD, '');
}

/**
 * The live site redirects /contact to /quote through public/_redirects, which a sub-path never
 * gets, so links point at the target directly.
 */
export function rewriteContactLinks(html) {
  return html.replace(CONTACT_LINK, '$1$2/quote');
}

export function transformPage(html, base) {
  return applyNoindex(
    markExternalLinks(prefixRootPaths(rewriteContactLinks(stripSeoHead(html)), base)),
  );
}
