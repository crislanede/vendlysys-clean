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
      className={`rounded-2xl px-5 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: "transparent",
        border: "2px solid var(--color-secondary)",
        color: "var(--color-secondary)",
        ...(props.style || {}),
      }}
    >
      {children}
    </button>
  );
}