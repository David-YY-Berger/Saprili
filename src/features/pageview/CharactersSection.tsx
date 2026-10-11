// bisiyata dishmaya, leharbot ahava biyisral
import { useRef } from 'react';
import type { Character } from '@/domain/page';
import { MAX_AI_CHARACTERS } from '@/domain/constants';
import { newId } from '@/shared/ids';
import { useThumb } from '@/images/useThumb';

function CharacterPicture({ character }: { character: Character }) {
  const { url } = useThumb(character.photo?.originalImageId ?? null);
  return url ? (
    <img alt={character.name ? `Profile picture of ${character.name}` : 'Profile picture'} src={url} />
  ) : (
    <span className="character-card__placeholder">No picture</span>
  );
}

function CharacterCard({
  character,
  index,
  disabled,
  onChange,
  onPhotoFile,
  onRemove,
}: {
  character: Character;
  index: number;
  disabled: boolean;
  onChange: (patch: Partial<Pick<Character, 'name' | 'description'>>) => void;
  onPhotoFile: (file: File) => void;
  onRemove: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <li className="character-card">
      <div className="character-card__picture">
        <CharacterPicture character={character} />
        <button
          className="button button--secondary"
          disabled={disabled}
          onClick={() => fileInput.current?.click()}
          type="button"
        >
          {character.photo ? 'Replace picture' : 'Add picture'}
        </button>
        <input
          accept="image/*"
          aria-label={`Profile picture file for character ${index + 1}`}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPhotoFile(file);
          }}
          ref={fileInput}
          type="file"
        />
      </div>
      <div className="character-card__fields">
        <label className="field">
          <span className="field__label">Name</span>
          <input
            onChange={(event) => onChange({ name: event.target.value })}
            type="text"
            value={character.name}
          />
        </label>
        <label className="field">
          <span className="field__label">Short description (English)</span>
          <textarea
            onChange={(event) => onChange({ description: event.target.value })}
            rows={2}
            value={character.description}
          />
        </label>
        {index >= MAX_AI_CHARACTERS && (
          <span className="photo-tile__badge">Not sent to AI (limit {MAX_AI_CHARACTERS})</span>
        )}
        <button className="button button--secondary" onClick={onRemove} type="button">
          Remove character
        </button>
      </div>
    </li>
  );
}

export function CharactersSection({
  characters,
  disabled,
  onChange,
  onPhotoFile,
  onRemove,
}: {
  characters: Character[];
  disabled: boolean;
  onChange: (characters: Character[]) => void;
  onPhotoFile: (characterId: string, file: File) => void;
  onRemove: (character: Character, index: number) => void;
}) {
  return (
    <section aria-labelledby="characters-heading" className="page-editor__section">
      <h3 id="characters-heading">Main characters</h3>
      <p className="field__hint">
        Each character’s picture and description are sent to the AI together so it can draw them
        consistently. When no characters are added, the original pictures above are used instead.
      </p>
      {characters.length > 0 && (
        <ul aria-label="Main characters" className="character-list">
          {characters.map((character, index) => (
            <CharacterCard
              character={character}
              disabled={disabled}
              index={index}
              key={character.id}
              onChange={(patch) =>
                onChange(characters.map((c) => (c.id === character.id ? { ...c, ...patch } : c)))
              }
              onPhotoFile={(file) => onPhotoFile(character.id, file)}
              onRemove={() => onRemove(character, index)}
            />
          ))}
        </ul>
      )}
      <button
        className="button button--secondary"
        onClick={() =>
          onChange([...characters, { id: newId(), name: '', description: '', photo: null }])
        }
        type="button"
      >
        Add character
      </button>
    </section>
  );
}
