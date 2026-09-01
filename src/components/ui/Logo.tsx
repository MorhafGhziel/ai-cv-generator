import Link from "next/link";

/**
 * The mark: a sheet of paper with a folded corner, and one orange spark at the
 * fold — the CV, and the moment it becomes the right CV.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="var(--color-ink)" />
      <path
        d="M11 8.5h6.4l4.1 4.3v10.7a1.6 1.6 0 0 1-1.6 1.6h-8.9a1.6 1.6 0 0 1-1.6-1.6V10.1a1.6 1.6 0 0 1 1.6-1.6Z"
        fill="var(--color-paper)"
      />
      {/* The folded corner, lifted away from the sheet. */}
      <path d="M17.4 8.5v3.1a1.2 1.2 0 0 0 1.2 1.2h2.9Z" fill="var(--color-line-strong)" />
      <path d="M12.6 16.4h6.8M12.6 19.4h4.3" stroke="var(--color-ink-faint)" strokeWidth="1.5" strokeLinecap="round" />
      {/* The spark. */}
      <path
        d="m21.6 17.4.85 2.15L24.6 20.4l-2.15.85-.85 2.15-.85-2.15-2.15-.85 2.15-.85Z"
        fill="var(--color-flame)"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  size = 32,
  showWordmark = true,
  className = "",
}: {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 rounded-lg ${className}`}
      aria-label="Craftly — home"
    >
      <span className="transition-transform duration-300 ease-[var(--ease-back)] group-hover:-rotate-6">
        <LogoMark size={size} />
      </span>
      {showWordmark && (
        <span className="font-display text-[19px] font-semibold tracking-[-0.03em] text-ink">
          craftly
        </span>
      )}
    </Link>
  );
}
