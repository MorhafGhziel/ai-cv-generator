"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Vocabulary crossing from the posting into the CV.
 *
 * Each chip travels along a curve rather than a straight line — the path is
 * what makes it read as "moved across" instead of "faded in over there".
 */

const TERMS = [
  { label: "CI/CD", from: 0, to: 0 },
  { label: "microservices", from: 1, to: 1 },
  { label: "observability", from: 2, to: 2 },
  { label: "Terraform", from: 3, to: 3 },
  { label: "on-call", from: 4, to: 4 },
];

const ROW_H = 44;

export default function KeywordFlow({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className={`relative ${className}`} role="img" aria-label="Terms from the job posting appearing in the tailored CV">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-6">
        {/* ------------------------------------------------ Job posting */}
        <div className="rounded-[18px] border border-line bg-surface p-4 sm:p-5">
          <p className="eyebrow mb-3.5">The posting asks for</p>
          <ul className="space-y-2">
            {TERMS.map((term, i) => (
              <li key={term.label} style={{ height: ROW_H - 20 }} className="flex items-center">
                <motion.span
                  className="inline-flex items-center rounded-full border border-line-strong bg-sunk px-2.5 py-1 text-[12px] font-medium text-ink-muted"
                  initial={reduced ? undefined : { opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.09, duration: 0.4 }}
                >
                  {term.label}
                </motion.span>
              </li>
            ))}
          </ul>
        </div>

        {/* ------------------------------------------------ The crossing */}
        <div className="relative w-10 self-stretch sm:w-16" aria-hidden="true">
          <svg
            viewBox="0 0 64 240"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            fill="none"
          >
            {TERMS.map((term, i) => {
              const y = 40 + i * ROW_H;
              return (
                <motion.path
                  key={term.label}
                  d={`M0 ${y} C 26 ${y}, 38 ${y}, 64 ${y}`}
                  stroke="var(--color-flame)"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.45 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.55, ease: "easeOut" }}
                />
              );
            })}
          </svg>

          {/* Travelling dots */}
          {!reduced &&
            TERMS.map((term, i) => (
              <motion.span
                key={term.label}
                className="absolute left-0 h-2 w-2 rounded-full bg-flame"
                style={{ top: `${(40 + i * ROW_H) / 240 * 100}%`, marginTop: -4 }}
                initial={{ x: 0, opacity: 0 }}
                whileInView={{ x: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  delay: 0.6 + i * 0.12,
                  duration: 0.7,
                  times: [0, 0.15, 0.8, 1],
                  ease: "easeInOut",
                }}
              />
            ))}
        </div>

        {/* ------------------------------------------------ Tailored CV */}
        <div className="rounded-[18px] border border-flame/30 bg-flame-soft/40 p-4 sm:p-5">
          <p className="eyebrow mb-3.5 text-flame-ink">Now in your CV</p>
          <ul className="space-y-2">
            {TERMS.map((term, i) => (
              <li key={term.label} style={{ height: ROW_H - 20 }} className="flex items-center">
                <motion.span
                  className="inline-flex items-center gap-1.5 rounded-full bg-flame px-2.5 py-1 text-[12px] font-medium text-white"
                  initial={reduced ? undefined : { opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    delay: 1.2 + i * 0.12,
                    duration: 0.42,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                >
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                  {term.label}
                </motion.span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 text-[12.5px] leading-relaxed text-ink-faint">
        Only terms your history already supports cross over. Anything you haven&rsquo;t done stays
        on the left.
      </p>
    </div>
  );
}
