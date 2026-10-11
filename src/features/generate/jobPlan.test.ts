// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import {
  buildJobPlan,
  getColouringBlockReason,
  parsePageRange,
  selectAll,
  selectMissingIllustration,
  selectPageNumbers,
  type JobSwitches,
} from './jobPlan';
import { formatPlanSummary } from './PlanSummary';

const T0 = '2026-01-01T00:00:00.000Z';

function sampleBook() {
  const book = createEmptyBook({ id: 'book', nowIso: T0 });
  book.storyPages = [1, 2, 3, 4].map((n) => createStoryPage({ id: `p${n}`, textEn: `Story ${n}` }));
  book.storyPages[0]!.illustration.currentImageId = 'ill-1';
  book.storyPages[1]!.illustration.currentImageId = 'ill-2';
  book.storyPages[1]!.colouring.imageId = 'col-2';
  return book;
}

const both = (overrides: Partial<JobSwitches> = {}): JobSwitches => ({
  illustrations: { enabled: true, overwrite: false },
  colouring: { enabled: true, overwrite: false },
  ...overrides,
});

describe('parsePageRange', () => {
  it('parses single pages and ranges', () => {
    expect(parsePageRange('3-6, 9', 10)).toEqual({ numbers: [3, 4, 5, 6, 9], error: null });
    expect(parsePageRange(' 2 ,2, 1-2 ', 4).numbers).toEqual([1, 2]);
    expect(parsePageRange('', 4)).toEqual({ numbers: [], error: null });
  });

  it('reports bad input without selecting anything', () => {
    expect(parsePageRange('3-', 10).error).toMatch(/not a page/);
    expect(parsePageRange('abc', 10).error).toMatch(/not a page/);
    expect(parsePageRange('0-2', 10).error).toMatch(/between 1 and 10/);
    expect(parsePageRange('8-11', 10).error).toMatch(/between 1 and 10/);
    expect(parsePageRange('11', 10).error).toMatch(/between 1 and 10/);
    expect(parsePageRange('5-3', 10).error).toMatch(/backwards/);
    expect(parsePageRange('5-3', 10).numbers).toEqual([]);
  });
});

describe('selection shortcuts', () => {
  it('selects everything, pages missing an illustration, or listed numbers', () => {
    const book = sampleBook();
    expect(selectAll(book)).toEqual({ cover: true, pageIds: new Set(['p1', 'p2', 'p3', 'p4']) });
    expect(selectMissingIllustration(book)).toEqual({ cover: true, pageIds: new Set(['p3', 'p4']) });
    expect(selectPageNumbers(book, [2, 4, 9])).toEqual({ cover: false, pageIds: new Set(['p2', 'p4']) });
  });
});

describe('getColouringBlockReason', () => {
  it('blocks only pages with no illustration now or coming', () => {
    const [first, , third] = sampleBook().storyPages;
    expect(getColouringBlockReason(first!, false)).toBeNull();
    expect(getColouringBlockReason(third!, false)).toMatch(/illustration first/);
    expect(getColouringBlockReason(third!, true)).toBeNull();
  });
});

describe('buildJobPlan', () => {
  it('skips existing output unless overwrite is on and does not count skipped items', () => {
    const book = sampleBook();
    const plan = buildJobPlan(book, selectAll(book), both());
    expect(plan.jobs.map((job) => job.key)).toEqual([
      'cover',
      'colouring:p1',
      'illustration:p3',
      'colouring:p3',
      'illustration:p4',
      'colouring:p4',
    ]);
    expect(plan.summary).toEqual({ illustrations: 3, colourings: 3, totalCalls: 6 });
    expect(plan.skipped.map((item) => item.reason)).toEqual([
      'Already has an illustration',
      'Already has an illustration',
      'Already has a colouring page',
    ]);

    const overwrite = buildJobPlan(
      book,
      selectAll(book),
      both({ illustrations: { enabled: true, overwrite: true }, colouring: { enabled: true, overwrite: true } }),
    );
    expect(overwrite.summary).toEqual({ illustrations: 5, colourings: 4, totalCalls: 9 });
    expect(overwrite.skipped).toEqual([]);
  });

  it('puts the cover first with an illustration job only', () => {
    const book = sampleBook();
    const plan = buildJobPlan(book, selectAll(book), both());
    expect(plan.jobs[0]).toMatchObject({ kind: 'coverIllustration', dependsOnKey: null });
    expect(plan.jobs.filter((job) => job.target.kind === 'cover')).toHaveLength(1);
  });

  it('runs illustration then colouring for each page and links them', () => {
    const book = sampleBook();
    const plan = buildJobPlan(book, { cover: false, pageIds: new Set(['p3']) }, both());
    expect(plan.jobs).toMatchObject([
      { key: 'illustration:p3', kind: 'illustration', dependsOnKey: null },
      { key: 'colouring:p3', kind: 'colouring', dependsOnKey: 'illustration:p3' },
    ]);
  });

  it('greys colouring for pages without an illustration when illustrations are off', () => {
    const book = sampleBook();
    const plan = buildJobPlan(
      book,
      { cover: false, pageIds: new Set(['p2', 'p3']) },
      both({ illustrations: { enabled: false, overwrite: false }, colouring: { enabled: true, overwrite: true } }),
    );
    expect(plan.jobs.map((job) => job.key)).toEqual(['colouring:p2']);
    expect(plan.skipped).toEqual([
      { kind: 'colouring', target: { kind: 'story', pageId: 'p3' }, reason: 'Needs an illustration first' },
    ]);
  });

  it('uses existing illustrations for colouring-only batches without dependencies', () => {
    const book = sampleBook();
    const plan = buildJobPlan(
      book,
      { cover: false, pageIds: new Set(['p1']) },
      both({ illustrations: { enabled: false, overwrite: false } }),
    );
    expect(plan.jobs).toMatchObject([{ key: 'colouring:p1', dependsOnKey: null }]);
  });
});

describe('formatPlanSummary', () => {
  it('words the summary like the brief', () => {
    expect(formatPlanSummary({ illustrations: 12, colourings: 12, totalCalls: 24 })).toBe(
      '12 illustrations, 12 colouring pages, 24 AI calls',
    );
    expect(formatPlanSummary({ illustrations: 1, colourings: 0, totalCalls: 1 })).toBe(
      '1 illustration, 0 colouring pages, 1 AI call',
    );
  });
});
