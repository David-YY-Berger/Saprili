// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bookRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { ToastHost } from '@/ui/ToastHost';
import { AppRoutes } from './routes';

const validCsv =
  'Title,eng_descrip,heb_descr\nintro,Meet our family,שלום\n---------,,\none,First story,א\nTwo,Second story,ב\n---------,,\n';

function csvFile(value: string): File {
  const file = new File([value], 'family.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new TextEncoder().encode(value).buffer,
  });
  return file;
}

function renderRoutes() {
  return render(
    <ToastHost>
      <AppRoutes />
    </ToastHost>,
  );
}

beforeEach(() => {
  setStorageForTests(createTestStorage());
  window.location.hash = '#/';
});

afterEach(() => {
  cleanup();
  setStorageForTests(null);
});

describe('Phase 3 flow', () => {
  it('imports a CSV, locks setup, reorders, adds a pair, and undoes deletion', async () => {
    renderRoutes();
    fireEvent.click(await screen.findByRole('button', { name: 'Import book1 from CSV' }));
    fireEvent.change(await screen.findByLabelText('Choose your CSV file'), {
      target: { files: [csvFile(validCsv)] },
    });

    expect(await screen.findByRole('heading', { name: 'Set up your book' })).toBeTruthy();
    expect(
      screen.getByText(
        "This can't be changed later, because your illustrations are drawn to fit this exact shape.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm book setup' }));
    expect(await screen.findByRole('heading', { name: 'book1' })).toBeTruthy();

    const imported = await bookRepository.listBookSummaries();
    expect(imported).toHaveLength(1);
    let book = await bookRepository.getBook(imported[0]!.id);
    expect(book?.format.lockedAt).not.toBeNull();
    expect(book?.intro.textEn).toBe('Meet our family');
    expect(book?.storyPages.map((page) => page.privateTitle)).toEqual(['one', 'Two']);
    expect(screen.getByText('Delete pages').closest('button')?.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Move one down' }));
    await waitFor(async () => {
      book = await bookRepository.getBook(imported[0]!.id);
      expect(book?.storyPages.map((page) => page.privateTitle)).toEqual(['Two', 'one']);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add pages' }));
    fireEvent.change(screen.getByLabelText('Where should they go?'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add pairs' }));
    await waitFor(async () => {
      book = await bookRepository.getBook(imported[0]!.id);
      expect(book?.storyPages).toHaveLength(4);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete pages' }));
    fireEvent.click(screen.getByLabelText('Pair 2: Two + one'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected pairs' }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeTruthy();
    expect((await bookRepository.getBook(imported[0]!.id))?.storyPages).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => {
      expect((await bookRepository.getBook(imported[0]!.id))?.storyPages).toHaveLength(4);
    });
    expect(screen.getByRole('heading', { name: 'Pair 2' })).toBeTruthy();
  });

  it('keeps the library empty when an invalid CSV is submitted', async () => {
    renderRoutes();
    fireEvent.click(await screen.findByRole('button', { name: 'Import book1 from CSV' }));
    fireEvent.change(await screen.findByLabelText('Choose your CSV file'), {
      target: { files: [csvFile('intro,English,עברית\nonly one story,English,א')] },
    });

    expect(await screen.findByText(/wrong number of rows/i)).toBeTruthy();
    expect(await bookRepository.listBookSummaries()).toEqual([]);
  });
});
