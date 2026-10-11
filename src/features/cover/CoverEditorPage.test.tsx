// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPagePair } from '@/domain/factories';
import { bookRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { CoverEditorPage } from './CoverEditorPage';

afterEach(() => {
  cleanup();
  setStorageForTests(null);
});

describe('CoverEditorPage', () => {
  it('autosaves cover text, shows the flat preview, and keeps Generate disabled until Phase 9', async () => {
    setStorageForTests(createTestStorage());
    const book = createEmptyBook({ id: 'cover-book', nowIso: '2026-01-01T00:00:00.000Z' });
    book.format.lockedAt = book.createdAt;
    book.storyPages = createStoryPagePair();
    await bookRepository.createBook(book);
    render(<CoverEditorPage initialBook={book} />);

    expect(screen.getByLabelText('Flat cover preview')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Generate' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: 'Retry' }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.change(screen.getByLabelText('Title (Hebrew)'), { target: { value: 'כותרת חדשה' } });
    fireEvent.change(screen.getByLabelText(/^Spine text \(Hebrew\)/), {
      target: { value: 'שדרה' },
    });

    await waitFor(async () => {
      const saved = await bookRepository.getBook(book.id);
      expect(saved?.cover.titleHe).toBe('כותרת חדשה');
      expect(saved?.cover.spineTextHe).toBe('שדרה');
    });
  });
});
