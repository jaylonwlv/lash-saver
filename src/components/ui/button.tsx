import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";

const base =
  "press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 sm:w-auto";

const variants: Record<Variant, string> = {
  primary:
    "bg-action text-action-foreground shadow-[0_6px_16px_-8px_var(--color-action)] active:opacity-90",
  secondary: "border border-line bg-surface text-foreground active:bg-background",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
