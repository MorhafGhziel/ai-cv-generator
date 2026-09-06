"use client";

import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/Icons";
import type { BoxState } from "@/components/app/editor/types";

/**
 * Everything you can do to the selected block, in one place.
 *
 * These controls used to live in the toolbar, where they were always present
 * but only sometimes applicable, and where there was no room to explain any of
 * them. A panel that appears with a selection can afford full labels.
 */

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 24, 32];

export default function Inspector({
  box,
  pageHeight,
  onChange,
  onDelete,
  onRestore,
  onDeselect,
}: {
  box: BoxState | null;
  pageHeight: number;
  onChange: (patch: Partial<BoxState>) => void;
  onDelete: () => void;
  onRestore: () => void;
  onDeselect: () => void;
}) {
  if (!box) {
    return (
      <aside className="hidden w-[260px] shrink-0 border-l border-line bg-surface p-5 lg:block">
        <p className="eyebrow mb-3">Nothing selected</p>
        <p className="text-[13px] leading-[1.6] text-ink-muted">
          Click any line on the page to select it. Then type to change the words, drag to move it,
          or use the controls that appear here.
        </p>

        <div className="mt-6 space-y-2.5 border-t border-line pt-5">
          <p className="eyebrow mb-2">Shortcuts</p>
          {[
            ["Enter", "Edit the selected line"],
            ["Esc", "Stop editing / deselect"],
            ["Delete", "Remove the line"],
            ["Arrows", "Nudge by 1pt"],
            ["Shift + arrows", "Nudge by 10pt"],
            ["Ctrl/Cmd + Z", "Undo"],
          ].map(([key, what]) => (
            <p key={key} className="flex items-baseline justify-between gap-3 text-[12px]">
              <kbd className="shrink-0 rounded-[5px] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">
                {key}
              </kbd>
              <span className="text-right text-ink-faint">{what}</span>
            </p>
          ))}
        </div>
      </aside>
    );
  }

  const at = box.movedTo ?? { x: box.x, y: box.y };
  // The panel talks in distance from the top, which is how people read a page;
  // PDF space measures up from the bottom.
  const fromTop = Math.round(pageHeight - at.y);

  return (
    <aside className="hidden w-[260px] shrink-0 overflow-y-auto border-l border-line bg-surface p-5 lg:block">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{box.isNew ? "Added text" : "Line"}</p>
        <button
          type="button"
          onClick={onDeselect}
          className="text-[12px] text-ink-faint transition-colors hover:text-ink"
        >
          Done
        </button>
      </div>

      {box.deleted ? (
        <div className="mt-4 rounded-[12px] border border-danger/25 bg-danger-soft p-4">
          <p className="text-[13px] leading-relaxed text-danger">
            This line will be removed from the exported PDF.
          </p>
          <Button size="sm" variant="ghost" className="mt-3 w-full" onClick={onRestore}>
            Keep it after all
          </Button>
        </div>
      ) : (
        <>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink">Text</span>
            <textarea
              value={box.newText ?? box.text}
              onChange={(e) => onChange({ newText: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-[10px] border border-line bg-sunk px-3 py-2 text-[13px] text-ink outline-none focus:border-flame focus:bg-surface"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink">Size</span>
              <select
                value={SIZES.reduce((a, b) => (Math.abs(b - box.size) < Math.abs(a - box.size) ? b : a))}
                onChange={(e) => onChange({ size: Number(e.target.value) })}
                className="h-9 w-full rounded-[10px] border border-line bg-sunk px-2 text-[13px] text-ink"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} pt
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink">Style</span>
              <div className="flex gap-1.5">
                <StyleToggle
                  active={box.bold}
                  label="B"
                  title="Bold"
                  className="font-bold"
                  onClick={() => onChange({ bold: !box.bold })}
                />
                <StyleToggle
                  active={box.italic}
                  label="I"
                  title="Italic"
                  className="font-serif italic"
                  onClick={() => onChange({ italic: !box.italic })}
                />
                <StyleToggle
                  active={box.serif}
                  label="Aa"
                  title={box.serif ? "Serif" : "Sans-serif"}
                  className="font-serif text-[12px]"
                  onClick={() => onChange({ serif: !box.serif })}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink">From left</span>
              <input
                type="number"
                value={Math.round(at.x)}
                onChange={(e) =>
                  onChange({ movedTo: { page: box.movedTo?.page ?? box.page, x: Number(e.target.value), y: at.y } })
                }
                className="h-9 w-full rounded-[10px] border border-line bg-sunk px-2.5 text-[13px] text-ink outline-none focus:border-flame focus:bg-surface"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink">From top</span>
              <input
                type="number"
                value={fromTop}
                onChange={(e) =>
                  onChange({
                    movedTo: {
                      page: box.movedTo?.page ?? box.page,
                      x: at.x,
                      y: pageHeight - Number(e.target.value),
                    },
                  })
                }
                className="h-9 w-full rounded-[10px] border border-line bg-sunk px-2.5 text-[13px] text-ink outline-none focus:border-flame focus:bg-surface"
              />
            </label>
          </div>

          <Button size="sm" variant="danger" className="mt-5 w-full" onClick={onDelete} icon={<TrashIcon />}>
            {box.isNew ? "Remove this text" : "Delete this line"}
          </Button>
        </>
      )}

      {!box.isNew && (
        <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-ink-faint">
          Originally: {box.text.slice(0, 90)}
        </p>
      )}
    </aside>
  );
}

function StyleToggle({
  active,
  label,
  title,
  className = "",
  onClick,
}: {
  active: boolean;
  label: string;
  title: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 flex-1 rounded-[9px] border text-[13px] transition-colors ${className} ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-sunk text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
