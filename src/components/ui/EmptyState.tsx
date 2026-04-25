type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        !
      </div>

      <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>

      {description && (
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
