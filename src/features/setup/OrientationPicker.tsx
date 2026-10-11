// bisiyata dishmaya, leharbot ahava biyisral
import { Tooltip } from '@/ui/Tooltip';

export function OrientationPicker() {
  return (
    <fieldset className="field choice-field">
      <legend>Orientation</legend>
      <label>
        <input checked readOnly type="radio" />
        Portrait
      </label>
      <Tooltip content="Not in this version">
        <span>
          <label>
            <input disabled type="radio" />
            Landscape
          </label>
        </span>
      </Tooltip>
    </fieldset>
  );
}
