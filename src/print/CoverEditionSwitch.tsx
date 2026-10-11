// bisiyata dishmaya, leharbot ahava biyisral
import type { Edition } from '@/layout/theme';

/** Chooses between the plain cover and the colouring-book cover (adds the small Hebrew marker). */
export function CoverEditionSwitch({
  value,
  onChange,
}: {
  value: Edition;
  onChange: (edition: Edition) => void;
}) {
  return (
    <label className="field">
      <span>Cover edition</span>
      <select onChange={(event) => onChange(event.currentTarget.value as Edition)} value={value}>
        <option value="colour">Book cover</option>
        <option value="colouring">Colouring book cover (adds the colouring marker)</option>
      </select>
    </label>
  );
}
