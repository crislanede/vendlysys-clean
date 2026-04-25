import type { ButtonHTMLAttributes } from "react";

type DangerButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function DangerButton({
  children,
  className = "",
  ...props
}: DangerButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}