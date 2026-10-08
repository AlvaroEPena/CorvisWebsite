/** Pure copy-overlap helpers: find verbatim runs of consecutive words shared by two texts. */

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu;

/** Lower-cased words with punctuation dropped. */
export function tokenize(text) {
  return (text.toLowerCase().match(WORD) ?? []).map((word) => word.replace('’', "'"));
}

/**
 * Maximal runs of at least `minWords` consecutive words that occur in the same order in both
 * texts. Returns each run once, as text, longest first.
 * @returns {{ words: number, text: string }[]}
 */
export function findVerbatimRuns(candidate, reference, minWords = 8) {
  const own = tokenize(candidate);
  const ref = tokenize(reference);
  const grams = new Set();
  for (let index = 0; index + minWords <= ref.length; index += 1) {
    grams.add(ref.slice(index, index + minWords).join(' '));
  }
  const covered = new Array(own.length).fill(false);
  for (let index = 0; index + minWords <= own.length; index += 1) {
    if (!grams.has(own.slice(index, index + minWords).join(' '))) continue;
    for (let offset = 0; offset < minWords; offset += 1) covered[index + offset] = true;
  }
  const runs = [];
  let start = -1;
  for (let index = 0; index <= own.length; index += 1) {
    if (covered[index] && start === -1) start = index;
    if (!covered[index] && start !== -1) {
      runs.push({ words: index - start, text: own.slice(start, index).join(' ') });
      start = -1;
    }
  }
  return runs.sort((a, b) => b.words - a.words);
}
