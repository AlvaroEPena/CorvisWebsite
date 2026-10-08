import { describe, expect, it } from 'vitest';
import { buildOwnerMap, pickActive, sectionIdOf } from '../../src/scripts/nav-spy-math';

describe('sectionIdOf', () => {
  it('reads in-page anchors only', () => {
    expect(sectionIdOf('#work')).toBe('work');
    expect(sectionIdOf('/#pricing')).toBe('pricing');
    expect(sectionIdOf('/team')).toBeUndefined();
    expect(sectionIdOf('https://example.com/#x')).toBeUndefined();
  });
});

describe('buildOwnerMap', () => {
  it('lets Work own the redesign demo', () => {
    const owners = buildOwnerMap(['services', 'work', 'process']);
    expect(owners.get('redesign')).toBe('work');
    expect(owners.get('work')).toBe('work');
    expect(owners.get('contact')).toBeUndefined();
  });
});

describe('pickActive', () => {
  const owners = buildOwnerMap(['services', 'work', 'process']);

  it('returns nothing when no linked section crosses the line', () => {
    expect(pickActive([], owners)).toBeUndefined();
    expect(pickActive([{ id: 'contact', top: 10 }], owners)).toBeUndefined();
  });

  it('maps the redesign section to Work', () => {
    expect(pickActive([{ id: 'redesign', top: 100 }], owners)).toBe('work');
  });

  it('prefers the section lowest on the page when two cross the line', () => {
    expect(
      pickActive(
        [
          { id: 'services', top: -300 },
          { id: 'process', top: 280 },
        ],
        owners,
      ),
    ).toBe('process');
  });
});
