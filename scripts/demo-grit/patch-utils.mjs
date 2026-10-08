/** Replace exactly one occurrence; throw if the source no longer contains it. */
export function replaceOnce(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return text.replace(search, () => replacement);
}

/** Replace everything from `start` up to (not including) `end` with `insert`. */
export function replaceBetween(text, start, end, insert, label) {
  const from = text.indexOf(start);
  const to = from === -1 ? -1 : text.indexOf(end, from);
  if (from === -1 || to === -1) throw new Error(`Patch target not found: ${label}`);
  return text.slice(0, from) + insert + text.slice(to);
}
