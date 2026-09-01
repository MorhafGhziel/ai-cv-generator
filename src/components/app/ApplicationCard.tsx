"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import CVPreview from "@/components/CVPreview";
import { EmptyChatSpot } from "@/components/art/Spots";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import {
  ChatIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DocIcon,
  DownloadIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import { apiSend, errorMessage } from "@/lib/client-api";
import { answersLenientSchema, LIMITS, type Answer, type CVData } from "@/lib/cv-data";
import type { ApplicationEntry } from "@/components/app/types";

type Tab = "document" | "answers";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ApplicationCard({
  entry,
  profile,
  expanded,
  onToggle,
  onDelete,
  onDownload,
  onAnswers,
}: {
  entry: ApplicationEntry;
  profile: CVData;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onAnswers: (answers: Answer[]) => void;
}) {
  const [tab, setTab] = useState<Tab>("document");
  const [questions, setQuestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const answers = entry.answers ?? [];

  async function handleAnswers() {
    if (questions.trim().length < 3) {
      toast.error("Paste at least one question first.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiSend<{ answers: unknown }>("/api/answers", "POST", {
        questions: questions.trim(),
        entryId: entry.id,
      });
      const parsed = answersLenientSchema.safeParse(data.answers);
      const next = parsed.success ? parsed.data : [];
      if (next.length === 0) {
        toast.error("No answers came back. Try rewording the questions.");
        return;
      }
      onAnswers(next);
      toast.success(`${next.length} answer${next.length === 1 ? "" : "s"} ready.`);
    } catch (error) {
      const message = errorMessage(error, "Couldn't generate answers.");
      if (message) toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const title = entry.targetRole || entry.jobSnippet;
  const subtitle = entry.targetCompany;

  return (
    <article
      className={`overflow-hidden rounded-[20px] border bg-surface transition-[border-color,box-shadow] duration-300 ${
        expanded
          ? "border-line-strong shadow-[var(--shadow-lift)]"
          : "border-line shadow-[var(--shadow-card)] hover:border-line-strong"
      }`}
    >
      {/* -------------------------------------------------- Summary row */}
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-colors duration-300 ${
              expanded ? "bg-flame text-white" : "bg-sunk text-ink-muted"
            }`}
          >
            <DocIcon className="text-[19px]" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-faint">
              {subtitle && <span className="truncate">{subtitle}</span>}
              {subtitle && <span aria-hidden="true">·</span>}
              <time dateTime={entry.createdAt} className="shrink-0">
                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </time>
              {answers.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">{answers.length} answers</span>
                </>
              )}
            </span>
          </span>

          <ChevronDownIcon
            className={`shrink-0 text-[18px] text-ink-faint transition-transform duration-300 ease-[var(--ease-out-soft)] ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={onDownload} icon={<DownloadIcon className="text-[1.05em]" />}>
            <span className="hidden sm:inline">PDF</span>
          </Button>

          {confirmingDelete ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  onDelete();
                  setConfirmingDelete(false);
                }}
              >
                Delete
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setConfirmingDelete(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="quiet"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete this application"
              className="!px-2 text-ink-faint hover:text-danger"
            >
              <TrashIcon className="text-[1.1em]" />
            </Button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------- Detail panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: EASE }}
            className="overflow-hidden border-t border-line"
          >
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-line bg-sunk/50 px-4 py-2.5 sm:px-5">
              {(
                [
                  { id: "document", label: "Document", icon: <DocIcon /> },
                  { id: "answers", label: "Form answers", icon: <ChatIcon /> },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? "true" : undefined}
                  className={`relative flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors duration-200 ${
                    tab === item.id ? "text-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab === item.id && (
                    <motion.span
                      layoutId={`tab-${entry.id}`}
                      className="absolute inset-0 rounded-[10px] bg-surface shadow-[var(--shadow-card)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <span className="text-[15px]">{item.icon}</span>
                    {item.label}
                    {item.id === "answers" && answers.length > 0 && (
                      <Badge tone="accent" className="ml-0.5">
                        {answers.length}
                      </Badge>
                    )}
                  </span>
                </button>
              ))}
            </div>

            {tab === "document" ? (
              <div className="bg-sunk/60 p-4 sm:p-6">
                {/* The document is fixed at A4 width; on narrow screens it
                    scales down rather than forcing a horizontal scroll. */}
                <div className="mx-auto w-fit origin-top scale-[0.42] rounded-[6px] shadow-[var(--shadow-lift)] xs:scale-[0.5] sm:scale-[0.62] lg:scale-[0.78] xl:scale-90">
                  <CVPreview data={entry.cvData} name={profile.name} contact={profile.contact} />
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <Textarea
                  value={questions}
                  onChange={(event) => setQuestions(event.target.value)}
                  rows={5}
                  maxLength={LIMITS.questions}
                  disabled={loading}
                  label="Screening questions"
                  hint="Paste them straight from the form — one per line is fine."
                  placeholder={
                    "How many years of React experience do you have?\nWhat are your salary expectations?\nWhy do you want to work here?"
                  }
                />

                <div className="mt-4">
                  <Button
                    onClick={handleAnswers}
                    loading={loading}
                    loadingText="Writing answers…"
                    disabled={questions.trim().length < 3}
                    icon={<ChatIcon className="text-[1.1em]" />}
                  >
                    {answers.length > 0 ? "Answer again" : "Get answers"}
                  </Button>
                </div>

                {answers.length > 0 ? (
                  <ul className="mt-6 space-y-3">
                    {answers.map((answer, index) => (
                      <AnswerRow key={`${answer.question}-${index}`} answer={answer} />
                    ))}
                  </ul>
                ) : (
                  !loading && (
                    <div className="mt-2 flex flex-col items-center py-8 text-center">
                      <EmptyChatSpot size={96} />
                      <p className="mt-4 text-[14px] font-medium text-ink">No answers yet</p>
                      <p className="mt-1 max-w-[38ch] text-[13px] leading-relaxed text-ink-muted">
                        Paste the questions above and you&rsquo;ll get answers written to match
                        this CV and your preferences.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function AnswerRow({ answer }: { answer: Answer }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(answer.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Your browser blocked the clipboard. Select the text and copy it manually.");
    }
  }

  return (
    <li className="rounded-[16px] border border-line bg-surface p-4">
      <p className="text-[13.5px] font-semibold leading-snug text-ink">{answer.question}</p>

      <div className="well mt-2.5 flex items-start justify-between gap-3 p-3.5">
        <p className="whitespace-pre-wrap text-[13.5px] leading-[1.65] text-ink-soft">
          {answer.answer}
        </p>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy answer"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-200 ${
            copied ? "bg-mint/15 text-mint" : "text-ink-faint hover:bg-sunk-deep hover:text-ink"
          }`}
        >
          {copied ? <CheckIcon className="text-[16px]" /> : <CopyIcon className="text-[16px]" />}
        </button>
      </div>

      {answer.explanation && (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">{answer.explanation}</p>
      )}
    </li>
  );
}
