// bisiyata dishmaya, leharbot ahava biyisral
export function PrivateTitleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="private-title">Private page title</label>
      <input
        id="private-title"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
      <p className="field__hint">This title is only for organising your pages; it is not printed.</p>
    </div>
  );
}
