"use client";

import { useRef } from "react";
import PdfPageCanvas from "@/components/app/PdfPageCanvas";
import { isChanged, type BoxState, type PageInfo } from "@/components/app/editor/types";

/**
 * One page: the rendered PDF underneath, editable blocks on top.
 *
 * Dragging snaps to the edges of other blocks, and the guide it snapped to is
 * drawn. Without that, moving a line into a column that already exists means
 * eyeballing a number, and it never quite lines up.
 */

/** How close a block must come to another edge before it snaps, in points. */
const SNAP = 4;

export interface DragState {
  id: string;
  /** Edges the block has snapped to, drawn as guides while dragging. */
  guides: { x?: number; y?: number };
}

export default function EditorPage({
  page,
  boxes,
  pdfBytes,
  scale,
  selectedId,
  editingId,
  placing,
  drag,
  isExtra,
  onSelect,
  onStartEdit,
  onChangeText,
  onPlace,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  page: PageInfo;
  boxes: BoxState[];
  pdfBytes: Uint8Array | null;
  scale: number;
  selectedId: string | null;
  editingId: string | null;
  placing: boolean;
  drag: DragState | null;
  isExtra: boolean;
  onSelect: (id: string | null) => void;
  onStartEdit: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
  onPlace: (page: PageInfo, x: number, y: number) => void;
  onDragStart: (box: BoxState, page: PageInfo, event: React.PointerEvent) => void;
  onDragMove: (page: PageInfo, event: React.PointerEvent) => void;
  onDragEnd: () => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  const onPage = boxes.filter((b) => (b.movedTo?.page ?? b.page) === page.pageNumber);
  const covers = boxes.filter(
    (b) => !b.isNew && b.page === page.pageNumber && isChanged(b),
  );

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 font-mono text-[11px] text-ink-faint">
        Page {page.pageNumber}
        {isExtra && (
          <span className="rounded-full bg-flame-soft px-2 py-0.5 text-[10px] text-flame-ink">
            added
          </span>
        )}
      </p>

      <div
        ref={surfaceRef}
        className={`relative select-none ${placing ? "cursor-crosshair" : ""}`}
        style={{ width: page.width * scale, height: page.height * scale }}
        onPointerDown={(e) => {
          // A click on empty page area deselects, which is what people expect.
          if (e.target === e.currentTarget && !placing) onSelect(null);
        }}
        onClick={(e) => {
          if (!placing) return;
          const rect = e.currentTarget.getBoundingClientRect();
          onPlace(
            page,
            (e.clientX - rect.left) / scale,
            page.height - (e.clientY - rect.top) / scale,
          );
        }}
        onPointerMove={(e) => onDragMove(page, e)}
        onPointerUp={onDragEnd}
      >
        {isExtra ? (
          <div className="absolute inset-0 rounded-[4px] border border-dashed border-line-strong bg-white shadow-[var(--shadow-lift)]" />
        ) : (
          <PdfPageCanvas pdfBytes={pdfBytes} pageNumber={page.pageNumber} scale={scale} />
        )}

        {/* Hide the original glyphs of anything the user changed, so the page
            always shows what the export will contain. */}
        {covers.map((box) => (
          <div
            key={`cover-${box.id}`}
            className="pointer-events-none absolute bg-white"
            style={{
              left: (box.x - 1) * scale,
              top: (page.height - box.y - box.size - 1) * scale,
              width: (box.width + 3) * scale,
              height: (box.size * 1.3 + 2) * scale,
            }}
          />
        ))}

        {/* Alignment guides for the block being dragged. */}
        {drag?.guides.x !== undefined && (
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-flame/70"
            style={{ left: drag.guides.x * scale }}
          />
        )}
        {drag?.guides.y !== undefined && (
          <div
            className="pointer-events-none absolute left-0 w-full border-t border-flame/70"
            style={{ top: (page.height - drag.guides.y) * scale }}
          />
        )}

        {onPage.map((box) => {
          const at = box.movedTo ?? { x: box.x, y: box.y };
          const selected = selectedId === box.id;
          const editing = editingId === box.id;
          const changed = isChanged(box);
          const text = box.newText ?? box.text;

          return (
            <div
              key={box.id}
              onPointerDown={(e) => {
                if (editing) return;
                onDragStart(box, page, e);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(box.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartEdit(box.id);
              }}
              className={`absolute rounded-[3px] transition-[outline-color,background-color] ${
                editing ? "cursor-text" : "cursor-grab active:cursor-grabbing"
              } ${
                box.deleted
                  ? "outline-dashed outline-1 outline-danger/60"
                  : selected
                    ? "bg-flame/[0.07] outline outline-2 outline-flame"
                    : changed
                      ? "outline outline-1 outline-flame/35"
                      : "hover:bg-flame/[0.05] hover:outline hover:outline-1 hover:outline-flame/40"
              }`}
              style={{
                left: at.x * scale,
                // PDF baselines sit at the bottom of the glyphs.
                top: (page.height - at.y - box.size) * scale,
                minWidth: Math.max(box.width, 14) * scale,
                height: box.size * 1.35 * scale,
              }}
              title={box.deleted ? "Deleted — select to restore" : box.text}
            >
              {!box.deleted && changed && !editing && (
                <span
                  className="pointer-events-none absolute left-0 top-0 whitespace-pre text-ink"
                  style={{
                    fontSize: box.size * scale,
                    lineHeight: `${box.size * 1.25 * scale}px`,
                    fontFamily: box.serif
                      ? "'Times New Roman', Times, serif"
                      : "Helvetica, Arial, sans-serif",
                    fontWeight: box.bold ? 700 : 400,
                    fontStyle: box.italic ? "italic" : "normal",
                  }}
                >
                  {text}
                </span>
              )}

              {editing && !box.deleted && (
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => onChangeText(box.id, e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute inset-0 w-full min-w-[80px] rounded-[3px] border-none bg-white px-0.5 text-ink outline-none ring-2 ring-flame"
                  style={{
                    fontSize: Math.max(9, box.size * scale),
                    fontFamily: box.serif
                      ? "'Times New Roman', Times, serif"
                      : "Helvetica, Arial, sans-serif",
                    fontWeight: box.bold ? 700 : 400,
                    fontStyle: box.italic ? "italic" : "normal",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Nearest edge of another block within the snap threshold, if any. */
export function findSnap(
  value: number,
  candidates: number[],
): { value: number; guide: number } | null {
  let best: { value: number; guide: number } | null = null;
  let bestDistance = SNAP;

  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { value: candidate, guide: candidate };
    }
  }
  return best;
}
