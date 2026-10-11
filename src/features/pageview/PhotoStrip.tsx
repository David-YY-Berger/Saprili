// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PhotoRef } from '@/domain/page';
import { UNDO_WINDOW_MS } from '@/domain/constants';
import { IconButton } from '@/ui/IconButton';
import { ImageOverlay } from '@/ui/ImageOverlay';
import { useThumb } from '@/images/useThumb';

interface PhotoStripProps {
  photos: PhotoRef[];
  cap: number;
  onChange: (photos: PhotoRef[]) => void;
  onRemove: (photo: PhotoRef, index: number) => void;
}

function PhotoTile({
  photo,
  index,
  flagged,
  onOpen,
  onRemove,
}: {
  photo: PhotoRef;
  index: number;
  flagged: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { url: thumbnailUrl, error: thumbnailError } = useThumb(photo.originalImageId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.originalImageId,
  });
  return (
    <li
      className="photo-tile"
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }}
    >
      <button
        aria-label={`Open picture ${index + 1}`}
        className="photo-tile__image-button"
        onClick={onOpen}
        type="button"
      >
        {thumbnailUrl ? (
          <img alt="" src={thumbnailUrl} />
        ) : thumbnailError ? (
          <span role="alert">Picture thumbnail unavailable</span>
        ) : (
          <span aria-label="Picture thumbnail loading" role="status">Loading…</span>
        )}
      </button>
      <div className="photo-tile__actions">
        <IconButton
          {...attributes}
          {...listeners}
          icon="⠿"
          label={`Drag picture ${index + 1} to reorder`}
          onClick={() => undefined}
        />
        <IconButton icon="×" label={`Remove picture ${index + 1}`} onClick={onRemove} />
      </div>
      {flagged && <span className="photo-tile__badge">Not sent to AI (limit 3)</span>}
    </li>
  );
}

export function PhotoStrip({ photos, cap, onChange, onRemove }: PhotoStripProps) {
  const [overlay, setOverlay] = useState<{ id: string; title: string } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((photo) => photo.originalImageId === active.id);
    const newIndex = photos.findIndex((photo) => photo.originalImageId === over.id);
    if (oldIndex >= 0 && newIndex >= 0) onChange(arrayMove(photos, oldIndex, newIndex));
  };

  return (
    <>
      {photos.length > 0 && (
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
          <SortableContext
            items={photos.map((photo) => photo.originalImageId)}
            strategy={horizontalListSortingStrategy}
          >
            <ul aria-label="Pictures" className="photo-strip">
              {photos.map((photo, index) => (
                <PhotoTile
                  flagged={index >= cap}
                  index={index}
                  key={photo.originalImageId}
                  onOpen={() =>
                    setOverlay({ id: photo.originalImageId, title: `Picture ${index + 1}` })
                  }
                  onRemove={() => onRemove(photo, index)}
                  photo={photo}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <ImageOverlay
        imageId={overlay?.id ?? null}
        onClose={() => setOverlay(null)}
        title={overlay?.title ?? 'Picture'}
      />
      <span className="field__hint">You can undo a removal for {Math.round(UNDO_WINDOW_MS / 1000)} seconds.</span>
    </>
  );
}
