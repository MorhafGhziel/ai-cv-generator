"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * A screening form filling itself in, one field at a time.
 *
 * The answers are deliberately unimpressive — a number, two words, one plain
 * sentence. That is the claim being made: these come back sounding like a
 * person typed them in a hurry, not like a cover letter.
 */

const FIELDS = [
  { q: "Years of experience with Go?", a: "6" },
  { q: "Expected salary?", a: "£62,000 – £70,000" },
  { q: "Notice period?", a: "One month" },
  { q: "Why this role?", a: "I've spent the last three years on payments infrastructure and this is the same problem at a bigger scale. Happy to talk through the details." },
];

const STEP_MS = 900;

export default function AnswerDemo({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const [filled, setFilled] = useState(reduced ? FIELDS.length : 0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || reduced) return;
    if (filled >= FIELDS.length) return;
    const id = setTimeout(() => setFilled((n) => n + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [started, filled, reduced]);

  return (
    <motion.div
      onViewportEnter={() => setStarted(true)}
      viewport={{ once: true, margin: "-120px" }}
      className={`overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-card)] ${className}`}
    >
      {/* Browser-ish chrome, so it reads as "their form", not "our UI" */}
      <div className="flex items-center gap-2 border-b border-line bg-sunk/60 px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          {["#e8695f", "#f0be4f", "#61c554"].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          ))}
        </span>
        <span className="ml-2 truncate font-mono text-[11px] text-ink-faint">
          careers.example.com/apply
        </span>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {FIELDS.map((field, i) => {
          const done = i < filled;
          return (
            <div key={field.q}>
              <p className="mb-1.5 text-[12.5px] font-medium text-ink-muted">{field.q}</p>

              <div
                className={`relative min-h-[42px] rounded-[10px] border px-3 py-2.5 transition-colors duration-300 ${
                  done ? "border-line bg-sunk/70" : "border-dashed border-line-strong bg-transparent"
                }`}
              >
                {done ? (
                  <motion.p
                    initial={reduced ? undefined : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="pr-7 text-[13.5px] leading-[1.6] text-ink-soft"
                  >
                    {field.a}
                  </motion.p>
                ) : (
                  <span className="text-[13.5px] text-ink-faint">—</span>
                )}

                {done && (
                  <motion.span
                    className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-mint/15 text-mint"
                    initial={reduced ? undefined : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7" />
                    </svg>
                  </motion.span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
