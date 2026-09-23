"use client";

import { useState, useTransition } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import { resetPasswordAction } from "./actions";

export function ResetPassword({ userId, username }: { userId: number; username: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) {
    return (
      <button type="button" className={buttonClass("ghost", "min-h-9 px-2")} onClick={() => setIsOpen(true)}>
        Reset password
      </button>
    );
  }

  const submit = () =>
    startTransition(async () => {
      const result = await resetPasswordAction(userId, password);
      setMessage(result.ok ? { tone: "ok", text: "Password updated" } : { tone: "error", text: result.message });
      if (result.ok) setPassword("");
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        aria-label={`New password for ${username}`}
        autoComplete="off"
        className={`${inputClass} min-h-9 w-40`}
      />
      <button type="button" disabled={isPending} onClick={submit} className={buttonClass("primary", "min-h-9 px-3")}>
        Save
      </button>
      {message && (
        <span role="status" className={`text-xs ${message.tone === "ok" ? "text-brand-strong" : "text-danger"}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
