import type { RowError } from "@/domain/import/validate";

type ImportFeedbackProps = { errors: RowError[]; message: string | null; success: string | null };

export function ImportFeedback({ errors, message, success }: ImportFeedbackProps) {
  if (success) {
    return (
      <p role="status" className="rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand-strong">
        {success}
      </p>
    );
  }
  if (message) {
    return (
      <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
        {message}
      </p>
    );
  }
  if (errors.length === 0) return null;

  return (
    <div role="alert" className="overflow-hidden rounded-xl border border-danger/30">
      <p className="bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
        Nothing was imported. Fix {errors.length === 1 ? "this row" : `these ${errors.length} rows`} and upload again.
      </p>
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="w-16 px-3 py-2 font-medium">Row</th>
            <th className="px-3 py-2 font-medium">Problem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {errors.map((error, i) => (
            <tr key={i}>
              <td className="px-3 py-2 font-mono">{error.row}</td>
              <td dir="auto" className="break-words px-3 py-2">
                {error.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
