// bisiyata dishmaya, leharbot ahava biyisral
export function TitleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>Title (Hebrew)</span>
      <input
        dir="rtl"
        lang="he"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </label>
  );
}
