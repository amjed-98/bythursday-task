type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong active:bg-brand-strong shadow-sm",
  secondary: "border border-line bg-surface text-ink hover:border-brand hover:text-brand-strong",
  ghost: "text-muted hover:bg-brand-soft hover:text-brand-strong",
  danger: "bg-danger text-white hover:opacity-90",
};

export const buttonClass = (variant: ButtonVariant = "primary", extra = ""): string =>
  `${BASE} ${VARIANTS[variant]} ${extra}`.trim();

export const inputClass =
  "block w-full min-h-11 rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

export const labelClass = "mb-1.5 block text-sm font-medium text-ink";

export const cardClass = "rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)]";
