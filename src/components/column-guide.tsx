type ColumnGuideProps = { title: string; columns: { name: string; note: string }[] };

export function ColumnGuide({ title, columns }: ColumnGuideProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {columns.map((column) => (
          <div key={column.name} className="contents">
            <dt className="font-mono text-brand-strong">{column.name}</dt>
            <dd className="text-muted">{column.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
