"use client";

import { useId, useState } from "react";

interface PasswordFieldProps {
  name: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
}

export function PasswordField({ name, label, autoComplete, required, error }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const errorId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5 pe-11 text-slate-100 outline-none transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "הסתר סיסמה" : "הצג סיסמה"}
          aria-pressed={visible}
          className="absolute inset-y-0 end-2 flex items-center px-1 text-slate-400 transition-colors hover:text-slate-200"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M1 10 C3 5 7 3 10 3 C13 3 17 5 19 10 C17 15 13 17 10 17 C7 17 3 15 1 10 Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M2 2 L18 18 M1 10 C3 5 7 3 10 3 C11.5 3 13 3.5 14.3 4.4 M17.6 7.3 C18.4 8.1 19 9 19 10 C17 15 13 17 10 17 C8.7 17 7.4 16.6 6.2 15.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M8.1 8.1 A3 3 0 0 0 11.9 11.9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
