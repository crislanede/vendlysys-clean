import type { ButtonHTMLAttributes } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({
  children,
  className = "",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: "var(--color-primary)",
        ...(props.style || {}),
      }}
    >
      {children}
    </button>
  );
}
