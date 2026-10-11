// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { buildSpreads } from '@/domain/spreads';
import { PageSlot } from './PageSlot';
import { SpreadFrame } from './SpreadFrame';
import { SpreadNavigator } from './SpreadNavigator';
import { PreviewToggleBar } from './PreviewToggleBar';
import { useEdition } from './useEdition';

function containsPage(spread: { left: PageRef | null; right: PageRef | null }, id: string) {
  return spread.left?.id === id || spread.right?.id === id;
}

export function SpreadEditor({
  book,
  pageId,
  selectedPageId,
  onSelectPage,
}: {
  book: Book;
  pageId: string;
  selectedPageId: string;
  onSelectPage: (pageRef: PageRef) => void;
}) {
  const spreads = useMemo(() => buildSpreads(book), [book]);
  const initial = Math.max(0, spreads.findIndex((spread) => containsPage(spread, pageId)));
  const [index, setIndex] = useState(initial);
  const { edition, setEdition } = useEdition();
  const [showGuides, setShowGuides] = useState(false);
  const spread = spreads[Math.min(index, spreads.length - 1)]!;
  useEffect(() => setIndex(initial), [initial]);

  const navigateTo = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(spreads.length - 1, nextIndex));
      const nextSpread = spreads[clamped]!;
      const primaryPage =
        book.bindingSide === 'right'
          ? (nextSpread.right ?? nextSpread.left)
          : (nextSpread.left ?? nextSpread.right);
      setIndex(clamped);
      if (primaryPage) onSelectPage(primaryPage);
    },
    [book.bindingSide, onSelectPage, spreads],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const forwardKey = book.bindingSide === 'right' ? 'ArrowLeft' : 'ArrowRight';
      const backwardKey = book.bindingSide === 'right' ? 'ArrowRight' : 'ArrowLeft';
      if (event.key === forwardKey && index < spreads.length - 1) {
        event.preventDefault();
        navigateTo(index + 1);
      } else if (event.key === backwardKey && index > 0) {
        event.preventDefault();
        navigateTo(index - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book.bindingSide, index, navigateTo, spreads.length]);

  return (
    <section aria-label="Spread editor" className="spread-editor">
      <PreviewToggleBar
        edition={edition}
        onEditionChange={setEdition}
        onGuidesChange={setShowGuides}
        showGuides={showGuides}
      />
      <SpreadNavigator
        bindingSide={book.bindingSide}
        count={spreads.length}
        index={index}
        onChange={navigateTo}
      />
      <SpreadFrame>
        <PageSlot
          book={book}
          onSelect={onSelectPage}
          pageRef={spread.left}
          selected={spread.left?.id === selectedPageId}
          edition={edition}
          showGuides={showGuides}
          side="left"
        />
        <div aria-hidden="true" className="spread-frame__gutter" />
        <PageSlot
          book={book}
          onSelect={onSelectPage}
          pageRef={spread.right}
          selected={spread.right?.id === selectedPageId}
          edition={edition}
          showGuides={showGuides}
          side="right"
        />
      </SpreadFrame>
    </section>
  );
}
