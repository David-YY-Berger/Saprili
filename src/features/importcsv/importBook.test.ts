// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { isStoryBodyUntouched } from './importBook';

describe('isStoryBodyUntouched', () => {
  it('only allows import when empty pages contain no user choices or content', () => {
    const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
    const page = createStoryPage();
    expect(isStoryBodyUntouched({ ...book, storyPages: [page] })).toBe(true);
    expect(isStoryBodyUntouched({
      ...book,
      storyPages: [{ ...page, illustration: { ...page.illustration, customPrompt: 'A garden' } }],
    })).toBe(false);
    expect(isStoryBodyUntouched({
      ...book,
      storyPages: [{ ...page, characterIds: ['character'] }],
    })).toBe(false);
  });
});
