import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  StandardFonts,
  decodePDFRawStream,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { extractLayout, type PdfLayout, type TextLine } from "@/lib/pdf-layout";
import { removeTextFromStream } from "@/lib/pdf-text-ops";
import { boxId, type EditableBox, type PdfOperation } from "@/lib/pdf-ops";

/**
 * Replays a list of editor operations onto a copy of the original PDF.
 *
 * The design survives because the page itself is never rebuilt: the original
 * content stream keeps drawing every rule, block of colour, logo and glyph that
 * was not touched. Only the runs the user actually changed are removed from the
 * text layer and redrawn.
 *
 * Removal genuinely deletes the drawing operators rather than painting over
 * them. An applicant tracking system reads the text layer, so a value that is
 * merely hidden would still be parsed — a "moved" line would be read twice, a
 * "deleted" one would still be there.
 */

const PAGE_MARGIN = 24;

interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

export interface ComposeOutcome {
  op: PdfOperation["op"];
  id?: string;
  applied: boolean;
  reason?: string;
  /** Set when the edit landed, but with a caveat the user should know about. */
  warning?: string;
}

export interface ComposeOptions {
  /**
   * When the old text cannot be deleted from the text layer, paint over it and
   * carry on rather than refusing.
   *
   * Off by default, because the covered text stays machine-readable: an
   * applicant tracking system parses the text layer, not the pixels, and would
   * read both the old value and the new one. That is a real cost, so it is the
   * user's call rather than a silent fallback.
   */
  allowCover?: boolean;
}

export interface ComposeResult {
  bytes: Uint8Array;
  outcomes: ComposeOutcome[];
}

/** Flattens a layout into the boxes the editor manipulates. */
export function toEditableBoxes(layout: PdfLayout): EditableBox[] {
  const boxes: EditableBox[] = [];

  for (const page of layout.pages) {
    page.lines.forEach((line) => {
      const run = line.runs[0];
      boxes.push({
        id: boxId(page.pageNumber, line.x, line.y),
        page: page.pageNumber,
        text: line.text,
        x: line.x,
        y: line.y,
        width: line.endX - line.x,
        height: line.size,
        size: line.size,
        bold: run?.bold ?? false,
        italic: run?.italic ?? false,
        serif: run?.serif ?? true,
      });
    });
  }

  return boxes;
}

export async function composePdf(
  original: Uint8Array,
  operations: PdfOperation[],
  { allowCover = false }: ComposeOptions = {},
): Promise<ComposeResult> {
  const doc = await PDFDocument.load(original.slice());
  const layout = await extractLayout(original);

  const serif: FontSet = {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const sans: FontSet = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };

  // Index the original lines so an id resolves without rescanning.
  const lines = new Map<string, { line: TextLine; page: number }>();
  for (const page of layout.pages) {
    page.lines.forEach((line) => {
      lines.set(boxId(page.pageNumber, line.x, line.y), { line, page: page.pageNumber });
    });
  }

  const outcomes: ComposeOutcome[] = [];

  /**
   * Content streams are decoded once per page and erased from in memory.
   *
   * Re-reading after each removal does not work: writing a stream back turns it
   * into a type `decodePDFRawStream` will not accept, so the second erase on a
   * page silently failed. Worse, pdf-lib appends its own drawing operators to
   * the page, so writing Contents after a drawText would discard it. Hence two
   * passes — erase everything, flush, then draw.
   */
  const erased = new Map<number, string>();
  /** Rectangles to paint where the text layer could not be edited. */
  const covers: { page: number; line: TextLine }[] = [];

  /**
   * Erases a line, or falls back to covering it when the user has allowed that.
   * Returns null when neither is possible.
   */
  function eraseOrCover(pageNumber: number, line: TextLine): "erased" | "covered" | null {
    if (erase(pageNumber, line)) return "erased";
    if (!allowCover) return null;
    covers.push({ page: pageNumber, line });
    return "covered";
  }

  function contentOf(pageNumber: number): string | null {
    const cached = erased.get(pageNumber);
    if (cached !== undefined) return cached;

    const node = doc.getPage(pageNumber - 1).node;
    const resolved = node.context.lookup(node.get(PDFName.of("Contents")));
    if (!(resolved instanceof PDFRawStream)) return null;

    try {
      const source = Buffer.from(decodePDFRawStream(resolved).decode()).toString("latin1");
      erased.set(pageNumber, source);
      return source;
    } catch {
      return null;
    }
  }

  /** Removes a line's runs from the in-memory stream for its page. */
  function erase(pageNumber: number, line: TextLine): boolean {
    const source = contentOf(pageNumber);
    if (source === null) return false;

    // The whole line is a far more distinctive anchor than any single run, and
    // the scanner already spans consecutive operators, so try it first.
    let working = removeTextFromStream(source, line.text);

    if (working === null) {
      working = source;
      let any = false;
      for (const run of line.runs) {
        if (!run.text.trim()) continue;
        const next = removeTextFromStream(working, run.text);
        if (next !== null) {
          working = next;
          any = true;
        }
      }
      if (!any) return false;
    }

    erased.set(pageNumber, working);
    return true;
  }

  // Pages are added first so later operations can target them, and appending
  // never shifts the index of an existing page.
  for (const op of operations) {
    if (op.op !== "addPage") continue;
    const template = doc.getPage(Math.min(op.after, doc.getPageCount() - 1) || 0);
    const { width, height } = template.getSize();
    doc.addPage([width, height]);
    outcomes.push({ op: "addPage", applied: true });
  }

  // Pass one: decide every operation and record what to draw. Nothing is drawn
  // yet, because pdf-lib appends drawing operators to the page and flushing an
  // erased content stream afterwards would discard them.
  interface PendingDraw {
    page: number;
    text: string;
    x: number;
    y: number;
    size: number;
    style: { serif: boolean; bold: boolean; italic: boolean };
  }
  const draws: PendingDraw[] = [];

  for (const op of operations) {
    switch (op.op) {
      case "addPage":
        break;

      case "delete": {
        const found = lines.get(op.id);
        if (!found) {
          outcomes.push({ op: op.op, id: op.id, applied: false, reason: MISSING });
          break;
        }
        const how = eraseOrCover(found.page, found.line);
        outcomes.push({
          op: op.op,
          id: op.id,
          applied: how !== null,
          reason: how === null ? UNREADABLE : undefined,
          warning: how === "covered" ? COVERED : undefined,
        });
        break;
      }

      case "edit": {
        const found = lines.get(op.id);
        if (!found) {
          outcomes.push({ op: op.op, id: op.id, applied: false, reason: MISSING });
          break;
        }
        const editHow = eraseOrCover(found.page, found.line);
        if (editHow === null) {
          outcomes.push({ op: op.op, id: op.id, applied: false, reason: UNREADABLE });
          break;
        }
        draws.push({
          page: found.page,
          text: op.text,
          x: found.line.x,
          y: found.line.y,
          size: found.line.size,
          style: styleOf(found.line),
        });
        outcomes.push({
          op: op.op,
          id: op.id,
          applied: true,
          warning: editHow === "covered" ? COVERED : undefined,
        });
        break;
      }

      case "move": {
        const found = lines.get(op.id);
        if (!found) {
          outcomes.push({ op: op.op, id: op.id, applied: false, reason: MISSING });
          break;
        }
        if (op.page < 1 || op.page > doc.getPageCount()) {
          outcomes.push({ op: op.op, id: op.id, applied: false, reason: `Page ${op.page} doesn't exist.` });
          break;
        }
        const moveHow = eraseOrCover(found.page, found.line);
        if (moveHow === null) {
          outcomes.push({ op: op.op, id: op.id, applied: false, reason: UNREADABLE });
          break;
        }
        draws.push({
          page: op.page,
          text: op.text ?? found.line.text,
          x: op.x,
          y: op.y,
          size: op.size ?? found.line.size,
          style: styleOf(found.line),
        });
        outcomes.push({
          op: op.op,
          id: op.id,
          applied: true,
          warning: moveHow === "covered" ? COVERED : undefined,
        });
        break;
      }

      case "add": {
        if (op.page < 1 || op.page > doc.getPageCount()) {
          outcomes.push({ op: op.op, applied: false, reason: `Page ${op.page} doesn't exist.` });
          break;
        }
        draws.push({
          page: op.page,
          text: op.text,
          x: op.x,
          y: op.y,
          size: op.size,
          style: { serif: op.serif, bold: op.bold, italic: op.italic },
        });
        outcomes.push({ op: op.op, applied: true });
        break;
      }
    }
  }

  // Pass two: flush the erased streams, then draw on top of them.
  for (const [pageNumber, content] of erased) {
    const node = doc.getPage(pageNumber - 1).node;
    node.set(
      PDFName.of("Contents"),
      node.context.register(node.context.flateStream(Buffer.from(content, "latin1"))),
    );
  }

  // Covers go down before the new text, and after the erased streams are
  // flushed, so nothing paints over the words it was meant to reveal.
  for (const { page: pageNumber, line } of covers) {
    const page = doc.getPage(pageNumber - 1);
    const descent = line.size * 0.25;
    page.drawRectangle({
      x: line.x - 1,
      y: line.y - descent - 1,
      width: line.endX - line.x + 3,
      height: line.size + descent + 2,
      color: rgb(1, 1, 1),
    });
  }

  for (const draw of draws) {
    drawLine(doc.getPage(draw.page - 1), draw.text, draw.x, draw.y, draw.size, draw.style, serif, sans);
  }

  return { bytes: await doc.save(), outcomes };
}

const MISSING = "That line is no longer in the document.";

function styleOf(line: TextLine): { serif: boolean; bold: boolean; italic: boolean } {
  const run = line.runs[0];
  return { serif: run?.serif ?? true, bold: run?.bold ?? false, italic: run?.italic ?? false };
}

const UNREADABLE =
  "This PDF stores that text in a way we can't remove, so the old words would stay readable underneath. Left as it was — turn on \"Cover text we can't remove\" to change it anyway.";

const COVERED =
  "Painted over rather than deleted: the old text is hidden but still readable to software that parses the PDF.";

/**
 * Draws text, wrapping only when it would otherwise run off the page. A CV line
 * is short by nature, so this is a guard rail rather than a layout engine.
 */
function drawLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  style: { serif: boolean; bold: boolean; italic: boolean } | undefined,
  serif: FontSet,
  sans: FontSet,
): void {
  if (!text.trim()) return;

  const set = style?.serif === false ? sans : serif;
  const font = style?.bold ? set.bold : style?.italic ? set.italic : set.regular;

  const maxWidth = page.getWidth() - x - PAGE_MARGIN;
  const lineHeight = size * 1.35;
  let cursorY = y;

  for (const paragraph of text.split("\n")) {
    for (const line of wrap(paragraph, font, size, maxWidth)) {
      page.drawText(line, { x, y: cursorY, size, font, color: rgb(0, 0, 0) });
      cursorY -= lineHeight;
    }
  }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  if (maxWidth <= 0 || font.widthOfTextAtSize(text, size) <= maxWidth) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
