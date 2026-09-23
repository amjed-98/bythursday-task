import { inputClass, labelClass } from "@/components/ui";
import type { ClassOption } from "@/server/quizzes";

export type QuizMetaDefaults = {
  title: string;
  classIds: number[];
  timeLimitMinutes: number;
  penaltyPercent: number;
  opensAt: string;
  closesAt: string;
};

type QuizMetaFieldsProps = { classes: ClassOption[]; defaults: QuizMetaDefaults; isPenaltyLocked?: boolean };

export function QuizMetaFields({ classes, defaults, isPenaltyLocked = false }: QuizMetaFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input id="title" name="title" dir="auto" required maxLength={200} defaultValue={defaults.title} className={inputClass} />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={labelClass}>Classes</legend>
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <label
              key={c.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
            >
              <input
                type="checkbox"
                name="classIds"
                value={c.id}
                defaultChecked={defaults.classIds.includes(c.id)}
                className="size-4 accent-[var(--color-brand)]"
              />
              <span className="text-sm font-medium">{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="opensAt" className={labelClass}>
          Opens (Amman time)
        </label>
        <input id="opensAt" name="opensAt" type="datetime-local" required defaultValue={defaults.opensAt} className={inputClass} />
      </div>
      <div>
        <label htmlFor="closesAt" className={labelClass}>
          Closes (Amman time)
        </label>
        <input id="closesAt" name="closesAt" type="datetime-local" required defaultValue={defaults.closesAt} className={inputClass} />
      </div>
      <div>
        <label htmlFor="timeLimitMinutes" className={labelClass}>
          Time limit (minutes)
        </label>
        <input
          id="timeLimitMinutes"
          name="timeLimitMinutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={300}
          required
          defaultValue={defaults.timeLimitMinutes}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="penaltyPercent" className={labelClass}>
          Penalty per wrong answer (% of question points)
        </label>
        <input
          id="penaltyPercent"
          name="penaltyPercent"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          required
          readOnly={isPenaltyLocked}
          defaultValue={defaults.penaltyPercent}
          className={`${inputClass} read-only:bg-canvas read-only:text-muted`}
        />
      </div>
    </div>
  );
}
