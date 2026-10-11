// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { getResizedDimensions } from './imageOps';

describe('image resize dimensions', () => {
  it('scales the long edge and preserves the aspect ratio', () => {
    expect(getResizedDimensions(4000, 2000, 2000)).toEqual({
      widthPx: 2000,
      heightPx: 1000,
    });
    expect(getResizedDimensions(3000, 4000, 1024)).toEqual({
      widthPx: 768,
      heightPx: 1024,
    });
  });

  it('does not upscale an image smaller than the requested edge', () => {
    expect(getResizedDimensions(640, 480, 1024)).toEqual({
      widthPx: 640,
      heightPx: 480,
    });
  });
});
