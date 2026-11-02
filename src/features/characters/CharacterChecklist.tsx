// bisiyata dishmaya, leharbot ahava biyisral
import type { Character } from '@/domain/page';
import { CHARACTER_WARNING_THRESHOLD } from '@/domain/constants';
import { isDefinedCharacter } from '@/domain/characters';

export function characterLabel(character: Character, index: number): string {
  return character.name.trim() || `Character ${index + 1}`;
}

/** One checkbox per book character; checked characters are the ones sent to the AI. */
export function CharacterChecklist({
  bookId,
  characters,
  checkedIds,
  disabled = false,
  onChange,
}: {
  bookId: string;
  characters: Character[];
  checkedIds: readonly string[];
  disabled?: boolean;
  onChange: (characterIds: string[]) => void;
}) {
  const listed = characters.filter(isDefinedCharacter);
  const checked = new Set(checkedIds);
  const checkedCount = listed.filter((character) => checked.has(character.id)).length;
  if (listed.length === 0) {
    return (
      <p className="field__hint">
        No characters yet. <a href={`#/book/${encodeURIComponent(bookId)}/characters`}>Add characters</a>
      </p>
    );
  }
  return (
    <>
      <ul aria-label="Characters in this picture" className="character-checklist">
        {listed.map((character) => (
          <li key={character.id}>
            <label>
              <input
                checked={checked.has(character.id)}
                disabled={disabled}
                onChange={(event) => {
                  const next = event.currentTarget.checked
                    ? [...checkedIds, character.id]
                    : checkedIds.filter((id) => id !== character.id);
                  onChange(next);
                }}
                type="checkbox"
              />
              {characterLabel(character, characters.indexOf(character))}
            </label>
          </li>
        ))}
      </ul>
      {checkedCount > CHARACTER_WARNING_THRESHOLD && (
        <p className="character-warning">
          Most LLMs don’t generate more than 4-6 characters per image.
        </p>
      )}
    </>
  );
}
