// bisiyata dishmaya, leharbot ahava biyisral
import type { IntroPhotoLayout } from '@/domain/page';

export function IntroPhotoLayoutPicker({
  value,
  onChange,
}: {
  value: IntroPhotoLayout;
  onChange: (value: IntroPhotoLayout) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="intro-photo-layout">Intro picture layout</label>
      <select
        id="intro-photo-layout"
        onChange={(event) => onChange(event.currentTarget.value as IntroPhotoLayout)}
        value={value}
      >
        <option value="firstLarge">First picture large</option>
        <option value="collage">Collage (up to 4 pictures)</option>
      </select>
      <p className="field__hint">The intro uses original pictures and is not sent as an AI illustration.</p>
    </div>
  );
}
