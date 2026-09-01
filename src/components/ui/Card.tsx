import type { HTMLAttributes, ReactNode } from "react";

/**
 * A white sheet on the cream canvas. Separation comes from a hairline border;
 * the shadow is close to invisible and exists only to lift the sheet off the
 * paper, never to signal importance.
 */
export function Card({
  children,
  className = "",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean; children: ReactNode }) {
  return (
    <div
      className={
        "rounded-[20px] border border-line bg-surface shadow-[var(--shadow-card)] " +
        (interactive
          ? "transition-[box-shadow,border-color,transform] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lift)] "
          : "") +
        className
      }
      {...props}
    >
      {children}
    </div>
  );
}

/** Small pill. `tone` is presentational only. */
export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "outline";
  className?: string;
}) {
  const tones = {
    neutral: "bg-sunk text-ink-muted",
    accent: "bg-flame-soft text-flame-ink",
    outline: "border border-line text-ink-muted",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
