import type { ComponentProps } from "react";

export function Input({
  label,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {/* text-base (16px) stops iOS Safari from zooming in on focus. */}
      <input
        id={id}
        className={`border-line bg-surface focus:border-brand min-h-12 rounded-xl border px-4 text-base outline-none ${className}`}
        {...props}
      />
    </label>
  );
}
