/** Commitments we build to (targets, not client results). */
export const proofStats = [
  { value: '95+', label: 'Lighthouse score we build to, on mobile' },
  { value: '2s', label: 'Longest we let a page take to look ready' },
  { value: 'AA', label: 'Accessibility standard on every build' },
  { value: '1', label: 'Person you talk to, start to finish' },
] as const;

export const proofChips = [
  'Mobile first',
  'Static and fast',
  'You own everything',
  'Plain-English pricing',
  'Search-ready markup',
] as const;
