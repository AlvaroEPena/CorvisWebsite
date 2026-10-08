/** Pure helpers that decide which gallery photos the demo keeps. No I/O, so they are unit tested. */

/**
 * Ids the pages pick by hand (hero, category covers, build covers, about photos) in picks.ts.
 * Reading them from the source keeps the demo's key shots in step with the live site's choices.
 */
export function extractPickedIds(picksSource) {
  const ids = new Set();
  for (const match of picksSource.matchAll(/\bid:\s*(\d+)/g)) ids.add(Number(match[1]));
  return ids;
}

/**
 * Keep the first `photosPerProject` photos of every project (array order = display order, first =
 * cover) plus any photo in `pinnedIds`. The original order is preserved.
 * @param {{ id: number, project: string }[]} records
 */
export function selectPhotos(records, { photosPerProject, pinnedIds }) {
  const seen = new Map();
  return records.filter((record) => {
    const position = (seen.get(record.project) ?? 0) + 1;
    seen.set(record.project, position);
    return position <= photosPerProject || pinnedIds.has(record.id);
  });
}

/** Per-project counts before and after trimming, for the build report. */
export function summarizeTrim(before, after) {
  const count = (records) =>
    records.reduce(
      (totals, record) => totals.set(record.project, (totals.get(record.project) ?? 0) + 1),
      new Map(),
    );
  const kept = count(after);
  return [...count(before)].map(([project, total]) => ({
    project,
    total,
    kept: kept.get(project) ?? 0,
  }));
}
