import { z } from "zod";

/**
 * The operation set a free-form CV editor needs, over and above swapping one
 * value for another.
 *
 * Every operation is expressed against the *original* document: an id from the
 * extracted layout, or an absolute position on a page. The stored PDF is never
 * mutated — each export replays the whole list onto a fresh copy — so the
 * editor is undoable by construction and a bad session costs nothing.
 *
 * Positions use PDF user space (origin bottom-left, y upward), because that is
 * what pdf-lib draws in. The client works in screen space with y downward and
 * converts on the way out; doing it there keeps the conversion next to the
 * viewport scale it depends on.
 */

export const boxIdSchema = z.string().trim().min(1).max(64);

export const pdfOperationSchema = z.discriminatedUnion("op", [
  /** Change the words of an existing text run, keeping its position. */
  z.object({
    op: z.literal("edit"),
    id: boxIdSchema,
    text: z.string().max(2000),
  }),
  /** Remove an existing text run entirely. */
  z.object({
    op: z.literal("delete"),
    id: boxIdSchema,
  }),
  /** Take an existing run out of its place and redraw it somewhere else. */
  z.object({
    op: z.literal("move"),
    id: boxIdSchema,
    page: z.number().int().min(1).max(50),
    x: z.number().min(-2000).max(4000),
    y: z.number().min(-2000).max(4000),
    text: z.string().max(2000).optional(),
    size: z.number().min(4).max(96).optional(),
  }),
  /** Draw text that was not in the document at all. */
  z.object({
    op: z.literal("add"),
    page: z.number().int().min(1).max(50),
    x: z.number().min(-2000).max(4000),
    y: z.number().min(-2000).max(4000),
    text: z.string().min(1).max(2000),
    size: z.number().min(4).max(96).default(11),
    bold: z.boolean().default(false),
    italic: z.boolean().default(false),
    serif: z.boolean().default(true),
  }),
  /** Append a blank page matching the document's existing page size. */
  z.object({
    op: z.literal("addPage"),
    after: z.number().int().min(0).max(50).default(0),
  }),
]);

export type PdfOperation = z.infer<typeof pdfOperationSchema>;

export const operationsSchema = z
  .array(pdfOperationSchema)
  .max(400, "That's more changes than one export can carry.");

/**
 * A text run as the editor sees it: stable id, words, and where it sits.
 * `id` encodes page and index so it survives a round trip without the server
 * having to remember anything between requests.
 */
export interface EditableBox {
  id: string;
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  bold: boolean;
  italic: boolean;
  serif: boolean;
}

/**
 * Identifies a text block by where it sits, not by its position in a list.
 *
 * An index-based id (`p3-l12`) is only stable while the grouping algorithm is.
 * Splitting two-column rows renumbered every block after the first split, which
 * silently invalidated saved work: operations pointed at lines that had moved
 * or no longer existed, and the edits were dropped without explanation.
 *
 * Coordinates come from the PDF itself and do not move, so an id minted today
 * still resolves after the grouping changes again.
 */
export function boxId(page: number, x: number, y: number): string {
  return `p${page}-x${Math.round(x)}y${Math.round(y)}`;
}
