"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import AppHeader from "@/components/app/AppHeader";
import ApplicationCard from "@/components/app/ApplicationCard";
import Composer from "@/components/app/Composer";
import ModeSwitcher, { type WorkMode } from "@/components/app/ModeSwitcher";
import CvEditor from "@/components/app/CvEditor";
import OriginalDocumentCard from "@/components/app/OriginalDocumentCard";
import type { ApplicationEntry, UsageRow } from "@/components/app/types";
import CVPreview from "@/components/CVPreview";
import { EmptyDocsSpot } from "@/components/art/Spots";
import { ButtonLink } from "@/components/ui/Button";
import { apiGet, apiSend, errorMessage } from "@/lib/client-api";
import { tailoredCVLenientSchema, answersLenientSchema, type Answer, type CVData } from "@/lib/cv-data";

/**
 * Parses a raw API row into an entry the UI can render.
 *
 * Rows written before validation existed can be any shape, so both JSON
 * columns go through the lenient schemas. A row that cannot be salvaged is
 * dropped rather than crashing the list.
 */
function toEntry(raw: unknown): ApplicationEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string") return null;

  const cv = tailoredCVLenientSchema.safeParse(row.cvData);
  if (!cv.success) return null;

  const answers = answersLenientSchema.safeParse(row.answers ?? []);

  return {
    id: row.id,
    jobSnippet: typeof row.jobSnippet === "string" ? row.jobSnippet : "Untitled application",
    targetCompany: typeof row.targetCompany === "string" ? row.targetCompany : null,
    targetRole: typeof row.targetRole === "string" ? row.targetRole : null,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    cvData: cv.data,
    answers: answers.success && answers.data.length > 0 ? answers.data : null,
  };
}

export default function DashboardClient({ cvProfile }: { cvProfile: CVData }) {
  const [entries, setEntries] = useState<ApplicationEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [jobDescription, setJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [mode, setMode] = useState<WorkMode>("tailor");
  const [editorOpen, setEditorOpen] = useState(false);

  // The printable document is rendered off-screen only while a download is in
  // flight, so the DOM never carries a hidden copy of every CV.
  const [printId, setPrintId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const firstName = cvProfile.name.trim().split(/\s+/)[0] || "there";

  const refreshUsage = useCallback(async () => {
    try {
      setUsage(await apiGet<UsageRow[]>("/api/usage"));
    } catch {
      // The quota strip is informational; failing to load it changes nothing.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const rows = await apiGet<unknown[]>("/api/cv-history", controller.signal);
        setEntries(rows.map(toEntry).filter((entry): entry is ApplicationEntry => entry !== null));
      } catch (error) {
        const message = errorMessage(error, "");
        if (message) toast.error(message);
      } finally {
        setLoadingList(false);
      }
    })();

    refreshUsage();
    return () => controller.abort();
  }, [refreshUsage]);

  const printEntry = entries.find((entry) => entry.id === printId) ?? null;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${cvProfile.name.replace(/\s+/g, "_") || "CV"}${
      printEntry?.targetCompany ? `_${printEntry.targetCompany.replace(/\s+/g, "_")}` : ""
    }`,
    onAfterPrint: () => setPrintId(null),
  });

  // The off-screen document must be mounted before the print dialog opens.
  useEffect(() => {
    if (!printId) return;
    const id = setTimeout(() => handlePrint(), 220);
    return () => clearTimeout(id);
  }, [printId, handlePrint]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const raw = await apiSend<unknown>("/api/generate", "POST", {
        jobDescription: jobDescription.trim(),
      });
      const entry = toEntry(raw);
      if (!entry) throw new Error("The generated CV came back in an unexpected shape.");

      setEntries((current) => [entry, ...current]);
      setExpandedId(entry.id);
      setJobDescription("");
      toast.success("Your tailored CV is ready.");
      refreshUsage();
    } catch (error) {
      const message = errorMessage(error, "Couldn't generate that CV.");
      if (message) toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    const previous = entries;
    // Optimistic: the row disappears immediately and is restored if the
    // request fails, which is the common case for a delete.
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (expandedId === id) setExpandedId(null);

    try {
      await apiSend(`/api/cv-history/${id}`, "DELETE");
    } catch (error) {
      setEntries(previous);
      toast.error(errorMessage(error, "Couldn't delete that."));
    }
  }

  function handleAnswers(id: string, answers: Answer[]) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, answers } : entry)),
    );
    refreshUsage();
  }

  const generateQuota = usage.find((row) => row.action === "generate");
  const outOfQuota = generateQuota ? generateQuota.remaining <= 0 : false;

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />

      <main className="mx-auto max-w-[1080px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8">
          <p className="eyebrow">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display mt-3 text-[clamp(1.8rem,4.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
            Good to see you, {firstName}.
          </h1>
        </div>

        <ModeSwitcher mode={mode} onChange={setMode} />

        <div className="mt-6">
          {mode === "edit" ? (
            editorOpen ? (
              <CvEditor onExit={() => setEditorOpen(false)} />
            ) : (
              <OriginalDocumentCard standalone onOpenEditor={() => setEditorOpen(true)} />
            )
          ) : (
            <>
              <Composer
                value={jobDescription}
                onChange={setJobDescription}
                onGenerate={handleGenerate}
                loading={generating}
                disabled={outOfQuota}
                disabledReason={
                  outOfQuota
                    ? "You've used today's free generations. They reset on a rolling 24 hours."
                    : undefined
                }
              />

              {generateQuota && generateQuota.remaining <= 8 && !outOfQuota && (
                <p className="mt-3 px-1 text-[12.5px] text-ink-faint">
                  {generateQuota.remaining} of {generateQuota.limit} free generations left today.
                </p>
              )}
            </>
          )}
        </div>

        {/* The applications list belongs to tailoring; in edit mode it is noise. */}
        {mode === "tailor" && (
        <>
        {/* ============================================ Applications */}
        <section className="mt-12">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-[20px] font-medium tracking-[-0.025em] text-ink">
              Your applications
            </h2>
            {entries.length > 0 && (
              <span className="font-mono text-[12px] tracking-[0.1em] text-ink-faint">
                {entries.length}
              </span>
            )}
          </div>

          {loadingList ? (
            <ul className="space-y-3" aria-busy="true" aria-label="Loading applications">
              {[0, 1, 2].map((i) => (
                <li key={i} className="skeleton h-[76px] rounded-[20px]" />
              ))}
            </ul>
          ) : entries.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-line-strong bg-surface/60">
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <EmptyDocsSpot size={120} />
                <p className="font-display mt-6 text-[20px] font-medium tracking-[-0.02em] text-ink">
                  Nothing here yet
                </p>
                <p className="mt-2 max-w-[40ch] text-[14px] leading-[1.6] text-ink-muted">
                  Paste a job posting above and your first tailored CV will appear here — ready to
                  download, with its form answers alongside it.
                </p>
              </div>
            </div>
          ) : (
            <motion.ul layout className="space-y-3">
              <AnimatePresence initial={false}>
                {entries.map((entry) => (
                  <motion.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ApplicationCard
                      entry={entry}
                      profile={cvProfile}
                      expanded={expandedId === entry.id}
                      onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      onDelete={() => handleDelete(entry.id)}
                      onDownload={() => setPrintId(entry.id)}
                      onAnswers={(answers) => handleAnswers(entry.id, answers)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </section>

        {/* A quiet nudge toward keeping the base CV current. */}
        {!loadingList && entries.length > 0 && (
          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[20px] border border-line bg-sunk/60 px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[14px] font-medium text-ink">Experience changed?</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Every tailored CV is built from your base profile — keep it current.
              </p>
            </div>
            <ButtonLink href="/profile" variant="ghost" size="sm">
              Edit your CV
            </ButtonLink>
          </div>
        )}
        </>
        )}
      </main>

      {/* Off-screen print target. Positioned rather than hidden, because
          `display: none` would give react-to-print nothing to measure. */}
      {printEntry && (
        <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, width: "210mm" }}>
          <div ref={printRef}>
            <CVPreview data={printEntry.cvData} name={cvProfile.name} contact={cvProfile.contact} />
          </div>
        </div>
      )}
    </div>
  );
}
