// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePasteImages } from './usePasteImages';

describe('usePasteImages', () => {
  it('imports image files pasted anywhere in the page view', () => {
    const onFiles = vi.fn();
    renderHook(() => usePasteImages(onFiles));
    const file = new File(['picture'], 'pasted.png', { type: 'image/png' });
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: {
        items: [{ type: 'image/png', getAsFile: () => file }],
      },
    });
    let dispatchResult = true;
    act(() => {
      dispatchResult = window.dispatchEvent(paste);
    });
    expect(dispatchResult).toBe(false);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });
});
