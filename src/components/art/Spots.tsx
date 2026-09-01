/**
 * Spot illustrations: flat shapes, 2px ink outline, cream fills, one accent
 * each. Used for the three landing steps and for empty states, so a screen
 * with nothing in it still has something to look at.
 */

interface SpotProps {
  size?: number;
  className?: string;
}

const INK = "var(--color-ink)";
const PAPER = "var(--color-surface)";
const SOFT = "var(--color-sunk)";
const LINE = "var(--color-line-strong)";

function Frame({ size, className, children }: SpotProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size ?? 112}
      height={size ?? 112}
      viewBox="0 0 112 112"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Step 1 — paste the posting. A clipboard with a text cursor. */
export function PasteSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <rect x="22" y="18" width="62" height="80" rx="10" fill={PAPER} stroke={INK} strokeWidth="2.5" />
      <rect x="40" y="10" width="26" height="16" rx="6" fill="var(--color-flame)" stroke={INK} strokeWidth="2.5" />
      <path d="M34 44h38M34 56h30M34 68h34" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M34 80h14" stroke="var(--color-flame)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M52 74v12" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M88 34c3.4 1.8 5 4 5.6 7.6"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Frame>
  );
}

/** Step 2 — the rewrite. A pen crossing a sheet, leaving an orange line. */
export function TailorSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <rect x="16" y="18" width="62" height="78" rx="10" fill={PAPER} stroke={INK} strokeWidth="2.5" />
      <path d="M28 38h30M28 50h38" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M28 62h34" stroke="var(--color-flame)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M28 74h22" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" />

      {/* Pen, angled across the lower-right corner */}
      <g transform="rotate(38 78 68)">
        <rect x="70" y="34" width="16" height="46" rx="6" fill="var(--color-flame)" stroke={INK} strokeWidth="2.5" />
        <path d="M70 68h16l-8 14Z" fill={PAPER} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M70 46h16" stroke={INK} strokeWidth="2" />
      </g>

      <path
        d="M92 20c.9 4.2 2.8 6.4 6.6 7.8-3.8 1.4-5.7 3.6-6.6 7.8-.9-4.2-2.8-6.4-6.6-7.8 3.8-1.4 5.7-3.6 6.6-7.8Z"
        fill="var(--color-sun)"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

/** Step 3 — download and apply. A sheet dropping into a tray. */
export function SendSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <rect x="30" y="8" width="52" height="58" rx="9" fill={PAPER} stroke={INK} strokeWidth="2.5" />
      <path d="M42 26h28M42 38h20" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M56 46v18" stroke="var(--color-flame)" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="m47 56 9 9 9-9"
        stroke="var(--color-flame)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 72v16a8 8 0 0 0 8 8h60a8 8 0 0 0 8-8V72"
        fill={SOFT}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 78h20l4 8h28l4-8h20" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" fill="none" />
    </Frame>
  );
}

/** Empty state — no applications yet. A folder with one sheet peeking out. */
export function EmptyDocsSpot({ size = 116, className = "" }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 116 116" fill="none" className={className} aria-hidden="true">
      <g transform="rotate(-7 52 56)">
        <rect x="34" y="18" width="48" height="60" rx="8" fill={PAPER} stroke={INK} strokeWidth="2.5" />
        <path d="M44 36h28M44 47h22M44 58h26" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      </g>
      <path
        d="M14 52h30l7 9h51a6 6 0 0 1 6 6v27a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V58a6 6 0 0 1 6-6Z"
        fill={SOFT}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M96 22c1 4.6 3.1 7 7.2 8.5-4.1 1.5-6.2 3.9-7.2 8.5-1-4.6-3.1-7-7.2-8.5 4.1-1.5 6.2-3.9 7.2-8.5Z"
        fill="var(--color-flame)"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Empty state — no answers yet. Two speech bubbles. */
export function EmptyChatSpot({ size = 116, className = "" }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 116 116" fill="none" className={className} aria-hidden="true">
      <path
        d="M18 26h58a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H42l-16 12V72h-8a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M28 42h38M28 55h24" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M62 56h34a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H82l-11 9v-9h-9a6 6 0 0 1-6-6V62a6 6 0 0 1 6-6Z"
        fill="var(--color-flame-soft)"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M70 70h20M70 80h13" stroke="var(--color-flame)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Onboarding — drop a PDF here. */
export function UploadSpot({ size = 108, className = "" }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" fill="none" className={className} aria-hidden="true">
      <rect
        x="24"
        y="26"
        width="64"
        height="76"
        rx="10"
        fill={PAPER}
        stroke={INK}
        strokeWidth="2.5"
      />
      <path d="M36 62h40M36 74h28M36 86h32" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="36" y="40" width="30" height="10" rx="5" fill="var(--color-flame-soft)" stroke="var(--color-flame)" strokeWidth="2" />
      <g>
        <path d="M56 6v22" stroke="var(--color-flame)" strokeWidth="4" strokeLinecap="round" />
        <path
          d="m46 15 10-10 10 10"
          stroke="var(--color-flame)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** Sign-in — a key turning a document into an account. */
export function WelcomeSpot({ size = 104, className = "" }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" fill="none" className={className} aria-hidden="true">
      <g transform="rotate(-6 56 60)">
        <rect x="26" y="20" width="60" height="72" rx="10" fill={PAPER} stroke={INK} strokeWidth="2.5" />
        <circle cx="56" cy="44" r="11" fill="var(--color-flame-soft)" stroke={INK} strokeWidth="2.5" />
        <path d="M38 74a18 18 0 0 1 36 0" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M38 74h36" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <path
        d="M92 14c1.1 5 3.4 7.6 7.9 9.3-4.5 1.7-6.8 4.3-7.9 9.3-1.1-5-3.4-7.6-7.9-9.3 4.5-1.7 6.8-4.3 7.9-9.3Z"
        fill="var(--color-sun)"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="90" r="6" fill="var(--color-grape)" stroke={INK} strokeWidth="2" />
    </svg>
  );
}
