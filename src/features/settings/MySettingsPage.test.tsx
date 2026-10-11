// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InMemorySettingsRepository } from '@/storage/settingsStore';
import { setSettingsRepositoryForTests } from '@/storage/repositories';
import { MySettingsPage } from './MySettingsPage';

afterEach(() => {
  cleanup();
  setSettingsRepositoryForTests(null);
});

describe('MySettingsPage', () => {
  it('shows separate Gemini image models and identifies the key as a Gemini API key', async () => {
    setSettingsRepositoryForTests(new InMemorySettingsRepository());
    render(<MySettingsPage />);

    const illustrationModel = await screen.findByLabelText('Illustration image model');
    const colouringModel = screen.getByLabelText('Colouring image model');
    expect((illustrationModel as HTMLSelectElement).value).toBe('gemini-3-pro-image');
    expect((colouringModel as HTMLSelectElement).value).toBe('gemini-3.1-flash-lite-image');
    expect(screen.getByLabelText('Gemini API key').getAttribute('type')).toBe('password');
    expect(screen.getByText(/Photos and English text are sent to Google Gemini/)).toBeTruthy();
  });
});
