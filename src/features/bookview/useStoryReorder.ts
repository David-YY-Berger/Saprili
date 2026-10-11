// bisiyata dishmaya, leharbot ahava biyisral
import { useMemo, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Book } from '@/domain/book';
import {
  getStoryPageIndex,
  moveStoryPage,
  previewPairsAfterMove,
  type StoryPair,
} from '@/domain/ordering';

export function useStoryReorder(book: Book, onReorder: (book: Book) => void) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pairs = useMemo<StoryPair[]>(() => {
    if (!activeId || !overId) {
      return previewPairsAfterMove(book, '', -1);
    }
    const targetIndex = getStoryPageIndex(book, overId);
    return targetIndex < 0 ? previewPairsAfterMove(book, '', -1) : previewPairsAfterMove(book, activeId, targetIndex);
  }, [activeId, book, overId]);

  const clearDrag = () => {
    setActiveId(null);
    setOverId(null);
  };
  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    setOverId(id);
  };
  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const id = String(event.active.id);
    const targetIndex = event.over ? getStoryPageIndex(book, String(event.over.id)) : -1;
    clearDrag();
    if (targetIndex >= 0) onReorder(moveStoryPage(book, id, targetIndex));
  };
  const handleDragCancel = (_event: DragCancelEvent) => clearDrag();

  return { pairs, sensors, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel };
}
