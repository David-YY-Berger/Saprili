// bisiyata dishmaya, leharbot ahava biyisral
import { TRIM_PRESETS } from '@/domain/constants';
import type { TrimPresetId } from '@/domain/book';

export function TrimSizePicker({
  value,
  onChange,
}: {
  value: TrimPresetId;
  onChange: (value: TrimPresetId) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="trim-size">Book size</label>
      <select
        id="trim-size"
        onChange={(event) => {
          const preset = TRIM_PRESETS.find((item) => item.id === event.currentTarget.value);
          if (preset) onChange(preset.id);
        }}
        value={value}
      >
        {TRIM_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
