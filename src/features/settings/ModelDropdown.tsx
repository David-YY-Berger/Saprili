// bisiyata dishmaya, leharbot ahava biyisral
import { imageModels } from '@/ai/modelCatalog';

export function ModelDropdown({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const availableModels = imageModels.filter((model) => model.imageCapable);
  return (
    <div className="field">
      <label htmlFor="model-id">Image model</label>
      <select
        id="model-id"
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ''}
      >
        <option value="">Choose an image model</option>
        {availableModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>
      <p className="field__hint">
        The provider will be chosen after the image-quality tests. This placeholder can be replaced
        later.
      </p>
    </div>
  );
}
