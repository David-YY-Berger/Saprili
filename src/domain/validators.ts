// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from './book';
import { COLOPHON_PAGE_ID, ILLUSTRATION_HISTORY_MAX, SAFE_MARGIN_FLOOR_MM } from './constants';
import { isInteriorPageCountEven } from './ordering';

export type BookProblemCode =
  'STORY_COUNT_ODD' | 'MARGIN_BELOW_FLOOR' | 'HISTORY_TOO_LONG' | 'DUPLICATE_ID';

export interface BookProblem {
  code: BookProblemCode;
  path: string;
  message: string;
}

export function validateBook(book: Book): BookProblem[] {
  const problems: BookProblem[] = [];

  if (!isInteriorPageCountEven(book)) {
    problems.push({
      code: 'STORY_COUNT_ODD',
      path: 'storyPages',
      message: `Story pages must come in pairs, found ${book.storyPages.length}.`,
    });
  }

  const margins = ['marginTopMm', 'marginBottomMm', 'marginOuterMm', 'gutterMm'] as const;
  for (const key of margins) {
    if (book.layout[key] < SAFE_MARGIN_FLOOR_MM) {
      problems.push({
        code: 'MARGIN_BELOW_FLOOR',
        path: `layout.${key}`,
        message: `${key} is ${book.layout[key]} mm, below the ${SAFE_MARGIN_FLOOR_MM} mm floor.`,
      });
    }
  }

  const histories: [string, number][] = [
    ['cover.illustration.history', book.cover.illustration.history.length],
    ...book.storyPages.map((p, i): [string, number] => [
      `storyPages[${i}].illustration.history`,
      p.illustration.history.length,
    ]),
  ];
  for (const [path, length] of histories) {
    if (length > ILLUSTRATION_HISTORY_MAX) {
      problems.push({
        code: 'HISTORY_TOO_LONG',
        path,
        message: `Illustration history keeps at most ${ILLUSTRATION_HISTORY_MAX} versions, found ${length}.`,
      });
    }
  }

  const seen = new Set<string>([COLOPHON_PAGE_ID]);
  for (const [path, id] of [
    ['intro.id', book.intro.id],
    ...book.storyPages.map((p, i): [string, string] => [`storyPages[${i}].id`, p.id]),
  ] as [string, string][]) {
    if (seen.has(id)) {
      problems.push({ code: 'DUPLICATE_ID', path, message: `Page id "${id}" is not unique.` });
    }
    seen.add(id);
  }

  return problems;
}
