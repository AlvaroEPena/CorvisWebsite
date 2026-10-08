import { describe, expect, it } from 'vitest';

import {
  describeSelection,
  formatSandboxHash,
  parseSandboxHash,
} from '../../src/lib/sandbox-route';

const projects = [
  { id: 'saltwater-row', hasBefore: true },
  { id: 'refined-celebrations', hasBefore: false },
];

describe('parseSandboxHash', () => {
  it('selects the project and version named in the hash', () => {
    expect(parseSandboxHash('#saltwater-row/before', projects)).toEqual({
      projectId: 'saltwater-row',
      version: 'before',
    });
    expect(parseSandboxHash('#refined-celebrations/after', projects)).toEqual({
      projectId: 'refined-celebrations',
      version: 'after',
    });
  });

  it('defaults a missing version to after', () => {
    expect(parseSandboxHash('#saltwater-row', projects).version).toBe('after');
  });

  it('never selects "before" for a project without one', () => {
    expect(parseSandboxHash('#refined-celebrations/before', projects)).toEqual({
      projectId: 'refined-celebrations',
      version: 'after',
    });
  });

  it('falls back to the first project for empty or unknown hashes', () => {
    const fallback = { projectId: 'saltwater-row', version: 'after' };
    expect(parseSandboxHash('', projects)).toEqual(fallback);
    expect(parseSandboxHash('#nope/before', projects)).toEqual(fallback);
    expect(parseSandboxHash('#__proto__/before', projects)).toEqual(fallback);
  });

  it('round-trips with formatSandboxHash', () => {
    const hash = formatSandboxHash('saltwater-row', 'before');
    expect(hash).toBe('saltwater-row/before');
    expect(parseSandboxHash(`#${hash}`, projects).version).toBe('before');
  });

  it('requires at least one project', () => {
    expect(() => parseSandboxHash('', [])).toThrow();
  });
});

describe('describeSelection', () => {
  it('names the version for redesigns', () => {
    expect(describeSelection('Saltwater Row', 'before', true)).toBe(
      'Showing Saltwater Row, the old website.',
    );
    expect(describeSelection('Saltwater Row', 'after', true)).toBe(
      'Showing Saltwater Row, the new website.',
    );
  });
  it('calls a fresh design the live build', () => {
    expect(describeSelection('Refined', 'after', false)).toBe('Showing Refined, live build.');
  });
});
