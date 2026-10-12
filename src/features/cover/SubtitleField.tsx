// bisiyata dishmaya, leharbot ahava biyisral
export function SubtitleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="cover-subtitle">Subtitle (Hebrew)</label>
      <textarea
        className="field__textarea--compact"
        dir="rtl"
        id="cover-subtitle"
        lang="he"
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={2}
        value={value}
      />
      <span className="field__hint">Press Enter to split the subtitle across two lines.</span>
    </div>
  );
}
