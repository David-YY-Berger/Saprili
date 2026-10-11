// bisiyata dishmaya, leharbot ahava biyisral
import { useId } from 'react';

export function CsvFilePicker({
  disabled,
  onFile,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  return (
    <div className="field">
      <label htmlFor={inputId}>Choose your CSV file</label>
      <input
        accept=".csv,text/csv"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFile(file);
          event.currentTarget.value = '';
        }}
        type="file"
      />
      <p className="field__hint">Use columns for title, English text and Hebrew text.</p>
    </div>
  );
}
