// bisiyata dishmaya, leharbot ahava biyisral
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span aria-label={label} className="spinner" role="status">
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
