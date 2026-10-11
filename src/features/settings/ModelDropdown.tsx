// bisiyata dishmaya, leharbot ahava biyisral
import { MODEL_CATALOG } from '@/ai/modelCatalog';

export function ModelDropdown({
  role,
  value,
  onChange,
}: {
  role: 'illustration' | 'colouring';
  value: string;
  onChange: (value: string) => void;
}) {
  const availableModels = MODEL_CATALOG.filter(
    (model) => model.imageCapable && model.roles.includes(role),
  );
  const id = `${role}-model-id`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {role === 'illustration' ? 'Illustration image model' : 'Colouring image model'}
      </label>
      <select
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {availableModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>
      <p className="field__hint">This model uses your Gemini API key.</p>
    </div>
  );
}
