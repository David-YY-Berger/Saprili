// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from './book';
import type { Character } from './page';

const HEBREW = /[\u0590-\u05ff\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/** A character with a picture, name or description is worth sending to the AI. */
export function isDefinedCharacter(character: Character): boolean {
  return (
    character.photo !== null ||
    character.name.trim() !== '' ||
    character.description.trim() !== ''
  );
}

function nameWords(name: string): string[] {
  return name
    .replace(HEBREW, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2);
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive whole-word match of the full name or any single word of it in the English text. */
export function textMentionsCharacter(textEn: string, name: string): boolean {
  const words = nameWords(name);
  if (words.length === 0) return false;
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${words.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`,
    'iu',
  );
  return pattern.test(textEn);
}

export function findMentionedCharacterIds(characters: readonly Character[], textEn: string): string[] {
  return characters
    .filter((character) => textMentionsCharacter(textEn, character.name))
    .map((character) => character.id);
}

/** The checked characters that still exist, in book order. */
export function getCheckedCharacters(book: Book, characterIds: readonly string[]): Character[] {
  const checked = new Set(characterIds);
  return book.characters.filter((character) => checked.has(character.id));
}

/**
 * Checks characters that a page's English text mentions now but did not before
 * (new text, new page or new/renamed character), so unchecking a mentioned character sticks.
 */
export function applyAutoChecks(previous: Book, next: Book): Book {
  if (previous.storyPages === next.storyPages && previous.characters === next.characters) {
    return next;
  }
  const previousPages = new Map(previous.storyPages.map((page) => [page.id, page]));
  let changed = false;
  const storyPages = next.storyPages.map((page) => {
    const before = previousPages.get(page.id);
    if (before === page && previous.characters === next.characters) return page;
    const alreadyMentioned = new Set(
      before ? findMentionedCharacterIds(previous.characters, before.textEn) : [],
    );
    const added = findMentionedCharacterIds(next.characters, page.textEn).filter(
      (id) => !alreadyMentioned.has(id) && !page.characterIds.includes(id),
    );
    if (added.length === 0) return page;
    changed = true;
    return { ...page, characterIds: [...page.characterIds, ...added] };
  });
  return changed ? { ...next, storyPages } : next;
}
