"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import PdfPageCanvas from "@/components/app/PdfPageCanvas";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import { apiGet, apiSend, errorMessage } from "@/lib/client-api";
import type { EditableBox, PdfOperation } from "@/lib/pdf-ops";

/**
 * A canvas editor over the user's own PDF.
 *
 * The rendered page is the background, so every design decision the author made
 * survives untouched. Each line of text becomes a box on top that can be
 * retyped, dragged anywhere, or deleted; new text and new pages can be added.
 *
 * Nothing is applied until export. The editor holds a list of operations and
 * the server replays them onto a fresh copy of the stored original, so undo is
 * just dropping an operation and the document can never drift.
 *
 * Coordinates: PDF space has its origin bottom-left with y increasing upward;
 * the DOM has it top-left going down. The conversion lives here, next to the
 * scale it depends on.
 */

interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

interface BoxState extends EditableBox {
  /** Local edits, applied over the original values. */
  deleted?: boolean;
  movedTo?: { page: number; x: number; y: number };
  newText?: string;
  /** Boxes the user created, which have no counterpart in the original. */
  isNew?: boolean;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

export default function CvEditor({ onExit }: { onExit: () => void }) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [boxes, setBoxes] = useState<BoxState[]>([]);
  const [extraPages, setExtraPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [saving, setSaving] = useState(false);

  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; page: number } | null>(null);

  /* ------------------------------------------------------------- loading */

  useEffect(() => {
    (async () => {
      try {
        const [meta, file] = await Promise.all([
          apiGet<{ pages: PageInfo[]; boxes: EditableBox[] }>("/api/document/boxes"),
          fetch("/api/document", { method: "POST" }).then((r) => {
            if (!r.ok) throw new Error("Couldn't load your PDF.");
            return r.arrayBuffer();
          }),
        ]);
        setPages(meta.pages);
        setBoxes(meta.boxes.map((b) => ({ ...b })));
        setPdfBytes(new Uint8Array(file));
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't open your CV for editing."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------------------------------------------------- operations */

  const operations = useMemo<PdfOperation[]>(() => {
    const ops: PdfOperation[] = [];
    for (let i = 0; i < extraPages; i++) ops.push({ op: "addPage", after: 0 });

    for (const box of boxes) {
      if (box.isNew) {
        if (!box.deleted && (box.newText ?? box.text).trim()) {
          const at = box.movedTo ?? { page: box.page, x: box.x, y: box.y };
          ops.push({
            op: "add",
            page: at.page,
            x: at.x,
            y: at.y,
            text: box.newText ?? box.text,
            size: box.size,
            bold: box.bold,
            italic: box.italic,
            serif: box.serif,
          });
        }
        continue;
      }

      if (box.deleted) {
        ops.push({ op: "delete", id: box.id });
        continue;
      }
      if (box.movedTo) {
        ops.push({
          op: "move",
          id: box.id,
          page: box.movedTo.page,
          x: box.movedTo.x,
          y: box.movedTo.y,
          text: box.newText,
          size: box.size,
        });
        continue;
      }
      if (box.newText !== undefined && box.newText !== box.text) {
        ops.push({ op: "edit", id: box.id, text: box.newText });
      }
    }
    return ops;
  }, [boxes, extraPages]);

  const dirty = operations.length > 0;

  /* -------------------------------------------------------------- actions */

  const update = useCallback((id: string, patch: Partial<BoxState>) => {
    setBoxes((current) => current.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const allPages = useMemo<PageInfo[]>(() => {
    if (pages.length === 0) return [];
    const last = pages[pages.length - 1];
    const extras = Array.from({ length: extraPages }, (_, i) => ({
      pageNumber: last.pageNumber + i + 1,
      width: last.width,
      height: last.height,
    }));
    return [...pages, ...extras];
  }, [pages, extraPages]);

  function placeNewBox(page: PageInfo, event: React.MouseEvent<HTMLDivElement>) {
    if (!placing) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    // DOM y grows downward; PDF y grows upward from the bottom.
    const y = page.height - (event.clientY - rect.top) / scale;

    const id = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBoxes((current) => [
      ...current,
      {
        id,
        page: page.pageNumber,
        text: "New text",
        newText: "New text",
        x,
        y,
        width: 120,
        height: 11,
        size: 11,
        bold: false,
        italic: false,
        serif: true,
        isNew: true,
      },
    ]);
    setSelected(id);
    setPlacing(false);
  }

  function onDragStart(box: BoxState, page: PageInfo, event: React.PointerEvent) {
    if (placing) return;
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const at = box.movedTo ?? { page: box.page, x: box.x, y: box.y };
    dragRef.current = {
      id: box.id,
      page: page.pageNumber,
      offsetX: (event.clientX - rect.left) / scale - at.x,
      offsetY: (event.clientY - rect.top) / scale - (page.height - at.y),
    };
    setSelected(box.id);
  }

  function onDragMove(page: PageInfo, event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale - drag.offsetX;
    const yFromTop = (event.clientY - rect.top) / scale - drag.offsetY;
    update(drag.id, {
      movedTo: {
        page: page.pageNumber,
        x: Math.max(0, Math.min(page.width, x)),
        y: Math.max(0, Math.min(page.height, page.height - yFromTop)),
      },
    });
  }

  function onDragEnd() {
    dragRef.current = null;
  }

  async function save() {
    if (!dirty) {
      toast.error("Nothing has changed yet.");
      return;
    }
    setSaving(true);
    try {
      const data = await apiSend<{
        applied: number;
        total: number;
        outcomes: { op: string; applied: boolean; reason?: string }[];
        pdf: string;
        filename: string;
      }>("/api/document/compose", "POST", { operations });

      const bytes = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      link.click();
      URL.revokeObjectURL(url);

      const refused = data.outcomes.filter((o) => !o.applied);
      if (refused.length === 0) {
        toast.success("Downloaded — your design is untouched.");
      } else {
        toast.error(
          `${data.applied} of ${data.total} changes applied. ${refused[0].reason ?? ""}`,
          { duration: 8000 },
        );
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't build that PDF."));
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------------------------------------------- view */

  if (loading) {
    return <div className="skeleton h-[520px] rounded-[20px]" />;
  }

  const selectedBox = boxes.find((b) => b.id === selected) ?? null;

  return (
    <div className="rounded-[20px] border border-line bg-surface shadow-[var(--shadow-card)]">
      {/* Toolbar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-t-[20px] border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <Button size="sm" variant="quiet" onClick={onExit} icon={<ArrowLeftIcon className="text-[1.05em]" />}>
          Back
        </Button>

        <span className="mx-1 h-5 w-px bg-line" />

        <Button
          size="sm"
          variant={placing ? "primary" : "ghost"}
          onClick={() => setPlacing((p) => !p)}
          icon={<PlusIcon className="text-[1.05em]" />}
        >
          {placing ? "Click the page…" : "Add text"}
        </Button>

        <Button size="sm" variant="ghost" onClick={() => setExtraPages((n) => n + 1)}>
          Add page
        </Button>

        {selectedBox && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (selectedBox.isNew) {
                setBoxes((c) => c.filter((b) => b.id !== selectedBox.id));
              } else {
                update(selectedBox.id, { deleted: !selectedBox.deleted });
              }
              setSelected(null);
            }}
            icon={<TrashIcon className="text-[1.05em]" />}
          >
            {selectedBox.deleted ? "Restore" : "Delete"}
          </Button>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="quiet" onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 0.15))}>
            −
          </Button>
          <span className="w-12 text-center font-mono text-[12px] text-ink-muted">
            {Math.round(scale * 100)}%
          </span>
          <Button size="sm" variant="quiet" onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.15))}>
            +
          </Button>
        </span>

        <Button
          size="sm"
          onClick={save}
          loading={saving}
          loadingText="Building…"
          disabled={!dirty}
          icon={<DownloadIcon className="text-[1.05em]" />}
        >
          {dirty ? `Export ${operations.length}` : "Export"}
        </Button>
      </div>

      <p className="border-b border-line bg-sunk/50 px-4 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
        Click a line to select it, type to change it, drag it anywhere. Your original is never
        modified — every export rebuilds from it, so nothing here is permanent until you download.
      </p>

      {/* Pages */}
      <div className="max-h-[70vh] overflow-auto bg-sunk/60 p-6">
        <div className="mx-auto flex w-fit flex-col gap-8">
          {allPages.map((page) => {
            const isExtra = page.pageNumber > pages.length;
            return (
              <div key={page.pageNumber} className="relative">
                <p className="mb-2 font-mono text-[11px] text-ink-faint">
                  Page {page.pageNumber}
                  {isExtra && " · added"}
                </p>

                <div
                  className={`relative ${placing ? "cursor-crosshair" : ""}`}
                  style={{ width: page.width * scale, height: page.height * scale }}
                  onClick={(e) => placeNewBox(page, e)}
                  onPointerMove={(e) => onDragMove(page, e)}
                  onPointerUp={onDragEnd}
                >
                  {isExtra ? (
                    <div className="absolute inset-0 rounded-[4px] border border-dashed border-line-strong bg-white shadow-[var(--shadow-lift)]" />
                  ) : (
                    <PdfPageCanvas pdfBytes={pdfBytes} pageNumber={page.pageNumber} scale={scale} />
                  )}

                  {boxes
                    .filter((b) => (b.movedTo?.page ?? b.page) === page.pageNumber)
                    .map((box) => {
                      const at = box.movedTo ?? { x: box.x, y: box.y };
                      const active = selected === box.id;
                      return (
                        <div
                          key={box.id}
                          onPointerDown={(e) => onDragStart(box, page, e)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(box.id);
                          }}
                          className={`absolute cursor-move rounded-[3px] transition-colors ${
                            box.deleted
                              ? "bg-danger/10 line-through opacity-50 outline outline-1 outline-danger/40"
                              : active
                                ? "bg-flame/10 outline outline-2 outline-flame"
                                : "hover:bg-flame/[0.06] hover:outline hover:outline-1 hover:outline-flame/40"
                          }`}
                          style={{
                            left: at.x * scale,
                            // PDF baselines sit at the bottom of the glyphs.
                            top: (page.height - at.y - box.size) * scale,
                            minWidth: Math.max(box.width, 12) * scale,
                            height: box.size * 1.35 * scale,
                          }}
                          title={box.text}
                        >
                          {active && !box.deleted && (
                            <input
                              autoFocus
                              value={box.newText ?? box.text}
                              onChange={(e) => update(box.id, { newText: e.target.value })}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="absolute inset-0 w-full rounded-[3px] border-none bg-white px-0.5 text-ink outline-none"
                              style={{ fontSize: Math.max(9, box.size * scale) }}
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dirty && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-[20px] border-t border-line bg-sunk/50 px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-flame" aria-hidden="true" />
            {operations.length} unsaved change{operations.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setBoxes((c) => c.filter((b) => !b.isNew).map((b) => ({ ...b, deleted: false, movedTo: undefined, newText: undefined })));
                setExtraPages(0);
                setSelected(null);
              }}
            >
              Discard all
            </Button>
            <Button size="sm" onClick={save} loading={saving} icon={<CheckIcon className="text-[1.05em]" />}>
              Export PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
