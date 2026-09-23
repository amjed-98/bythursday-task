import Link from "next/link";

type FilterLinksProps = { label: string; options: { value: string; label: string }[]; current: string; hrefFor: (value: string) => string };

export function FilterLinks({ label, options, current, hrefFor }: FilterLinksProps) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === current;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium ${
              isActive ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
