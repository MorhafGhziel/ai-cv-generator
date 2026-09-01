/**
 * Flat decorative shapes with a 2px ink outline. They carry no meaning — always
 * `aria-hidden`, never a link, never the only way to understand something.
 */

interface StickerProps {
  size?: number;
  className?: string;
}

export function StarSticker({ size = 36, className = "" }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="m24 5 5.6 12.4L43 19l-9.5 9.4L36 42l-12-6.6L12 42l2.5-13.6L5 19l13.4-1.6Z"
        fill="var(--color-grape)"
        stroke="var(--color-ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A curved, slightly wobbly arrow for pointing a caption at a thing. */
export function HandArrow({
  className = "",
  flip = false,
  width = 96,
}: {
  className?: string;
  flip?: boolean;
  width?: number;
}) {
  return (
    <svg
      width={width}
      height={width * 0.6}
      viewBox="0 0 96 58"
      fill="none"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
    >
      <path
        d="M4 8c14 3 27 9 38 19 6 5.5 10 12 12 21"
        stroke="var(--color-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M46 40.5c3 3.5 5.6 6 8 7.5M62 42c-2.6 2-4.6 4.2-8 6"
        stroke="var(--color-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Hand-drawn underline for one emphasised word, at display sizes. */
export function MarkerStroke({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 14"
      preserveAspectRatio="none"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 9.2c38-4.4 78-6.4 118-5.6 39 .8 78 4 116 8.4"
        stroke="var(--color-flame)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
