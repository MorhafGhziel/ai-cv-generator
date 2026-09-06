"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import EditorPage, { findSnap, type DragState } from "@/components/app/editor/EditorPage";
import Inspector from "@/components/app/editor/Inspector";
import { useHistory } from "@/components/app/editor/useHistory";
import type { BoxState, DocState, PageInfo } from "@/components/app/editor/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, CheckIcon, DownloadIcon, PlusIcon } from "@/components/ui/Icons";
import { apiGet, apiSend, errorMessage } from "@/lib/client-api";
import type { EditableBox, PdfOperation } from "@/lib/pdf-ops";

/**
 * A canvas editor over the user's own PDF.
 *
 * The rendered page is the background, so the design is not approximated — it
 * is the original document, with only the text layer interactive on top.
 *
 * Nothing is applied as you work. State is a list of operations replayed onto a
 * fresh copy of the stored original at export, which makes undo total and means
 * repeated exports cannot drift.
 *
 * Coordinates: PDF space has its origin bottom-left with y increasing upward;
 * the DOM has it top-left going down. Every conversion lives in this file and
 * its children, next to the zoom it depends on.
 */

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;
const NUDGE = 1;
const NUDGE_FAR = 10;

/** Rebuilds editor state from a saved operation list. */
function restore(original: EditableBox[], operations: PdfOperation[]): BoxState[] {
  const byId = new Map<string, BoxState>(original.map((b) => [b.id, { ...b }]));
  const added: BoxState[] = [];

  for (const op of operations) {
    switch (op.op) {
      case "delete": {
        const box = byId.get(op.id);
        if (box) box.deleted = true;
        break;
      }
      case "edit": {
        const box = byId.get(op.id);
        if (box) box.newText = op.text;
        break;
      }
      case "move": {
        const box = byId.get(op.id);
        if (box) {
          box.movedTo = { page: op.page, x: op.x, y: op.y };
          if (op.text !== undefined) box.newText = op.text;
          if (op.size !== undefined) box.size = op.size;
        }
        break;
      }
      case "add":
        added.push({
          id: `new-${added.length}-${Math.random().toString(36).slice(2, 7)}`,
          page: op.page,
          text: op.text,
          newText: op.text,
          x: op.x,
          y: op.y,
          width: Math.max(40, op.text.length * op.size * 0.5),
          height: op.size,
          size: op.size,
          bold: op.bold,
          italic: op.italic,
          serif: op.serif,
          isNew: true,
        });
        break;
      case "addPage":
        break;
    }
  }

  return [...byId.values(), ...added];
}

export default function CvEditor({ onExit }: { onExit: () => void }) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(0.9);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [saving, setSaving] = useState(false);
  const [storing, setStoring] = useState(false);
  const [savedOps, setSavedOps] = useState("[]");
  const [report, setReport] = useState<
    { op: string; applied: boolean; reason?: string; warning?: string }[] | null
  >(null);
  const [orphaned, setOrphaned] = useState(0);
  /** Set only after an export was refused, so the retry is offered in context. */
  const [canForce, setCanForce] = useState(false);

  const { state, commit, amend, undo, redo, reset, canUndo, canRedo } = useHistory<DocState>({
    boxes: [],
    extraPages: 0,
  });
  const { boxes, extraPages } = state;

  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  /* --------------------------------------------------------------- loading */

  useEffect(() => {
    (async () => {
      try {
        const [meta, file, saved] = await Promise.all([
          apiGet<{ pages: PageInfo[]; boxes: EditableBox[] }>("/api/document/boxes"),
          fetch("/api/document", { method: "POST" }).then((r) => {
            if (!r.ok) throw new Error("Couldn't load your PDF.");
            return r.arrayBuffer();
          }),
          apiGet<{ operations: PdfOperation[] }>("/api/document/edits"),
        ]);

        const known = new Set(meta.boxes.map((b) => b.id));
        setOrphaned(saved.operations.filter((o) => "id" in o && !known.has(o.id)).length);

        setPages(meta.pages);
        setPdfBytes(new Uint8Array(file));
        reset({
          boxes: restore(meta.boxes, saved.operations),
          extraPages: saved.operations.filter((o) => o.op === "addPage").length,
        });
        setSavedOps(JSON.stringify(saved.operations));
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't open your CV for editing."));
      } finally {
        setLoading(false);
      }
    })();
  }, [reset]);

  /* ------------------------------------------------------------ operations */

  const operations = useMemo<PdfOperation[]>(() => {
    const ops: PdfOperation[] = [];
    for (let i = 0; i < extraPages; i++) ops.push({ op: "addPage", after: 0 });

    for (const box of boxes) {
      if (box.isNew) {
        const text = (box.newText ?? box.text).trim();
        if (box.deleted || !text) continue;
        const at = box.movedTo ?? { page: box.page, x: box.x, y: box.y };
        ops.push({
          op: "add",
          page: at.page,
          x: at.x,
          y: at.y,
          text,
          size: box.size,
          bold: box.bold,
          italic: box.italic,
          serif: box.serif,
        });
        continue;
      }

      if (box.deleted) {
        ops.push({ op: "delete", id: box.id });
      } else if (box.movedTo) {
        ops.push({
          op: "move",
          id: box.id,
          page: box.movedTo.page,
          x: box.movedTo.x,
          y: box.movedTo.y,
          text: box.newText,
          size: box.size,
        });
      } else if (box.newText !== undefined && box.newText !== box.text) {
        ops.push({ op: "edit", id: box.id, text: box.newText });
      }
    }
    return ops;
  }, [boxes, extraPages]);

  const dirty = operations.length > 0;
  const unsaved = JSON.stringify(operations) !== savedOps;
  const selected = boxes.find((b) => b.id === selectedId) ?? null;

  const allPages = useMemo<PageInfo[]>(() => {
    if (pages.length === 0) return [];
    const last = pages[pages.length - 1];
    return [
      ...pages,
      ...Array.from({ length: extraPages }, (_, i) => ({
        pageNumber: last.pageNumber + i + 1,
        width: last.width,
        height: last.height,
      })),
    ];
  }, [pages, extraPages]);

  /* ----------------------------------------------------------------- edits */

  const patch = useCallback(
    (id: string, changes: Partial<BoxState>, asStep = true) => {
      const apply = (current: DocState): DocState => ({
        ...current,
        boxes: current.boxes.map((b) => (b.id === id ? { ...b, ...changes } : b)),
      });
      if (asStep) commit(apply);
      else amend(apply);
    },
    [commit, amend],
  );

  const removeSelected = useCallback(() => {
    if (!selected) return;
    if (selected.isNew) {
      commit((c) => ({ ...c, boxes: c.boxes.filter((b) => b.id !== selected.id) }));
      setSelectedId(null);
    } else {
      patch(selected.id, { deleted: true });
    }
  }, [selected, commit, patch]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (event.key === "Escape") {
        if (editingId) setEditingId(null);
        else if (placing) setPlacing(false);
        else setSelectedId(null);
        return;
      }

      // Everything below is a canvas gesture, not text entry.
      if (typing || !selected) return;

      if (event.key === "Enter") {
        event.preventDefault();
        setEditingId(selected.id);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
        return;
      }

      const step = event.shiftKey ? NUDGE_FAR : NUDGE;
      const delta =
        event.key === "ArrowLeft"
          ? { x: -step, y: 0 }
          : event.key === "ArrowRight"
            ? { x: step, y: 0 }
            : event.key === "ArrowUp"
              ? { x: 0, y: step }
              : event.key === "ArrowDown"
                ? { x: 0, y: -step }
                : null;

      if (delta) {
        event.preventDefault();
        const at = selected.movedTo ?? { page: selected.page, x: selected.x, y: selected.y };
        patch(selected.id, { movedTo: { page: at.page, x: at.x + delta.x, y: at.y + delta.y } });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, editingId, placing, undo, redo, patch, removeSelected]);

  /* -------------------------------------------------------------- dragging */

  function onDragStart(box: BoxState, page: PageInfo, event: React.PointerEvent) {
    if (placing) return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const surface = event.currentTarget.parentElement as HTMLElement;
    const rect = surface.getBoundingClientRect();
    const at = box.movedTo ?? { x: box.x, y: box.y };

    dragRef.current = {
      id: box.id,
      offsetX: (event.clientX - rect.left) / scale - at.x,
      offsetY: (event.clientY - rect.top) / scale - (page.height - at.y),
    };
    setSelectedId(box.id);
    setEditingId(null);
    // One undo step for the whole gesture; the moves that follow amend it.
    commit((c) => ({ ...c }));
    setDrag({ id: box.id, guides: {} });
  }

  function onDragMove(page: PageInfo, event: React.PointerEvent) {
    const current = dragRef.current;
    if (!current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    let x = (event.clientX - rect.left) / scale - current.offsetX;
    let y = page.height - ((event.clientY - rect.top) / scale - current.offsetY);

    // Snap to the left edges and baselines of other blocks on this page, so a
    // line dropped into an existing column actually lines up with it.
    const others = boxes.filter(
      (b) => b.id !== current.id && (b.movedTo?.page ?? b.page) === page.pageNumber && !b.deleted,
    );
    const snapX = findSnap(x, others.map((b) => (b.movedTo ?? b).x));
    const snapY = findSnap(y, others.map((b) => (b.movedTo ?? b).y));
    if (snapX) x = snapX.value;
    if (snapY) y = snapY.value;

    setDrag({ id: current.id, guides: { x: snapX?.guide, y: snapY?.guide } });

    patch(
      current.id,
      {
        movedTo: {
          page: page.pageNumber,
          x: Math.max(0, Math.min(page.width, x)),
          y: Math.max(0, Math.min(page.height, y)),
        },
      },
      false,
    );
  }

  function onDragEnd() {
    dragRef.current = null;
    setDrag(null);
  }

  /* ----------------------------------------------------------- persistence */

  async function store() {
    setStoring(true);
    try {
      await apiSend("/api/document/edits", "PUT", { operations });
      setSavedOps(JSON.stringify(operations));
      toast.success(operations.length === 0 ? "Changes cleared." : "Saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save your changes."));
    } finally {
      setStoring(false);
    }
  }

  async function exportPdf(allowCover = false) {
    setSaving(true);
    try {
      const data = await apiSend<{
        applied: number;
        total: number;
        outcomes: { op: string; applied: boolean; reason?: string; warning?: string }[];
        pdf: string;
        filename: string;
      }>("/api/document/compose", "POST", { operations, allowCover });

      const bytes = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      link.click();
      URL.revokeObjectURL(url);

      const notable = data.outcomes.filter((o) => !o.applied || o.warning);
      setReport(notable.length > 0 ? notable : null);

      const refused = data.outcomes.filter((o) => !o.applied);
      setCanForce(refused.length > 0 && !allowCover);

      if (refused.length > 0) {
        toast.error(`${data.applied} of ${data.total} changes applied.`, { duration: 7000 });
      } else if (data.outcomes.some((o) => o.warning)) {
        toast.success("Downloaded — some text was painted over rather than deleted.");
      } else {
        toast.success("Downloaded — your design is untouched.");
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't build that PDF."));
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------ view */

  if (loading) return <div className="skeleton h-[560px] rounded-[20px]" />;

  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2.5">
        <Button size="sm" variant="quiet" onClick={onExit} icon={<ArrowLeftIcon />}>
          Back
        </Button>

        <span className="mx-1 h-5 w-px bg-line" />

        <Button size="sm" variant="quiet" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          Undo
        </Button>
        <Button size="sm" variant="quiet" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          Redo
        </Button>

        <span className="mx-1 h-5 w-px bg-line" />

        <Button
          size="sm"
          variant={placing ? "primary" : "ghost"}
          onClick={() => setPlacing((p) => !p)}
          icon={<PlusIcon />}
        >
          {placing ? "Click the page" : "Add text"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => commit((c) => ({ ...c, extraPages: c.extraPages + 1 }))}
        >
          Add page
        </Button>

        <span className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="quiet"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 0.15))}
            aria-label="Zoom out"
          >
            −
          </Button>
          <span className="w-11 text-center font-mono text-[12px] text-ink-muted">
            {Math.round(scale * 100)}%
          </span>
          <Button
            size="sm"
            variant="quiet"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.15))}
            aria-label="Zoom in"
          >
            +
          </Button>
        </span>

        <Button
          size="sm"
          variant="secondary"
          onClick={store}
          loading={storing}
          disabled={!unsaved}
          icon={<CheckIcon />}
        >
          {unsaved ? "Save" : "Saved"}
        </Button>
        <Button
          size="sm"
          onClick={() => exportPdf(false)}
          loading={saving}
          loadingText="Building…"
          disabled={!dirty}
          icon={<DownloadIcon />}
        >
          Export
        </Button>
      </div>

      {orphaned > 0 && (
        <p className="border-b border-line bg-danger-soft px-4 py-2.5 text-[12.5px] leading-relaxed text-danger">
          {orphaned} saved change{orphaned === 1 ? "" : "s"} no longer matched a line in this
          document and {orphaned === 1 ? "was" : "were"} dropped. Make the change again and save.
        </p>
      )}

      {report && (
        <div className="border-b border-line">
          {report.map((item, i) => (
            <p
              key={i}
              className={`px-4 py-2.5 text-[12.5px] leading-relaxed ${
                item.applied ? "bg-sunk/60 text-ink-muted" : "bg-danger-soft text-danger"
              }`}
            >
              <span className="font-medium">
                {item.applied ? "Applied with a caveat" : "Not applied"}
              </span>
              {" — "}
              {item.reason ?? item.warning}
            </p>
          ))}
          {canForce && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-danger-soft px-4 pb-3">
              <p className="max-w-[62ch] text-[12.5px] leading-relaxed text-danger">
                This PDF won&rsquo;t let that text be deleted. You can paint over it instead — the
                CV will look right, but the old words stay readable to software that scans it.
              </p>
              <Button size="sm" variant="secondary" onClick={() => exportPdf(true)}>
                Paint over it and export
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex">
        <div className="min-w-0 flex-1 overflow-auto bg-sunk/60 p-6" style={{ maxHeight: "72vh" }}>
          <div className="mx-auto flex w-fit flex-col gap-8">
            {allPages.map((page) => (
              <EditorPage
                key={page.pageNumber}
                page={page}
                boxes={boxes}
                pdfBytes={pdfBytes}
                scale={scale}
                selectedId={selectedId}
                editingId={editingId}
                placing={placing}
                drag={drag}
                isExtra={page.pageNumber > pages.length}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (id !== editingId) setEditingId(null);
                }}
                onStartEdit={setEditingId}
                onChangeText={(id, text) => patch(id, { newText: text }, false)}
                onPlace={(target, x, y) => {
                  const id = `new-${Date.now()}`;
                  commit((c) => ({
                    ...c,
                    boxes: [
                      ...c.boxes,
                      {
                        id,
                        page: target.pageNumber,
                        text: "New text",
                        newText: "New text",
                        x,
                        y,
                        width: 110,
                        height: 11,
                        size: 11,
                        bold: false,
                        italic: false,
                        serif: true,
                        isNew: true,
                      },
                    ],
                  }));
                  setSelectedId(id);
                  setEditingId(id);
                  setPlacing(false);
                }}
                onDragStart={onDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </div>

        <Inspector
          box={selected}
          pageHeight={allPages[0]?.height ?? 792}
          onChange={(changes) => selected && patch(selected.id, changes)}
          onDelete={removeSelected}
          onRestore={() => selected && patch(selected.id, { deleted: false })}
          onDeselect={() => {
            setSelectedId(null);
            setEditingId(null);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunk/50 px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] text-ink-muted">
          <span
            className={`h-2 w-2 rounded-full ${
              dirty ? (unsaved ? "bg-flame" : "bg-mint") : "bg-line-strong"
            }`}
            aria-hidden="true"
          />
          {dirty
            ? `${operations.length} change${operations.length === 1 ? "" : "s"}${unsaved ? " · not saved" : " · saved"}`
            : "No changes yet — click any line on the page to start"}
        </p>

        {dirty && (
          <Button
            size="sm"
            variant="quiet"
            onClick={() => {
              commit(() => ({
                boxes: boxes
                  .filter((b) => !b.isNew)
                  .map((b) => ({ ...b, deleted: false, movedTo: undefined, newText: undefined })),
                extraPages: 0,
              }));
              setSelectedId(null);
              setReport(null);
              apiSend("/api/document/edits", "PUT", { operations: [] })
                .then(() => setSavedOps("[]"))
                .catch(() => toast.error("Cleared here, but the saved copy remains."));
            }}
          >
            Discard all
          </Button>
        )}
      </div>
    </div>
  );
}
