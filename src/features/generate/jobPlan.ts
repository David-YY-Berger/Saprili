// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { JobPlan, PlannedJob, SkippedJob } from '@/domain/job';
import type { StoryPage } from '@/domain/page';
import { MAX_AI_CHARACTERS } from '@/domain/constants';
import { getCoverImageIds } from '@/layout/render/pageImages';

export interface GenerateSelection {
  cover: boolean;
  pageIds: ReadonlySet<string>;
}

export interface JobSwitch {
  enabled: boolean;
  overwrite: boolean;
}

export interface JobSwitches {
  illustrations: JobSwitch;
  colouring: JobSwitch;
}

export const DEFAULT_SWITCHES: JobSwitches = {
  illustrations: { enabled: true, overwrite: false },
  colouring: { enabled: false, overwrite: false },
};

export interface PageRangeResult {
  /** 1-based story page numbers, sorted and unique. */
  numbers: number[];
  error: string | null;
}

/** Parses text such as "3-6, 9". Empty text selects nothing. */
export function parsePageRange(text: string, maxIndex: number): PageRangeResult {
  const numbers = new Set<number>();
  const trimmed = text.trim();
  if (trimmed === '') return { numbers: [], error: null };
  for (const rawPart of trimmed.split(',')) {
    const part = rawPart.trim();
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) return { numbers: [], error: `"${part}" is not a page or a range like 3-6.` };
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);
    if (start < 1 || end > maxIndex || start > maxIndex) {
      return { numbers: [], error: `Pages must be between 1 and ${maxIndex}.` };
    }
    if (start > end) return { numbers: [], error: `"${part}" counts backwards.` };
    for (let value = start; value <= end; value += 1) numbers.add(value);
  }
  return { numbers: [...numbers].sort((a, b) => a - b), error: null };
}

export function selectAll(book: Book): GenerateSelection {
  return { cover: true, pageIds: new Set(book.storyPages.map((page) => page.id)) };
}

export function selectMissingIllustration(book: Book): GenerateSelection {
  return {
    cover: book.cover.artworkMode !== 'introCollage' && getCoverImageIds(book).length === 0,
    pageIds: new Set(
      book.storyPages
        .filter((page) => page.illustration.currentImageId === null)
        .map((page) => page.id),
    ),
  };
}

/** Story page numbers are 1-based positions in reading order. */
export function selectPageNumbers(book: Book, numbers: readonly number[]): GenerateSelection {
  const ids = numbers.flatMap((n) => {
    const page = book.storyPages[n - 1];
    return page ? [page.id] : [];
  });
  return { cover: false, pageIds: new Set(ids) };
}

export function getColouringBlockReason(
  page: StoryPage,
  willGenerateIllustrationNow: boolean,
): string | null {
  if (page.illustration.currentImageId !== null || willGenerateIllustrationNow) return null;
  return 'Needs an illustration first';
}

export function buildJobPlan(
  book: Book,
  selection: GenerateSelection,
  switches: JobSwitches,
): JobPlan {
  const jobs: PlannedJob[] = [];
  const skipped: SkippedJob[] = [];

  // The cover row only ever has an illustration job.
  if (selection.cover && switches.illustrations.enabled) {
    const exists = getCoverImageIds(book).length > 0;
    if (book.cover.ownImageId) {
      skipped.push({
        kind: 'coverIllustration',
        target: { kind: 'cover' },
        reason: 'Using your own cover image',
      });
    } else if (book.cover.artworkMode === 'introCollage') {
      skipped.push({
        kind: 'coverIllustration',
        target: { kind: 'cover' },
        reason: 'Using the intro photo collage',
      });
    } else if (exists && !switches.illustrations.overwrite) {
      skipped.push({
        kind: 'coverIllustration',
        target: { kind: 'cover' },
        reason: 'Already has an illustration',
      });
    } else {
      jobs.push({
        key: 'cover',
        kind: 'coverIllustration',
        target: { kind: 'cover' },
        overwrite: exists,
        dependsOnKey: null,
      });
    }
  }

  for (const page of book.storyPages) {
    if (!selection.pageIds.has(page.id)) continue;
    const target = { kind: 'story', pageId: page.id } as const;
    let illustrationKey: string | null = null;

    if (switches.illustrations.enabled) {
      const exists = page.illustration.currentImageId !== null;
      if (exists && !switches.illustrations.overwrite) {
        skipped.push({ kind: 'illustration', target, reason: 'Already has an illustration' });
      } else {
        illustrationKey = `illustration:${page.id}`;
        jobs.push({
          key: illustrationKey,
          kind: 'illustration',
          target,
          overwrite: exists,
          dependsOnKey: null,
        });
      }
    }

    if (switches.colouring.enabled) {
      const blocked = getColouringBlockReason(page, illustrationKey !== null);
      if (blocked) {
        skipped.push({ kind: 'colouring', target, reason: blocked });
      } else if (page.colouring.imageId !== null && !switches.colouring.overwrite) {
        skipped.push({ kind: 'colouring', target, reason: 'Already has a colouring page' });
      } else {
        jobs.push({
          key: `colouring:${page.id}`,
          kind: 'colouring',
          target,
          overwrite: page.colouring.imageId !== null,
          dependsOnKey: illustrationKey,
        });
      }
    }
  }

  const colourings = jobs.filter((job) => job.kind === 'colouring').length;
  const portraitCalls = jobs.some(
    (job) => job.kind === 'coverIllustration' && book.cover.artworkMode === 'characterPortraits',
  )
    ? Math.min(
        book.intro.characters.filter(
          (character) =>
            character.photo !== null ||
            character.name.trim() !== '' ||
            character.description.trim() !== '',
        ).length,
        MAX_AI_CHARACTERS,
      ) - 1
    : 0;
  return {
    bookId: book.id,
    jobs,
    summary: {
      illustrations: jobs.length - colourings,
      colourings,
      totalCalls: jobs.length + Math.max(0, portraitCalls),
    },
    skipped,
  };
}
