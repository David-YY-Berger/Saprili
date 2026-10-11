// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { createEmptyBook } from '@/domain/factories';
import { bookRepository } from '@/storage/repositories';
import { setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { ToastHost } from '@/ui/ToastHost';
import { LibraryPage } from './LibraryPage';

const T0 = '2026-09-14T12:00:00.000Z';

beforeEach(() => {
  setStorageForTests(createTestStorage());
  window.location.hash = '#/';
});

afterEach(() => {
  cleanup();
  setStorageForTests(null);
});

function renderLibrary() {
  return render(
    <ToastHost>
      <LibraryPage />
    </ToastHost>,
  );
}

describe('LibraryPage', () => {
  it('shows the friendly empty state and CSV import action', async () => {
    renderLibrary();

    expect(
      await screen.findByRole('heading', { name: 'A little library, just for your family' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import book1 from CSV' })).toBeTruthy();
    const results = await axe.run(document.body, { runOnly: ['button-name'] });
    expect(results.violations).toEqual([]);
  });

  it('shows book summaries, a thumbnail placeholder, and named icon actions', async () => {
    await bookRepository.createBook(
      createEmptyBook({ id: 'family-book', nowIso: T0, title: 'Family stories' }),
    );
    renderLibrary();

    expect(await screen.findByRole('heading', { name: 'Family stories' })).toBeTruthy();
    expect(screen.getByText('2 interior pages')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Family stories book thumbnail' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Actions for Family stories' })).toBeTruthy();

    const results = await axe.run(document.body, { runOnly: ['button-name'] });
    expect(results.violations).toEqual([]);
  });

  it('duplicates a book and lets a pending deletion be undone', async () => {
    await bookRepository.createBook(
      createEmptyBook({ id: 'family-book', nowIso: T0, title: 'Family stories' }),
    );
    renderLibrary();

    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Family stories' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate book' }));
    expect(await screen.findByRole('heading', { name: 'Family stories (copy)' })).toBeTruthy();
    expect(await bookRepository.listBookSummaries()).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Family stories' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete book' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete book' }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(await screen.findByRole('link', { name: 'Open Family stories' })).toBeTruthy();
    expect(await bookRepository.getBook('family-book')).not.toBeNull();
  });
});
