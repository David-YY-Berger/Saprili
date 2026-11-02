// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useRef, useState } from 'react';
import type { Book } from '@/domain/book';
import type { Character } from '@/domain/page';
import { newId } from '@/shared/ids';
import { toAppError } from '@/shared/errors';
import { useThumb } from '@/images/useThumb';
import { photoImportService } from '@/images/importPhoto';
import { imageRepository } from '@/storage/repositories';
import { useBeforeUnloadGuard } from '@/app/useBeforeUnloadGuard';
import { undoManager } from '@/ui/UndoManager';
import { Banner } from '@/ui/Banner';
import { SaveErrorBanner } from '@/ui/SaveErrorBanner';
import { Spinner } from '@/ui/Spinner';
import { SaveStatusBar } from '@/features/pageview/SaveStatusBar';
import { useBookAutosave } from '@/features/pageview/useBookAutosave';
import { useBookStore } from '@/features/pageview/useBookStore';

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
  pageCount,
  disabled,
  onChange,
  onPhotoFile,
  onRemove,
}: {
  character: Character;
  index: number;
  pageCount: number;
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
            rows={3}
            value={character.description}
          />
        </label>
        <span className="field__hint">
          Checked on {pageCount} page{pageCount === 1 ? '' : 's'}.
        </span>
        <button className="button button--secondary" onClick={onRemove} type="button">
          Remove character
        </button>
      </div>
    </li>
  );
}

export function CharactersPage({ initialBook }: { initialBook: Book }) {
  const loadedBook = useBookStore((state) => state.book);
  const loadBook = useBookStore((state) => state.loadBook);
  const updateBook = useBookStore((state) => state.updateBook);
  const commit = useBookStore((state) => state.commit);
  const book = loadedBook?.id === initialBook.id ? loadedBook : initialBook;
  const [loadError, setLoadError] = useState<unknown>(null);
  const [storeReady, setStoreReady] = useState(false);
  const [immediateError, setImmediateError] = useState<unknown>(null);
  const [importing, setImporting] = useState(false);
  const importingRef = useRef(false);
  const autosave = useBookAutosave(book, commit, storeReady && loadedBook?.id === initialBook.id);
  useBeforeUnloadGuard(autosave.status);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    setStoreReady(false);
    void loadBook(initialBook.id)
      .then(() => {
        if (active) setStoreReady(true);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error);
      });
    return () => {
      active = false;
    };
  }, [initialBook.id, loadBook]);

  const setCharacters = (update: (characters: Character[]) => Character[]) =>
    updateBook((current) => ({ ...current, characters: update(current.characters) }));

  const changeCharacter = (id: string, patch: Partial<Pick<Character, 'name' | 'description'>>) =>
    setCharacters((characters) => characters.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const addCharacter = () =>
    setCharacters((characters) => [
      ...characters,
      { id: newId(), name: '', description: '', photo: null },
    ]);

  const setPhoto = async (characterId: string, file: File) => {
    if (importingRef.current) return;
    importingRef.current = true;
    setImporting(true);
    setImmediateError(null);
    try {
      const photo = (await photoImportService.importFiles(book.id, [file]))[0];
      if (!photo) return;
      setCharacters((characters) =>
        characters.map((c) => (c.id === characterId ? { ...c, photo } : c)),
      );
      const saved = await commit('userEdit');
      await imageRepository.purgeOrphanImages(saved);
    } catch (error) {
      setImmediateError(error);
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  };

  const removeCharacter = (character: Character, index: number) => {
    updateBook((current) => ({
      ...current,
      characters: current.characters.filter((c) => c.id !== character.id),
      storyPages: current.storyPages.map((page) =>
        page.characterIds.includes(character.id)
          ? { ...page, characterIds: page.characterIds.filter((id) => id !== character.id) }
          : page,
      ),
      cover: {
        ...current.cover,
        characterIds: current.cover.characterIds.filter((id) => id !== character.id),
      },
    }));
    undoManager.registerUndo({
      label: 'Character removed',
      undo: async () => {
        setCharacters((characters) => {
          const restored = [...characters];
          restored.splice(Math.min(index, restored.length), 0, character);
          return restored;
        });
        await commit('userEdit');
      },
      onExpire: async () => {
        const saved = await commit('userEdit');
        await imageRepository.purgeOrphanImages(saved);
      },
    });
  };

  if (loadError !== null) {
    const error = toAppError(loadError);
    return (
      <section aria-labelledby="characters-load-error-heading">
        <h2 id="characters-load-error-heading">The characters could not be opened</h2>
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      </section>
    );
  }
  if (!storeReady || loadedBook?.id !== initialBook.id) {
    return (
      <div aria-label="Loading characters" className="surface-card" role="status">
        <Spinner /> Loading characters…
      </div>
    );
  }

  const immediateAppError = immediateError === null ? null : toAppError(immediateError);
  return (
    <section aria-labelledby="characters-heading" className="characters-page">
      <header className="page-heading page-view__heading">
        <div>
          <h2 id="characters-heading">Characters</h2>
          <p>
            {book.characters.length} character{book.characters.length === 1 ? '' : 's'} in{' '}
            {book.title}. Each page and the cover choose which of them the AI draws; a page
            automatically checks characters whose name appears in its English text.
          </p>
        </div>
        <a
          className="button button--secondary"
          href={`#/book/${encodeURIComponent(book.id)}/settings`}
        >
          Back to book settings
        </a>
      </header>
      <SaveStatusBar lastSavedAt={autosave.lastSavedAt} status={autosave.status} />
      {autosave.status === 'failed' && (
        <SaveErrorBanner error={autosave.error} onRetry={() => void autosave.flush()} />
      )}
      {immediateAppError && (
        <Banner type="error" title={immediateAppError.userMessage}>
          {immediateAppError.nextStep}
        </Banner>
      )}
      {importing && (
        <p aria-live="polite" role="status">
          Preparing picture…
        </p>
      )}
      {book.characters.length === 0 && <p>No characters yet.</p>}
      {book.characters.length > 0 && (
        <ul aria-label="Characters" className="character-list">
          {book.characters.map((character, index) => (
            <CharacterCard
              character={character}
              disabled={importing}
              index={index}
              key={character.id}
              onChange={(patch) => changeCharacter(character.id, patch)}
              onPhotoFile={(file) => void setPhoto(character.id, file)}
              onRemove={() => removeCharacter(character, index)}
              pageCount={
                book.storyPages.filter((page) => page.characterIds.includes(character.id)).length
              }
            />
          ))}
        </ul>
      )}
      <button className="button button--secondary" onClick={addCharacter} type="button">
        Add character
      </button>
    </section>
  );
}
