"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Form controls. Inputs are recessed wells on the cream canvas rather than
 * outlined white boxes — the field reads as a place to write on the paper.
 */

const CONTROL =
  "w-full bg-sunk border border-line rounded-[12px] px-3.5 text-[14px] text-ink placeholder:text-ink-faint " +
  "transition-[border-color,background-color,box-shadow] duration-200 " +
  "hover:border-line-strong " +
  "focus:outline-none focus:border-flame focus:bg-surface focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--color-flame)_14%,transparent)] " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

interface LabelledProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Renders to the right of the label — a counter, an optional marker. */
  aside?: ReactNode;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  aside,
  children,
}: LabelledProps & { id: string; children: ReactNode }) {
  return (
    <div className="w-full">
      {(label || aside) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={id} className="text-[13px] font-medium text-ink">
              {label}
            </label>
          )}
          {aside && <span className="text-[11px] text-ink-faint tabular-nums">{aside}</span>}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  aside,
  className = "",
  id: providedId,
  ...props
}: LabelledProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} aside={aside}>
      <input
        id={id}
        className={`${CONTROL} h-11 ${error ? "border-danger" : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  aside,
  className = "",
  id: providedId,
  ...props
}: LabelledProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} aside={aside}>
      <textarea
        id={id}
        className={`${CONTROL} py-3 leading-[1.6] resize-y ${error ? "border-danger" : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  hint,
  error,
  aside,
  className = "",
  id: providedId,
  children,
  ...props
}: LabelledProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} aside={aside}>
      <div className="relative">
        <select
          id={id}
          className={`${CONTROL} h-11 appearance-none pr-10 ${className}`}
          {...props}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      </div>
    </FieldShell>
  );
}

/** A labelled on/off control. Styled as a physical switch, not a checkbox. */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[14px] font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[12.5px] text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-[26px] w-[46px] shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50 ${
          checked ? "bg-flame border-flame-deep" : "bg-sunk-deep border-line-strong"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-250 ease-[var(--ease-back)] ${
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}
