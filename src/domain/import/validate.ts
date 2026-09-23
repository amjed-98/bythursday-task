import type { RawRow } from "./parse-file";
import type { ImportSpec } from "./schemas";

export type RowError = { row: number; message: string };
export type ValidationResult<T> = { ok: true; rows: T[] } | { ok: false; errors: RowError[] };

export const MAX_IMPORT_ROWS = 2000;
const HEADER_ROW = 1;

function missingColumns(rows: RawRow[], required: readonly string[]): RowError[] {
  const present = new Set(Object.keys(rows[0]?.values ?? {}));
  return required.filter((c) => !present.has(c)).map((c) => ({ row: HEADER_ROW, message: `Missing column: ${c}` }));
}

/** All-or-nothing: returns every problem found so the teacher can fix the file in one go. */
export function validateRows<T>(rows: RawRow[], spec: ImportSpec<T>): ValidationResult<T> {
  if (rows.length === 0) return { ok: false, errors: [{ row: HEADER_ROW, message: "The file has no data rows" }] };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, errors: [{ row: HEADER_ROW, message: `The file has more than ${MAX_IMPORT_ROWS} rows` }] };
  }
  const headerErrors = missingColumns(rows, spec.requiredColumns);
  if (headerErrors.length > 0) return { ok: false, errors: headerErrors };

  const errors: RowError[] = [];
  const parsed: T[] = [];
  const firstSeen = new Map<string, number>();

  for (const { rowNumber, values } of rows) {
    const result = spec.schema.safeParse(values);
    if (!result.success) {
      const message = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      errors.push({ row: rowNumber, message });
      continue;
    }
    if (spec.uniqueKey) {
      const key = spec.uniqueKey.of(result.data);
      const earlier = firstSeen.get(key);
      if (earlier !== undefined) {
        errors.push({ row: rowNumber, message: `Duplicate ${spec.uniqueKey.label} "${key}" (first seen on row ${earlier})` });
        continue;
      }
      firstSeen.set(key, rowNumber);
    }
    parsed.push(result.data);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, rows: parsed };
}
