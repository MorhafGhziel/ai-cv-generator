"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import { UploadSpot } from "@/components/art/Spots";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { CheckIcon, DocIcon, DownloadIcon, PenIcon } from "@/components/ui/Icons";
import { apiGet, apiSend, errorMessage } from "@/lib/client-api";

/**
 * Edits the user's own PDF in place, so their design survives.
 *
 * The generated CV elsewhere in the app is a new document in Craftly's format.
 * This is the opposite: their file, their layout, with individual values
 * changed. The distinction is stated in the UI because the two look nothing
 * alike and people reasonably expect the second when they upload a CV.
 */

interface DetectedValue {
  field: string;
  label: string;
  value: string;
  page: number;
  context: string;
}

interface DocumentInfo {
  exists: boolean;
  filename?: string;
  byteSize?: number;
  pageCount?: number;
  detected?: DetectedValue[];
  missing?: { field: string; label: string }[];
  anchors?: string[];
}

interface Outcome {
  target: string;
  value: string;
  kind: "replace" | "append";
  applied: boolean;
  reason?: string;
}

function downloadBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OriginalDocumentCard({
  standalone = false,
  onOpenEditor,
}: {
  standalone?: boolean;
  onOpenEditor: () => void;
}) {
  const [info, setInfo] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(standalone);
  const [values, setValues] = useState<Record<string, string>>({});
  const [additions, setAdditions] = useState<Record<string, string>>({});
  const [anchor, setAnchor] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<DocumentInfo>("/api/document");
      setInfo(data);
      if (data.detected) {
        setValues(Object.fromEntries(data.detected.map((d) => [d.field, d.value])));
      }
      if (data.anchors?.length) setAnchor(data.anchors[0]);
    } catch {
      // A missing document is not an error worth interrupting the page for.
      setInfo({ exists: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return standalone ? <div className="skeleton h-[168px] rounded-[20px]" /> : null;
  }

  if (!info?.exists) {
    if (!standalone) return null;
    return (
      <section className="rounded-[24px] border border-dashed border-line-strong bg-surface/60">
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <UploadSpot size={104} />
          <p className="font-display mt-6 text-[20px] font-medium tracking-[-0.02em] text-ink">
            No CV stored yet
          </p>
          <p className="mt-2 max-w-[44ch] text-[14px] leading-[1.6] text-ink-muted">
            Upload your CV and it is kept exactly as you made it, so you can change a detail
            without losing your layout. CVs uploaded before this existed were not saved — upload
            again to use this.
          </p>
          <div className="mt-6">
            <ButtonLink href="/profile" variant="secondary">
              Upload your CV
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  const detected = info.detected ?? [];
  const missing = info.missing ?? [];

  const edits = [
    ...detected
      .filter((d) => values[d.field] !== undefined && values[d.field] !== d.value)
      .map((d) => ({ kind: "replace" as const, target: d.value, value: values[d.field] })),
    ...missing
      .filter((m) => (additions[m.field] ?? "").trim())
      .map((m) => ({
        kind: "append" as const,
        target: anchor,
        value: additions[m.field].trim(),
        separator: "  |  ",
      })),
  ];

  async function apply() {
    if (edits.length === 0) {
      toast.error("Change a value first.");
      return;
    }
    setBusy(true);
    setOutcomes(null);
    try {
      const data = await apiSend<{
        applied: number;
        total: number;
        outcomes: Outcome[];
        pdf?: string;
        filename?: string;
      }>("/api/document/edit", "POST", { edits, download: true });

      setOutcomes(data.outcomes);

      if (data.pdf && data.filename) {
        downloadBase64(data.pdf, data.filename);
        toast.success(
          data.applied === data.total
            ? "Edited and downloaded — your layout is untouched."
            : `${data.applied} of ${data.total} changes applied. See the notes below.`,
        );
      } else {
        toast.error("None of those changes could be applied to this PDF.");
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't edit that PDF."));
    } finally {
      setBusy(false);
    }
  }

  async function downloadOriginal() {
    try {
      const res = await fetch("/api/document", { method: "POST" });
      if (!res.ok) throw new Error("Download failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = info?.filename ?? "cv.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't download your original.");
    }
  }

  return (
    <section className={`rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 ${standalone ? "" : "mb-5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-flame-soft text-[18px] text-flame-ink">
            <DocIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Your CV, in your own design
            </h2>
            <p className="mt-1 max-w-[56ch] text-[13px] leading-[1.55] text-ink-muted">
              The tailored CVs Craftly generates are new documents in our format. This is your
              uploaded file, exactly as you made it — change a value and it stays your layout.
            </p>
            <p className="mt-2 font-mono text-[11px] text-ink-faint">
              {info.filename} · {info.pageCount} page{info.pageCount === 1 ? "" : "s"} ·{" "}
              {Math.round((info.byteSize ?? 0) / 1024)} KB
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadOriginal}
            icon={<DownloadIcon className="text-[1.05em]" />}
          >
            Original
          </Button>
          <Button size="sm" onClick={onOpenEditor} icon={<PenIcon className="text-[1.05em]" />}>
            Open editor
          </Button>
          {!standalone && (
            <Button
              size="sm"
              variant={open ? "quiet" : "secondary"}
              onClick={() => setOpen((o) => !o)}
              icon={!open ? <PenIcon className="text-[1.05em]" /> : undefined}
            >
              {open ? "Close" : "Edit in place"}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 border-t border-line pt-6">
              {detected.length > 0 && (
                <>
                  <p className="eyebrow mb-1">Quick edits</p>
                  <p className="mb-3 max-w-[58ch] text-[12.5px] leading-relaxed text-ink-muted">
                    Common values, found automatically. For anything else — moving lines, adding
                    sections, new pages — open the editor.
                  </p>
                  <div className="space-y-4">
                    {detected.map((d) => (
                      <div key={d.field}>
                        <Input
                          label={d.label}
                          value={values[d.field] ?? ""}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [d.field]: e.target.value }))
                          }
                        />
                        <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">
                          page {d.page}: {d.context}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {missing.length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow mb-1">Not in your CV yet</p>
                  <p className="mb-3 max-w-[58ch] text-[12.5px] leading-relaxed text-ink-muted">
                    These get added to the end of the line you choose below. If that line has no
                    room, the change is refused rather than allowed to overlap your text.
                  </p>
                  <div className="space-y-4">
                    {missing.map((m) => (
                      <Input
                        key={m.field}
                        label={`Add ${m.label.toLowerCase()}`}
                        value={additions[m.field] ?? ""}
                        placeholder={`No ${m.label.toLowerCase()} detected`}
                        onChange={(e) =>
                          setAdditions((a) => ({ ...a, [m.field]: e.target.value }))
                        }
                      />
                    ))}

                    {info.anchors && info.anchors.length > 0 && (
                      <label className="block">
                        <span className="mb-1.5 block text-[13px] font-medium text-ink">
                          Put additions after this line
                        </span>
                        <select
                          value={anchor}
                          onChange={(e) => setAnchor(e.target.value)}
                          className="h-11 w-full rounded-[12px] border border-line bg-sunk px-3.5 text-[13px] text-ink"
                        >
                          {info.anchors.map((line) => (
                            <option key={line} value={line}>
                              {line.slice(0, 70)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  onClick={apply}
                  loading={busy}
                  loadingText="Editing…"
                  disabled={edits.length === 0}
                  icon={<CheckIcon className="text-[1.1em]" />}
                >
                  Apply {edits.length > 0 ? `${edits.length} change${edits.length === 1 ? "" : "s"}` : "changes"}
                </Button>
                <p className="text-[12.5px] text-ink-faint">
                  Your stored original is never modified.
                </p>
              </div>

              {outcomes && (
                <ul className="mt-5 space-y-2">
                  {outcomes.map((o, i) => (
                    <li
                      key={i}
                      className={`rounded-[12px] border px-4 py-3 text-[12.5px] leading-relaxed ${
                        o.applied
                          ? "border-line bg-sunk/60 text-ink-muted"
                          : "border-[color:color-mix(in_srgb,var(--color-danger)_22%,transparent)] bg-danger-soft text-danger"
                      }`}
                    >
                      <span className="font-medium">
                        {o.applied ? "Applied" : "Not applied"} — {o.kind} “{o.value || "(removed)"}”
                      </span>
                      {o.reason && <span className="block mt-0.5">{o.reason}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-5 max-w-[62ch] text-[12px] leading-relaxed text-ink-faint">
                Nothing in a PDF reflows, so only short single-line values can be changed this
                way. New text is drawn in the closest standard font — on most CVs that is
                indistinguishable, on a distinctive typeface it will differ slightly. Check the
                download before you send it.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
