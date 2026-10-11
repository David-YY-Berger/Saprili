// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhotoDropZone } from './PhotoDropZone';

describe('PhotoDropZone', () => {
  it('accepts image files from a drop and ignores non-images', () => {
    const onFiles = vi.fn();
    render(<PhotoDropZone onFiles={onFiles} />);
    const image = new File(['image'], 'family.png', { type: 'image/png' });
    const text = new File(['text'], 'notes.txt', { type: 'text/plain' });

    fireEvent.drop(screen.getByText(/Drop pictures here/).parentElement!, {
      dataTransfer: { files: [image, text] },
    });

    expect(onFiles).toHaveBeenCalledWith([image]);
  });
});
