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
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p
            className="text-sm font-bold uppercase tracking-wide"
            style={{ color: "var(--color-primary)" }}
          >
            {eyebrow}
          </p>
        )}

        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
          {title}
        </h1>

        {description && (
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
