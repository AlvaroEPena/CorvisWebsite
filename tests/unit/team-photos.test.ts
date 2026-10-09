import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { site } from '../../src/content/site';
import { photoAltOf, teamProfiles, teamTeaser } from '../../src/content/team';
import { resolveTeamImages, teamImages } from '../../src/lib/team-photos';

const image = (name: string) =>
  ({ src: name, width: 534, height: 667, format: 'avif' }) as ImageMetadata;

describe('resolveTeamImages', () => {
  it('uses the real card and avatar when both exist', () => {
    const files = {
      'aaron-card.avif': image('card'),
      'aaron-avatar.avif': image('avatar'),
      'aaron-placeholder.svg': image('placeholder'),
    };
    const images = resolveTeamImages('aaron', files);
    expect(images?.card.src).toBe('card');
    expect(images?.avatar.src).toBe('avatar');
    expect(images?.isPlaceholder).toBe(false);
  });
  it('accepts WebP or JPEG and falls back to the card when there is no avatar', () => {
    const images = resolveTeamImages('aaron', { 'aaron-card.webp': image('card') });
    expect(images?.avatar.src).toBe('card');
    expect(resolveTeamImages('aaron', { 'aaron-card.jpg': image('jpg') })?.isPlaceholder).toBe(
      false,
    );
  });
  it('falls back to the decorative placeholder, then to nothing (monogram)', () => {
    const placeholder = resolveTeamImages('aaron', { 'aaron-placeholder.svg': image('p') });
    expect(placeholder).toMatchObject({ isPlaceholder: true });
    expect(placeholder?.card).toBe(placeholder?.avatar);
    expect(resolveTeamImages('aaron', { 'alvaro-card.avif': image('x') })).toBeUndefined();
  });
});

describe('team data', () => {
  it('has a profile for every founder, in the order of site.ts', () => {
    expect(teamProfiles.map((profile) => profile.id)).toEqual(site.team.map((member) => member.id));
  });
  it('builds alt text from the name and role', () => {
    expect(photoAltOf(site.team[0])).toBe('Alvaro Peña, Founder and Tech Lead');
    expect(photoAltOf(site.team[1])).toBe('Aaron Peña-Diamond, Co-Founder');
  });
  it('ships a real photo for both founders', () => {
    expect(teamImages('alvaro')?.isPlaceholder).toBe(false);
    expect(teamImages('aaron')?.isPlaceholder).toBe(false);
  });
  it('shows both founders in the home call to action, linking to /team', () => {
    expect(teamTeaser.href).toBe('/team');
    expect(site.team.every((member) => teamImages(member.id))).toBe(true);
  });
  it('keeps typography on plain hyphens and avoids the banned words in team copy', () => {
    const copy = JSON.stringify({ teamProfiles, teamTeaser });
    expect(copy).not.toMatch(/[–—]/);
    expect(copy).not.toMatch(/template|framework|\bAI\b/i);
  });
});
