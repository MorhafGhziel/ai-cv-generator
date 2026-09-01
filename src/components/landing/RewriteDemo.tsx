"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * The product argument, shown rather than described: one line from a CV,
 * retyped for three different postings, with the borrowed vocabulary lit up.
 *
 * The source line never changes — that is the point. Nothing is invented; only
 * the framing moves.
 */

/** A rewritten line, split so matched vocabulary can be highlighted mid-type. */
type Segment = { text: string; match?: boolean };

const SOURCE =
  "Built the checkout service and moved it off the old monolith. Handled about 40k orders a day.";

const VARIANTS: { role: string; company: string; accent: string; line: Segment[] }[] = [
  {
    role: "Backend Engineer",
    company: "Payments platform",
    accent: "var(--color-flame)",
    line: [
      { text: "Designed and shipped a " },
      { text: "high-throughput payments service", match: true },
      { text: ", migrating checkout off a legacy monolith to " },
      { text: "independently deployable microservices", match: true },
      { text: " handling 40k orders/day." },
    ],
  },
  {
    role: "Data Platform Engineer",
    company: "Analytics team",
    accent: "var(--color-sky)",
    line: [
      { text: "Owned a service processing " },
      { text: "40k transactional events per day", match: true },
      { text: ", decomposing a monolith into components with " },
      { text: "clean data contracts", match: true },
      { text: " between them." },
    ],
  },
  {
    role: "Staff Engineer",
    company: "Platform modernisation",
    accent: "var(--color-grape)",
    line: [
      { text: "Led the " },
      { text: "decomposition of a legacy monolith", match: true },
      { text: ", taking checkout to production as an independent service at " },
      { text: "40k orders/day", match: true },
      { text: " with no customer downtime." },
    ],
  },
];

const TYPE_MS = 14;
const HOLD_MS = 3400;

/** Pairs each segment with its start offset in the concatenated line. */
function withOffsets(segments: Segment[]) {
  let offset = 0;
  return segments.map((segment) => {
    const start = offset;
    offset += segment.text.length;
    return { segment, start };
  });
}

function Line({ segments, revealed }: { segments: Segment[]; revealed: number }) {
  return (
    <>
      {withOffsets(segments).map(({ segment, start }, i) => {
        const visible = segment.text.slice(
          0,
          Math.max(0, Math.min(segment.text.length, revealed - start)),
        );
        if (!visible) return null;

        return segment.match ? (
          <mark key={i} className="rounded-[4px] bg-flame-soft px-0.5 font-medium text-flame-ink">
            {visible}
          </mark>
        ) : (
          <span key={i}>{visible}</span>
        );
      })}
    </>
  );
}

const lengthOf = (segments: Segment[]) =>
  segments.reduce((sum, segment) => sum + segment.text.length, 0);

/**
 * Always mounted fresh per variant (the parent keys it), so typing starts from
 * zero without an effect having to reset anything.
 */
function TypedLine({ segments }: { segments: Segment[] }) {
  const total = lengthOf(segments);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    let current = 0;
    const id = setInterval(() => {
      current += 2;
      setRevealed(current);
      if (current >= total) clearInterval(id);
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [total]);

  return (
    <p className="text-[15px] leading-[1.75] text-ink-soft sm:text-[16px]">
      <Line segments={segments} revealed={revealed} />
      {revealed < total && (
        <motion.span
          className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-flame"
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 0.85, repeat: Infinity }}
        />
      )}
    </p>
  );
}

function StaticLine({ segments }: { segments: Segment[] }) {
  return (
    <p className="text-[15px] leading-[1.75] text-ink-soft sm:text-[16px]">
      <Line segments={segments} revealed={lengthOf(segments)} />
    </p>
  );
}

export default function RewriteDemo() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);

  // Only starts once the block is on screen, so the animation is never already
  // finished by the time it is scrolled to.
  useEffect(() => {
    if (!running || reduced) return;
    const id = setInterval(() => setIndex((current) => (current + 1) % VARIANTS.length), HOLD_MS);
    return () => clearInterval(id);
  }, [running, reduced]);

  const variant = VARIANTS[index];

  return (
    <motion.div
      onViewportEnter={() => setRunning(true)}
      viewport={{ once: true, margin: "-120px" }}
      className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-card)]"
    >
      {/* Source line — deliberately static */}
      <div className="border-b border-line bg-sunk/60 p-6 sm:p-8">
        <p className="eyebrow">What you actually wrote</p>
        <p className="mt-3 text-[15px] leading-[1.75] text-ink-muted sm:text-[16px]">{SOURCE}</p>
      </div>

      {/* Target selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-4 sm:px-8">
        <span className="mr-1 text-[12.5px] text-ink-faint">Applying to</span>
        {VARIANTS.map((item, i) => (
          <button
            key={item.role}
            type="button"
            onClick={() => {
              setIndex(i);
              setRunning(true);
            }}
            className={`relative rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200 ${
              i === index ? "text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {i === index && (
              <motion.span
                layoutId="rewrite-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: item.accent }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{item.role}</span>
          </button>
        ))}
      </div>

      {/* Rewritten line */}
      <div className="min-h-[184px] p-6 sm:min-h-[168px] sm:p-8">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: variant.accent }} />
          <p className="eyebrow">Your CV, for {variant.company}</p>
        </div>

        <div className="mt-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={reduced ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {running && !reduced ? (
                <TypedLine segments={variant.line} />
              ) : (
                <StaticLine segments={variant.line} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="border-t border-line bg-sunk/40 px-6 py-3.5 text-[12.5px] text-ink-faint sm:px-8">
        Same service. Same 40k orders. Same year. Only the words the reader is scanning for
        changed.
      </p>
    </motion.div>
  );
}
