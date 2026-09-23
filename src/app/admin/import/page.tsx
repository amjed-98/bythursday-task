import { ColumnGuide } from "@/components/column-guide";
import { requireActor } from "@/lib/session";
import { ImportUsersForm } from "./import-users-form";

const STUDENT_COLUMNS = [
  { name: "username", note: "Login name. Letters, digits, . - _" },
  { name: "password", note: "Required for new students. Leave blank to keep an existing password." },
  { name: "full_name", note: "Name as written (Arabic is fine)" },
  { name: "full_name_latin", note: "Optional transliteration" },
  { name: "class", note: "e.g. 10A. New classes are created automatically." },
];

const TEACHER_COLUMNS = [
  { name: "username", note: "Login name" },
  { name: "password", note: "Required for new teachers" },
  { name: "full_name", note: "Name as written" },
];

export default async function AdminImportPage() {
  await requireActor(["admin"]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import users</h1>
        <p className="mt-1 text-sm text-muted">
          The first row must be the column headers. Existing usernames are updated, new ones are created. If any row has a problem, nothing is saved.
        </p>
      </div>
      <ImportUsersForm />
      <div className="grid gap-4 sm:grid-cols-2">
        <ColumnGuide title="Student columns" columns={STUDENT_COLUMNS} />
        <ColumnGuide title="Teacher columns" columns={TEACHER_COLUMNS} />
      </div>
    </div>
  );
}
