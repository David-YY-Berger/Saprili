// bisiyata dishmaya, leharbot ahava biyisral
import { useSortable } from '@dnd-kit/sortable';
import type { CSSProperties } from 'react';
import type { StoryPage } from '@/domain/page';
import { IconButton } from '@/ui/IconButton';
import { RowIndicators } from './RowIndicators';
import { getRowStatus } from './rowStatus';

export function StoryRow({
  page,
  bookId,
  pairNumber,
  pageNumber,
  disabled,
  onMoveUp,
  onMoveDown,
}: {
  page: StoryPage;
  bookId: string;
  pairNumber: number;
  pageNumber: number;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled });
  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined,
    transition,
    opacity: isDragging ? 0.55 : undefined,
  };

  return (
    <article className="story-row" ref={setNodeRef} style={style}>
      <div className="story-row__main">
        <IconButton
          {...attributes}
          {...listeners}
          disabled={disabled}
          icon="⠿"
          label={`Drag Pair ${pairNumber}, page ${pageNumber}`}
          onClick={() => undefined}
          ref={setActivatorNodeRef}
        />
        <a
          className="story-row__link"
          href={`#/book/${encodeURIComponent(bookId)}/page/${encodeURIComponent(page.id)}`}
        >
          <span className="book-row__title">{page.privateTitle || `Page ${pageNumber}`}</span>
          <span className="book-row__summary">
            {page.textEn || page.textHe || 'No text yet'}
          </span>
        </a>
        <RowIndicators status={getRowStatus(page)} />
      </div>
      <div className="story-row__actions">
        <IconButton
          disabled={disabled || pageNumber === 1}
          icon="↑"
          label={`Move ${page.privateTitle || `page ${pageNumber}`} up`}
          onClick={onMoveUp}
        />
        <IconButton
          disabled={disabled}
          icon="↓"
          label={`Move ${page.privateTitle || `page ${pageNumber}`} down`}
          onClick={onMoveDown}
        />
      </div>
    </article>
  );
}
