export function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
      <p className="font-semibold">Please fix the following:</p>
      <ul className="mt-1 list-disc space-y-0.5 ps-5">
        {errors.map((error, i) => (
          <li key={i} dir="auto">
            {error}
          </li>
        ))}
      </ul>
    </div>
  );
}
