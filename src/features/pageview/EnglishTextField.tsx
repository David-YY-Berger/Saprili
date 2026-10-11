// bisiyata dishmaya, leharbot ahava biyisral
export function EnglishTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="english-text">English text</label>
      <textarea
        dir="ltr"
        id="english-text"
        lang="en"
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={5}
        value={value}
      />
    </div>
  );
}
