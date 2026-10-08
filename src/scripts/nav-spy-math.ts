/**
 * Which navbar link owns which page section. A link can own several sections (the redesign
 * demo is part of Work). Pure so the mapping can be unit tested.
 */

/** Section ids owned by extra links, keyed by the link's own section id. */
export const ALSO_OWNED: Readonly<Record<string, readonly string[]>> = {
  work: ['redesign'],
};

/** Section id from an in-page anchor href (`#work` or `/#work`), or undefined for other links. */
export function sectionIdOf(href: string): string | undefined {
  const match = /^\/?#([A-Za-z][\w-]*)$/.exec(href);
  return match?.[1];
}

/** Maps every section id to the id of the link section that owns it. */
export function buildOwnerMap(
  linkSectionIds: readonly string[],
  alsoOwned: Readonly<Record<string, readonly string[]>> = ALSO_OWNED,
): Map<string, string> {
  const owners = new Map<string, string>();
  for (const id of linkSectionIds) {
    owners.set(id, id);
    for (const extra of alsoOwned[id] ?? []) owners.set(extra, id);
  }
  return owners;
}

/**
 * Picks the active link section from the sections currently crossing the reading line: the one
 * that sits lowest on the page wins (the section being scrolled into), or none.
 */
export function pickActive(
  crossing: readonly { id: string; top: number }[],
  owners: ReadonlyMap<string, string>,
): string | undefined {
  const owned = crossing.filter((entry) => owners.has(entry.id));
  if (owned.length === 0) return undefined;
  const lowest = owned.reduce((best, entry) => (entry.top > best.top ? entry : best));
  return owners.get(lowest.id);
}
