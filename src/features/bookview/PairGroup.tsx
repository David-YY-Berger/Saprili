// bisiyata dishmaya, leharbot ahava biyisral
import type { StoryPair } from '@/domain/ordering';
import { StoryRow } from './StoryRow';

export function PairGroup({
  pair,
  pairNumber,
  bookId,
  disabled,
  firstPageNumber,
  onMove,
}: {
  pair: StoryPair;
  pairNumber: number;
  bookId: string;
  disabled: boolean;
  firstPageNumber: number;
  onMove: (pageId: string, newIndex: number) => void;
}) {
  return (
    <section aria-label={`Pair ${pairNumber}`} className="pair-group">
      <h3>Pair {pairNumber}</h3>
      <div className="pair-group__pages">
        {pair.map((page, index) => {
          const pageNumber = firstPageNumber + index;
          const pageIndex = pageNumber - 1;
          return (
            <StoryRow
              bookId={bookId}
              disabled={disabled}
              key={page.id}
              onMoveDown={() => onMove(page.id, pageIndex + 1)}
              onMoveUp={() => onMove(page.id, pageIndex - 1)}
              page={page}
              pageNumber={pageNumber}
              pairNumber={pairNumber}
            />
          );
        })}
      </div>
    </section>
  );
}
