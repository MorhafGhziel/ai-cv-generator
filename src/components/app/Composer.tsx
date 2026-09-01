"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { SparkIcon } from "@/components/ui/Icons";
import { LIMITS } from "@/lib/cv-data";

/**
 * Generation takes twenty to forty seconds on a free tier. Rather than a bare
 * spinner, the wait is narrated: each line names the stage the model is
 * actually at, so the delay reads as work rather than as a hang.
 */
const STAGES = [
  "Reading the posting…",
  "Picking out what they're really asking for…",
  "Matching it against your experience…",
  "Rewriting your bullets in their language…",
  "Choosing which skills lead…",
  "Typesetting the document…",
  "Almost there — checking it against your other applications…",
];

const MIN_LENGTH = 40;

/**
 * Mounted only while a generation is running, so each run starts at the first
 * stage without an effect having to reset anything.
 */
function StageMessage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Holds on the final line rather than looping, so a long generation
      // never looks stuck in a cycle.
      setIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.p
      key={STAGES[index]}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="text-[13px] text-ink-muted"
      aria-live="polite"
    >
      {STAGES[index]}
    </motion.p>
  );
}

export default function Composer({
  value,
  onChange,
  onGenerate,
  loading,
  disabled,
  disabledReason,
}: {
  value: string;
  onChange: (next: string) => void;
  onGenerate: () => void;
  loading: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const tooShort = value.trim().length > 0 && value.trim().length < MIN_LENGTH;

  return (
    <section className="overflow-hidden rounded-[24px] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-flame-soft text-[20px] text-flame-ink">
            <SparkIcon />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-medium tracking-[-0.025em] text-ink">
              Tailor a CV
            </h1>
            <p className="mt-1 text-[13.5px] leading-[1.6] text-ink-muted">
              Paste the whole job posting — requirements, responsibilities, all of it. The more
              it says, the closer the match.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              // Submitting from the field itself saves a reach for the mouse
              // after a paste, which is the whole interaction here.
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                if (!loading && !disabled && value.trim().length >= MIN_LENGTH) onGenerate();
              }
            }}
            placeholder={
              "Paste the full job description here.\n\nInclude the responsibilities and the requirements list — that's what the rewrite matches against."
            }
            rows={9}
            maxLength={LIMITS.jobDescription}
            disabled={loading}
            aria-label="Job description"
            aside={value.length > 0 ? `${value.length.toLocaleString()} characters` : undefined}
            error={tooShort ? `A bit more, please — at least ${MIN_LENGTH} characters.` : undefined}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button
            size="lg"
            onClick={onGenerate}
            loading={loading}
            disabled={disabled || value.trim().length < MIN_LENGTH}
            icon={!loading ? <SparkIcon className="text-[1.1em]" /> : undefined}
          >
            {loading ? "Working…" : "Tailor my CV"}
          </Button>

          <AnimatePresence mode="wait">
            {loading ? (
              <StageMessage />
            ) : disabled && disabledReason ? (
              <p className="text-[13px] text-ink-muted">{disabledReason}</p>
            ) : (
              <p className="text-[13px] text-ink-faint">
                Usually takes under a minute.
                <span className="ml-2 hidden sm:inline">
                  <kbd className="rounded-[5px] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">
                    ⌘
                  </kbd>
                  <span className="mx-1">+</span>
                  <kbd className="rounded-[5px] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">
                    ↵
                  </kbd>
                </span>
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress rail: indeterminate, but visibly moving. */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 4 }}
            exit={{ height: 0 }}
            className="relative overflow-hidden bg-sunk"
          >
            <motion.span
              className="absolute inset-y-0 w-1/3 bg-flame"
              animate={{ x: ["-100%", "320%"] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
