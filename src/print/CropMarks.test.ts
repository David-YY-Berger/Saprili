// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { computeCropMarkSegments } from './CropMarks';

describe('crop mark segments', () => {
  it('creates eight marks outside the bleed band', () => {
    const trim = { x: 11, y: 11, width: 206, height: 291 };
    const marks = computeCropMarkSegments(trim, 3, 3, 5);
    expect(marks).toHaveLength(8);
    for (const mark of marks) {
      const horizontal = mark.y1 === mark.y2;
      const midX = (mark.x1 + mark.x2) / 2;
      const midY = (mark.y1 + mark.y2) / 2;
      expect(horizontal ? Math.abs(midX - trim.x) : Math.abs(midY - trim.y)).toBeGreaterThan(3);
    }
    expect(marks[0]).toEqual({ x1: 0, y1: 11, x2: 5, y2: 11 });
  });
});
