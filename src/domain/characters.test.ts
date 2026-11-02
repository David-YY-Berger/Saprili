// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { applyAutoChecks, textMentionsCharacter } from './characters';
import { createEmptyBook, createStoryPage } from './factories';

describe('character auto-check', () => {
  it('matches whole words case-insensitively, by full name or any name word', () => {
    expect(textMentionsCharacter('Today MIRIAM ran.', 'Miriam')).toBe(true);
    expect(textMentionsCharacter('Rina went home', 'Rina Cohen')).toBe(true);
    expect(textMentionsCharacter('Anna went home', 'Ann')).toBe(false);
    expect(textMentionsCharacter('hello', 'מרים')).toBe(false);
    expect(textMentionsCharacter('hello', '')).toBe(false);
  });

  it('checks newly mentioned characters but keeps manual unchecks', () => {
    const base = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
    base.characters = [{ id: 'm', name: 'Miriam', description: '', photo: null }];
    base.storyPages = [createStoryPage({ id: 'p', textEn: '' })];
    const typed = applyAutoChecks(base, {
      ...base,
      storyPages: [{ ...base.storyPages[0]!, textEn: 'Miriam smiled.' }],
    });
    expect(typed.storyPages[0]!.characterIds).toEqual(['m']);

    const unchecked = { ...typed, storyPages: [{ ...typed.storyPages[0]!, characterIds: [] }] };
    const edited = applyAutoChecks(unchecked, {
      ...unchecked,
      storyPages: [{ ...unchecked.storyPages[0]!, textEn: 'Miriam smiled a lot.' }],
    });
    expect(edited.storyPages[0]!.characterIds).toEqual([]);
  });
});
