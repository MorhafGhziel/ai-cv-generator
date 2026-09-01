"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const QUESTIONS = [
  {
    q: "Does it make things up?",
    a: "No. It reframes what you already wrote — the same jobs, the same dates, the same degree — in the vocabulary the posting uses. It is explicitly instructed never to invent an employer, a qualification, or a technology with no basis anywhere in your history. If a posting asks for something you have never done, the CV will not claim it.",
  },
  {
    q: "Is this actually free?",
    a: "Yes, and there is no card involved. Craftly runs on the free tiers of Google Gemini and Groq. That is also why there is a daily cap — around forty CVs and forty answer sets a day. In practice that is far more than anyone applying seriously gets through.",
  },
  {
    q: "What happens to my CV?",
    a: "It is stored against your account so you do not have to paste it again, and it is sent to the AI provider to generate each tailored version. Nothing is sold, nothing is shared with employers, and your CV is never used to train a model. You can delete any application from your dashboard, permanently.",
  },
  {
    q: "Will two applications to the same company contradict each other?",
    a: "That was the first thing built to prevent. Every generation is shown a digest of your recent applications — the employers, titles and dates you have already claimed — and is required not to contradict them. Emphasis shifts between roles; facts do not.",
  },
  {
    q: "What if the extracted profile is wrong?",
    a: "Fix it. The PDF reader is good but not perfect, and everything it pulls out lands in an editable form before it is saved. Your profile stays editable forever, and you can re-upload a newer CV whenever your experience changes.",
  },
  {
    q: "What does the exported CV look like?",
    a: "A single-column A4 document typeset in Computer Modern — the serif you know from academic papers. No colour blocks, no sidebars, no icons, no photo. It parses cleanly in applicant tracking systems and reads like a document a person wrote.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-line border-y border-line">
      {QUESTIONS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left"
              >
                <span
                  className={`font-display text-[19px] font-medium leading-[1.35] tracking-[-0.02em] transition-colors duration-200 sm:text-[21px] ${
                    isOpen ? "text-ink" : "text-ink-soft group-hover:text-ink"
                  }`}
                >
                  {item.q}
                </span>
                <span
                  className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-[var(--ease-out-soft)] ${
                    isOpen
                      ? "rotate-45 border-flame bg-flame text-white"
                      : "border-line-strong text-ink-muted group-hover:border-ink group-hover:text-ink"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[62ch] pb-7 pr-12 text-[15px] leading-[1.7] text-ink-muted">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
