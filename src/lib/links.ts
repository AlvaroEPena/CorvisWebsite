/**
 * Page-local anchors (`#pricing`) stay local on the home page and point back to "/" everywhere
 * else. Root-relative paths (`/sandbox`) are already absolute and never get a prefix.
 */
export function resolveHref(href: string, isHome: boolean): string {
  if (href.startsWith('/')) return href;
  return isHome ? href : `/${href}`;
}
