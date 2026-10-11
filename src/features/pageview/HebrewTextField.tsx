// bisiyata dishmaya, leharbot ahava biyisral
export function HebrewTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="hebrew-text">Hebrew text</label>
      <textarea
        dir="rtl"
        id="hebrew-text"
        lang="he"
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={5}
        value={value}
      />
    </div>
  );
}
