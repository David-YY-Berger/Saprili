// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import {
  computeCropRect,
  hasNonBlackWhitePixel,
  thresholdToBlackWhite,
} from './postprocess';

describe('image post-processing helpers', () => {
  it('crops only the excess edge to reach the target aspect', () => {
    expect(computeCropRect(1600, 1000, 1)).toEqual({
      x: 300,
      y: 0,
      width: 1000,
      height: 1000,
    });
    expect(computeCropRect(1000, 1600, 1)).toEqual({
      x: 0,
      y: 300,
      width: 1000,
      height: 1000,
    });
    expect(computeCropRect(1000, 1000, 1)).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
    });
  });

  it('detects grey or coloured pixels and converts them to pure black or white', () => {
    const pixels = new Uint8ClampedArray([120, 120, 120, 255, 240, 240, 240, 255]);
    expect(hasNonBlackWhitePixel(pixels)).toBe(true);
    thresholdToBlackWhite(pixels, 190);
    expect([...pixels]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
    expect(hasNonBlackWhitePixel(pixels)).toBe(false);
  });
});
