// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from './book';
import { COLOPHON_PAGE_ID } from './constants';
import type { PageRef } from './page';

export type SpreadKind = 'intro' | 'pair' | 'colophon';

export interface Spread {
  index: number;
  kind: SpreadKind;
  left: PageRef | null;
  right: PageRef | null;
}

/**
 * Right binding: intro alone on the left, each pair read right to left,
 * colophon alone on the right. Left binding mirrors all of it.
 */
export function buildSpreads(book: Book): Spread[] {
  const firstSide = book.bindingSide === 'right' ? 'right' : 'left';
  const secondSide = firstSide === 'right' ? 'left' : 'right';

  const place = (first: PageRef | null, second: PageRef | null) =>
    ({
      [firstSide]: first,
      [secondSide]: second,
    }) as Pick<Spread, 'left' | 'right'>;

  const intro: PageRef = { kind: 'intro', id: book.intro.id };
  const colophon: PageRef = { kind: 'colophon', id: COLOPHON_PAGE_ID };

  const spreads: Omit<Spread, 'index'>[] = [{ kind: 'intro', ...place(null, intro) }];
  for (let i = 0; i + 1 < book.storyPages.length; i += 2) {
    const a = book.storyPages[i]!;
    const b = book.storyPages[i + 1]!;
    spreads.push({
      kind: 'pair',
      ...place({ kind: 'story', id: a.id }, { kind: 'story', id: b.id }),
    });
  }
  spreads.push({ kind: 'colophon', ...place(colophon, null) });

  return spreads.map((s, index) => ({ index, ...s }));
}
