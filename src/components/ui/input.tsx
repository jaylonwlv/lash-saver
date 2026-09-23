import type { ComponentProps, ReactNode } from "react";

const control =
  "min-h-12 w-full rounded-xl border bg-surface px-4 text-base outline-none focus:border-brand aria-invalid:border-danger";

type FieldProps = {
  label: string;
  id: string;
  /** Validation message shown under the field. */
  error?: string;
  /** Help text shown under the field when there is no error. */
  hint?: ReactNode;
};

function Field({ label, id, error, hint, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="text-danger text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function a11y(id: string, error?: string, hint?: ReactNode) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-message` : undefined,
  } as const;
}

// text-base (16px) on every control stops iOS Safari from zooming in on focus.

export function Input({
  label,
  id,
  error,
  hint,
  className = "",
  ...props
}: ComponentProps<"input"> & FieldProps) {
  return (
    <Field label={label} id={id} error={error} hint={hint}>
      <input
        {...a11y(id, error, hint)}
        className={`${control} border-line ${className}`}
        {...props}
      />
    </Field>
  );
}

export function Textarea({
  label,
  id,
  error,
  hint,
  className = "",
  ...props
}: ComponentProps<"textarea"> & FieldProps) {
  return (
    <Field label={label} id={id} error={error} hint={hint}>
      <textarea
        {...a11y(id, error, hint)}
        className={`${control} border-line min-h-28 py-3 ${className}`}
        {...props}
      />
    </Field>
  );
}

/**
 * React resets forms after a Server Action, and an uncontrolled <select> resets to
 * the value it was first rendered with. Keying on defaultValue remounts it with the
 * submitted value, so a failed submit keeps the tech's choice.
 */
export function Select({
  label,
  id,
  error,
  hint,
  className = "",
  ...props
}: ComponentProps<"select"> & FieldProps) {
  return (
    <Field label={label} id={id} error={error} hint={hint}>
      <select
        key={String(props.defaultValue)}
        {...a11y(id, error, hint)}
        className={`${control} border-line appearance-none ${className}`}
        {...props}
      />
    </Field>
  );
}
