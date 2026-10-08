/** Commitments we build to (targets, not client results). Numbers are animated by CSS counters. */
export const proofStats = [
  { value: 14, suffix: '', label: 'Days from kickoff to a live site' },
  { value: 10, suffix: '', label: 'Local search pages in The Market Leader' },
  { value: 95, suffix: '+', label: 'Lighthouse score we build to, on mobile' },
  { value: 1, suffix: '', label: 'Person you talk to, start to finish' },
] as const;

export const proofChips = [
  'Done-for-you copywriting',
  'Mobile first',
  'Hosting included',
  'You own everything',
  'Plain-English pricing',
] as const;
