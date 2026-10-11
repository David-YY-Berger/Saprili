// bisiyata dishmaya, leharbot ahava biyisral
import type { JobSwitches as Switches } from './jobPlan';

export function JobSwitches({
  value,
  disabled,
  onChange,
}: {
  value: Switches;
  disabled: boolean;
  onChange: (next: Switches) => void;
}) {
  const row = (
    key: keyof Switches,
    label: string,
    overwriteLabel: string,
  ) => (
    <div className="job-switch">
      <label>
        <input
          checked={value[key].enabled}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, [key]: { ...value[key], enabled: event.target.checked } })
          }
          type="checkbox"
        />{' '}
        {label}
      </label>
      <label className="job-switch__overwrite">
        <input
          checked={value[key].overwrite}
          disabled={disabled || !value[key].enabled}
          onChange={(event) =>
            onChange({ ...value, [key]: { ...value[key], overwrite: event.target.checked } })
          }
          type="checkbox"
        />{' '}
        {overwriteLabel}
      </label>
    </div>
  );
  return (
    <fieldset className="job-switches" disabled={disabled}>
      <legend>What to make</legend>
      {row('illustrations', 'Illustrations', 'Overwrite existing')}
      {row('colouring', 'Colouring pages', 'Overwrite existing')}
    </fieldset>
  );
}
