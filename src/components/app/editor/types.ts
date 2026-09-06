import type { EditableBox } from "@/lib/pdf-ops";

/**
 * A text block as the editor holds it: the original, plus whatever the user has
 * changed about it.
 *
 * Edits are kept *beside* the original rather than overwriting it, so the
 * canvas can cover exactly what the PDF drew, the inspector can show what a
 * line used to say, and reverting is dropping a field rather than reconstructing
 * a value.
 */
export interface BoxState extends EditableBox {
  deleted?: boolean;
  movedTo?: { page: number; x: number; y: number };
  newText?: string;
  /** Created by the user, so it has no counterpart in the original document. */
  isNew?: boolean;
}

/** Everything undo/redo captures. */
export interface DocState {
  boxes: BoxState[];
  /** Blank pages appended beyond the original document. */
  extraPages: number;
}

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

/** True once a block differs from what the PDF originally drew. */
export function isChanged(box: BoxState): boolean {
  return Boolean(
    box.deleted ||
      box.movedTo ||
      (box.newText !== undefined && box.newText !== box.text) ||
      box.isNew,
  );
}
