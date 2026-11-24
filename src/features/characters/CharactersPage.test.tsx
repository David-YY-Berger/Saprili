// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { bookRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { CharactersPage } from './CharactersPage';

function csvFile(value: string): File {
  const file = new File([value], 'characters.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new TextEncoder().encode(value).buffer,
  });
  return file;
}

beforeEach(() => setStorageForTests(createTestStorage()));
afterEach(() => {
  cleanup();
  setStorageForTests(null);
});

it('appends imported characters, checks mentions and persists them, but rejects invalid files atomically', async () => {
  const book = createEmptyBook({ id: 'book', nowIso: '2025-01-01T00:00:00.000Z' });
  book.characters = [{ id: 'existing', name: 'Existing', description: '', photo: null }];
  book.storyPages = [createStoryPage({ textEn: 'Maya and Existing walk together.', characterIds: ['existing'] })];
  await bookRepository.createBook(book);
  render(<CharactersPage initialBook={book} />);
  const input = await screen.findByLabelText('Import characters from CSV');

  fireEvent.change(input, { target: { files: [csvFile('name,desc\nMaya,Brave\n,Missing')] } });
  expect((await screen.findByRole('alert')).textContent).toContain('Character record 2');
  expect(screen.getAllByLabelText('Name')).toHaveLength(1);

  fireEvent.change(input, { target: { files: [csvFile('name,desc\nMaya,Brave\nNoah,Kind')] } });
  expect(await screen.findByText('Added 2 characters.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Save and return to book' }));
  await waitFor(async () => {
    const saved = await bookRepository.getBook(book.id);
    expect(saved?.characters.map((character) => character.name)).toEqual(['Existing', 'Maya', 'Noah']);
    expect(saved?.characters[1]).toMatchObject({ description: 'Brave', photo: null });
    expect(saved?.storyPages[0]?.characterIds).toEqual(['existing', saved?.characters[1]?.id]);
  });
});
