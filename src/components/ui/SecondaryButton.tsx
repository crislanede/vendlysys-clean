import type { ButtonHTMLAttributes } from "react";

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function SecondaryButton({
  children,
  className = "",
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: "transparent",
        border: "1px solid #cbd5e1",
        color: "#334155",
        ...(props.style || {}),
      }}
    >
      {children}
    </button>
  );
}