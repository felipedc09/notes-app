import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({
  label,
  id,
  name,
  className = "",
  ...props
}: TextFieldProps) {
  const fieldId = id ?? name;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={fieldId}
        className="text-sm font-bold text-[var(--color-heading)]"
      >
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        className={`rounded-[var(--radius-card)] border border-[var(--color-accent)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${className}`}
        {...props}
      />
    </div>
  );
}
