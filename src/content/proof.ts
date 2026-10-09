/** Commitments we build to (targets, not client results). Rendered statically: the numbers never animate. */
export const proofStats = [
  { value: 14, suffix: '', label: 'Days from kickoff to a live site' },
  { value: 10, suffix: '', label: 'Service and location pages in The Market Leader' },
  { value: 95, suffix: '+', label: 'Lighthouse score we build to, on mobile' },
  { value: 1, suffix: '', label: 'Person you talk to: Aaron, from first call to launch' },
] as const;

export const proofChips = [
  'Done-for-you copywriting',
  'Mobile first',
  'Instant email lead alerts',
  'Plain-English pricing',
] as const;
