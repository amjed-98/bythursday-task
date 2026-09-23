"use client";

import { useState } from "react";
import { buttonClass, cardClass, inputClass, labelClass } from "@/components/ui";
import type { QuestionInput } from "@/domain/quiz-input";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
const DEFAULT_POINTS = 1;

const blankQuestion = (): QuestionInput => ({ text: "", points: DEFAULT_POINTS, options: ["", "", "", ""], correctIndex: 0 });

type QuestionsEditorProps = { initial: QuestionInput[]; isLocked: boolean };

export function QuestionsEditor({ initial, isLocked }: QuestionsEditorProps) {
  const [questions, setQuestions] = useState<QuestionInput[]>(initial.length > 0 ? initial : [blankQuestion()]);

  const update = (index: number, patch: Partial<QuestionInput>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const updateOption = (index: number, optionIndex: number, text: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, options: q.options.map((o, j) => (j === optionIndex ? text : o)) as QuestionInput["options"] } : q,
      ),
    );

  const move = (index: number, offset: -1 | 1) =>
    setQuestions((prev) => {
      const target = index + offset;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  return (
    <div className="space-y-4">
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
      {isLocked && (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          Students have started this quiz, so questions and the penalty are locked. You can still change the title, classes and schedule.
        </p>
      )}
      <fieldset disabled={isLocked} className="space-y-4">
        {questions.map((question, index) => (
          <div key={index} className={`${cardClass} space-y-3 p-4`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Question {index + 1}</h3>
              <div className="flex gap-1">
                <button type="button" className={buttonClass("ghost", "min-h-9 px-2")} onClick={() => move(index, -1)} aria-label={`Move question ${index + 1} up`}>
                  ↑
                </button>
                <button type="button" className={buttonClass("ghost", "min-h-9 px-2")} onClick={() => move(index, 1)} aria-label={`Move question ${index + 1} down`}>
                  ↓
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost", "min-h-9 px-2 text-danger")}
                  disabled={questions.length === 1}
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            </div>
            <div>
              <label htmlFor={`q-${index}-text`} className={labelClass}>
                Question text
              </label>
              <textarea
                id={`q-${index}-text`}
                dir="auto"
                rows={2}
                value={question.text}
                onChange={(e) => update(index, { text: e.target.value })}
                className={`${inputClass} py-2`}
              />
            </div>
            <div className="max-w-32">
              <label htmlFor={`q-${index}-points`} className={labelClass}>
                Points
              </label>
              <input
                id={`q-${index}-points`}
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={question.points}
                onChange={(e) => update(index, { points: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className={labelClass}>Options (select the correct one)</legend>
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${index}-correct`}
                    checked={question.correctIndex === optionIndex}
                    onChange={() => update(index, { correctIndex: optionIndex })}
                    aria-label={`Option ${OPTION_LETTERS[optionIndex]} is correct`}
                    className="size-5 shrink-0 accent-[var(--color-brand)]"
                  />
                  <span className="w-4 text-sm font-bold text-muted">{OPTION_LETTERS[optionIndex]}</span>
                  <input
                    dir="auto"
                    value={option}
                    onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                    aria-label={`Option ${OPTION_LETTERS[optionIndex]}`}
                    className={inputClass}
                  />
                </div>
              ))}
            </fieldset>
          </div>
        ))}
        <button type="button" className={buttonClass("secondary", "w-full")} onClick={() => setQuestions((prev) => [...prev, blankQuestion()])}>
          + Add question
        </button>
      </fieldset>
    </div>
  );
}
