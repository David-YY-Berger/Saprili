// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import type { Book } from '@/domain/book';
import { Button } from '@/ui/Button';
import {
  parsePageRange,
  selectAll,
  selectMissingIllustration,
  selectPageNumbers,
  type GenerateSelection,
} from './jobPlan';

export function SelectionShortcuts({
  book,
  disabled,
  onSelect,
}: {
  book: Book;
  disabled: boolean;
  onSelect: (selection: GenerateSelection) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const applyRange = () => {
    const result = parsePageRange(text, book.storyPages.length);
    setError(result.error);
    if (!result.error && result.numbers.length > 0) onSelect(selectPageNumbers(book, result.numbers));
  };

  return (
    <div className="selection-shortcuts">
      <Button disabled={disabled} onClick={() => onSelect(selectAll(book))} variant="secondary">
        Select all
      </Button>
      <Button
        disabled={disabled}
        onClick={() => onSelect(selectMissingIllustration(book))}
        variant="secondary"
      >
        Select pages missing an illustration
      </Button>
      <form
        className="selection-shortcuts__range"
        onSubmit={(event) => {
          event.preventDefault();
          applyRange();
        }}
      >
        <label>
          Page range{' '}
          <input
            aria-describedby={error ? 'page-range-error' : undefined}
            aria-invalid={error !== null}
            disabled={disabled}
            onChange={(event) => setText(event.target.value)}
            placeholder="3-6, 9"
            value={text}
          />
        </label>{' '}
        <Button disabled={disabled} type="submit" variant="secondary">
          Select range
        </Button>
        {error && (
          <p className="field-error" id="page-range-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
