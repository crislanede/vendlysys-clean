type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-5 rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm shadow-slate-200/40 sm:px-6">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p
            className="text-sm font-bold uppercase tracking-wide"
            style={{ color: "var(--color-primary)" }}
          >
            {eyebrow}
          </p>
        )}

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto">{action}</div>}
    </div>
  );
}
