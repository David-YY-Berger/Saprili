// bisiyata dishmaya, leharbot ahava biyisral
export function SubtitleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>Subtitle (Hebrew)</span>
      <input
        dir="rtl"
        lang="he"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </label>
  );
}
