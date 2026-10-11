// bisiyata dishmaya, leharbot ahava biyisral
import type { Edition } from '@/layout/theme';

export function PreviewToggleBar({
  edition,
  onEditionChange,
  showGuides,
  onGuidesChange,
}: {
  edition: Edition;
  onEditionChange: (edition: Edition) => void;
  showGuides: boolean;
  onGuidesChange: (show: boolean) => void;
}) {
  return (
    <div aria-label="Preview options" className="preview-toggle-bar">
      <label>
        <input
          checked={edition === 'colour'}
          onChange={() => onEditionChange('colour')}
          type="radio"
          name="preview-edition"
        />
        Colour
      </label>
      <label>
        <input
          checked={edition === 'colouring'}
          onChange={() => onEditionChange('colouring')}
          type="radio"
          name="preview-edition"
        />
        Colouring
      </label>
      <label>
        <input
          checked={showGuides}
          onChange={(event) => onGuidesChange(event.currentTarget.checked)}
          type="checkbox"
        />
        Show print guides
      </label>
    </div>
  );
}
