// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPagePair } from '@/domain/factories';
import { bookRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { BookSettingsPage } from './BookSettingsPage';

afterEach(() => {
  cleanup();
  setStorageForTests(null);
});

describe('BookSettingsPage', () => {
  it('clamps margins and preserves illustration references when binding changes', async () => {
    setStorageForTests(createTestStorage());
    const book = createEmptyBook({ id: 'settings-book', nowIso: '2026-01-01T00:00:00.000Z' });
    book.format.lockedAt = book.createdAt;
    book.storyPages = createStoryPagePair();
    book.storyPages[0]!.illustration.currentImageId = 'keep-illustration-id';
    await bookRepository.createBook(book);
    render(<BookSettingsPage initialBook={book} />);

    fireEvent.change(screen.getByLabelText('Binding side'), { target: { value: 'left' } });
    fireEvent.change(screen.getByLabelText('Top margin (mm)'), { target: { value: '2' } });

    await waitFor(async () => {
      const saved = await bookRepository.getBook(book.id);
      expect(saved?.bindingSide).toBe('left');
      expect(saved?.layout.marginTopMm).toBe(10);
      expect(saved?.storyPages[0]?.illustration.currentImageId).toBe('keep-illustration-id');
    });
  });
});
