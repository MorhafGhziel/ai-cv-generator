"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Forty identical CVs going out; one landing.
 *
 * Animates once on scroll rather than looping — a loop would keep pulling the
 * eye back to a section the reader has already understood and moved past.
 */

const COLUMNS = 8;
const ROWS = 5;
const TOTAL = COLUMNS * ROWS;
/** The one that lands. Off-centre so the grid doesn't read as a target. */
const WINNER = 27;

export default function RejectionGrid({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className={className}>
      <div
        className="grid gap-2 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
        role="img"
        aria-label="Forty near-identical applications; one gets a reply"
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const isWinner = i === WINNER;
          // Diagonal sweep, so the wave reads as movement across the grid.
          const delay = ((i % COLUMNS) + Math.floor(i / COLUMNS)) * 0.045;

          return (
            <motion.div
              key={i}
              className="relative aspect-[3/4] rounded-[5px] border bg-surface"
              style={{ borderColor: "var(--color-line)" }}
              initial={reduced ? undefined : { opacity: 0, y: 10, scale: 0.9 }}
              whileInView={
                reduced
                  ? undefined
                  : isWinner
                    ? { opacity: 1, y: 0, scale: [0.9, 1, 1.14, 1.14] }
                    : { opacity: [0, 1, 1, 0.35], y: 0, scale: 1 }
              }
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: isWinner ? 1.5 : 1.4,
                delay: delay + (isWinner ? 0.9 : 0),
                times: isWinner ? [0, 0.4, 0.72, 1] : [0, 0.35, 0.62, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Page lines */}
              <div className="absolute inset-x-[18%] top-[20%] space-y-[2px]">
                <div
                  className="h-[2px] rounded-full"
                  style={{ background: isWinner ? "var(--color-flame)" : "var(--color-line-strong)" }}
                />
                <div className="h-[2px] rounded-full bg-line-strong opacity-70" />
                <div className="h-[2px] w-2/3 rounded-full bg-line-strong opacity-70" />
              </div>

              {isWinner && (
                <motion.span
                  className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-ink bg-mint"
                  initial={reduced ? undefined : { scale: 0 }}
                  whileInView={reduced ? undefined : { scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: 1.9, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-ink" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.p
        className="mt-6 text-[13px] text-ink-faint"
        initial={reduced ? undefined : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 2.2, duration: 0.5 }}
      >
        Forty applications. One reply. The maths is not the problem — the sameness is.
      </motion.p>
    </div>
  );
}
