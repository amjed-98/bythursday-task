"use client";

import { useActionState } from "react";
import { ImportFeedback } from "@/components/import-feedback";
import { buttonClass, cardClass, inputClass, labelClass } from "@/components/ui";
import { importUsersAction, type ImportState } from "./actions";

const INITIAL: ImportState = { errors: [], message: null, success: null };

export function ImportUsersForm() {
  const [state, formAction, isPending] = useActionState(importUsersAction, INITIAL);

  return (
    <form action={formAction} className={`${cardClass} space-y-4 p-4 sm:p-6`}>
      <fieldset>
        <legend className={labelClass}>What are you importing?</legend>
        <div className="flex gap-2">
          {(["students", "teachers"] as const).map((kind) => (
            <label
              key={kind}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line capitalize has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
            >
              <input type="radio" name="kind" value={kind} defaultChecked={kind === "students"} className="accent-[var(--color-brand)]" />
              {kind}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="file" className={labelClass}>
          Spreadsheet (.xlsx or .csv)
        </label>
        <input id="file" name="file" type="file" required accept=".xlsx,.csv" className={`${inputClass} py-2`} />
      </div>
      <button type="submit" disabled={isPending} className={buttonClass("primary", "w-full sm:w-auto")}>
        {isPending ? "Importing…" : "Import"}
      </button>
      <ImportFeedback {...state} />
    </form>
  );
}
