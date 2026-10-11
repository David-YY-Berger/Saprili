// bisiyata dishmaya, leharbot ahava biyisral
export function RetryPanel({
  customPrompt,
  onCustomPromptChange,
  useEditMode,
  onEditModeChange,
  editSupported,
}: {
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  useEditMode: boolean;
  onEditModeChange: (value: boolean) => void;
  editSupported: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor="illustration-custom-prompt">Optional retry instruction</label>
      <textarea
        id="illustration-custom-prompt"
        onChange={(event) => onCustomPromptChange(event.target.value)}
        rows={3}
        value={customPrompt}
      />
      <label className="field__check">
        <input
          checked={useEditMode}
          disabled={!editSupported}
          onChange={(event) => onEditModeChange(event.target.checked)}
          type="checkbox"
        />
        Edit the current illustration
      </label>
      {!editSupported && <p className="field__hint">The selected model does not support editing.</p>}
    </div>
  );
}
