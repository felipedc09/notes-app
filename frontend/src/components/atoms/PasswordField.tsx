"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

/**
 * FR-03: an eye icon appears once the field has text and toggles the
 * password between masked and visible.
 */
export function PasswordField({
  label,
  id,
  name,
  className = "",
  onChange,
  defaultValue,
  value,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [hasValue, setHasValue] = useState(
    Boolean((value ?? defaultValue ?? "").toString().length),
  );
  const fieldId = id ?? name;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setHasValue(event.target.value.length > 0);
    onChange?.(event);
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={fieldId}
        className="text-sm font-bold text-[var(--color-heading)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={`w-full rounded-[var(--radius-card)] border border-[var(--color-accent)] px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${className}`}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-[var(--color-accent)]"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a17.7 17.7 0 0 1-3.16 4.24M6.6 6.6C3.9 8.36 2 11 2 11s4 7 11 7a10.9 10.9 0 0 0 4.24-.85"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
