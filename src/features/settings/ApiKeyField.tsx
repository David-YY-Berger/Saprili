// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import { Button } from '@/ui/Button';

export function ApiKeyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor="api-key">Gemini API key</label>
      <div className="api-key-control">
        <input
          autoComplete="off"
          id="api-key"
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <Button
          aria-controls="api-key"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          variant="secondary"
        >
          {visible ? 'Hide key' : 'Show key'}
        </Button>
      </div>
      <p className="field__hint">Your key stays in this browser and is never added to a URL.</p>
    </div>
  );
}
