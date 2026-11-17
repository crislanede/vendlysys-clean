type SectionCardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export default function SectionCard({
  title,
  description,
  children,
  action,
}: SectionCardProps) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 md:p-6">
      {(title || description || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>

          {action && <div>{action}</div>}
        </div>
      )}

      {children}
    </section>
  );
}
