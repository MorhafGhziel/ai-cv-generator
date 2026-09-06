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
import { extractLayout, findText, type Match, type PdfLayout } from "@/lib/pdf-layout";
import { removeTextFromStream } from "@/lib/pdf-text-ops";

/**
 * Edits values inside an existing PDF without rebuilding it, so the author's
 * own design survives untouched.
 *
 * What this can and cannot do is dictated by the format, not by effort:
 *
 *  - REPLACE covers the old glyphs with a filled rectangle and draws new text
 *    at the same baseline. Reliable for short, single-line values sitting on
 *    their own — a phone number, an email, a location.
 *  - APPEND draws into whitespace after an existing line. No covering, so no
 *    risk of a colour mismatch. This is the "add my phone number" case.
 *  - Neither can reflow. If new text is wider than the space available, the
 *    edit is refused rather than allowed to overlap what follows.
 *
 * Embedded fonts in CVs are almost always subsetted — they contain only the
 * glyphs the document already uses — so the original typeface cannot be reused
 * for new characters. New text is drawn in the closest standard font. On a
 * serif CV that is visually near-identical; on a distinctive display face it
 * will differ, which is why the UI shows a preview before download.
 */

export type EditKind = "replace" | "append";

export interface PdfEdit {
  kind: EditKind;
  /** For replace: the existing text to find. For append: the line to sit after. */
  target: string;
  /** The text to draw. For replace, "" removes the value. */
  value: string;
  /** Separator inserted before an appended value, e.g. "  |  ". */
  separator?: string;
}

export interface EditOutcome {
  edit: PdfEdit;
  applied: boolean;
  reason?: string;
}

export interface EditResult {
  bytes: Uint8Array;
  outcomes: EditOutcome[];
}

/**
 * Background used to cover replaced glyphs. CV pages are overwhelmingly white;
 * a coloured panel would show a white patch, which is why replacements are
 * previewed rather than applied blind.
 */
const COVER = rgb(1, 1, 1);
/** Extra margin around a cover so antialiased glyph edges do not survive. */
const COVER_PADDING = 1;
/** Keep-clear zone at the page edge, roughly a half inch. */
const PAGE_MARGIN = 36;

interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

export async function applyPdfEdits(
  original: Uint8Array,
  edits: PdfEdit[],
): Promise<EditResult> {
  // Both readers get their own copy: pdf-lib mutates what it loads, and
  // `extractLayout` internally hands its copy to pdf.js, which detaches it.
  const doc = await PDFDocument.load(original.slice());
  const layout = await extractLayout(original);

  const serifFonts: FontSet = {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const sansFonts: FontSet = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };

  const outcomes: EditOutcome[] = [];

  for (const edit of edits) {
    outcomes.push(
      edit.kind === "replace"
        ? applyReplace(doc, layout, edit, serifFonts, sansFonts)
        : applyAppend(doc, layout, edit, serifFonts, sansFonts),
    );
  }

  return { bytes: await doc.save(), outcomes };
}

function pickFont(match: { runs: { serif: boolean; bold: boolean; italic: boolean }[] }, serifFonts: FontSet, sansFonts: FontSet): PDFFont {
  const run = match.runs[0];
  const set = run.serif ? serifFonts : sansFonts;
  if (run.bold) return set.bold;
  if (run.italic) return set.italic;
  return set.regular;
}

function applyReplace(
  doc: PDFDocument,
  layout: PdfLayout,
  edit: PdfEdit,
  serifFonts: FontSet,
  sansFonts: FontSet,
): EditOutcome {
  const matches = findText(layout, edit.target);

  if (matches.length === 0) {
    return { edit, applied: false, reason: `"${edit.target}" was not found in the document.` };
  }
  if (matches.length > 1) {
    // Editing the wrong instance is worse than not editing: refuse and say so.
    return {
      edit,
      applied: false,
      reason: `"${edit.target}" appears ${matches.length} times, so it is ambiguous which to change.`,
    };
  }

  const match = matches[0];
  const page = doc.getPage(match.pageNumber - 1);
  const font = pickFont(match, serifFonts, sansFonts);

  // Available width runs to the end of the matched text, plus any slack before
  // whatever comes next on the line.
  const available = availableWidth(layout, match);
  const needed = edit.value ? font.widthOfTextAtSize(edit.value, match.size) : 0;

  if (needed > available) {
    return {
      edit,
      applied: false,
      reason: `"${edit.value}" needs ${Math.ceil(needed)}pt but only ${Math.floor(available)}pt is free on that line. Text cannot reflow, so this would overlap.`,
    };
  }

  // Delete the old value from the text layer first. Covering it with a
  // rectangle only hides it from a human — an ATS reads the text, and would
  // find both the old and the new value.
  if (!deleteFromTextLayer(page, edit.target)) {
    return {
      edit,
      applied: false,
      reason:
        "This PDF stores its text in a way we can't safely edit — the old value would stay readable underneath, so the CV would carry both. Nothing was changed.",
    };
  }

  const descent = match.size * 0.25;
  page.drawRectangle({
    x: match.x - COVER_PADDING,
    y: match.y - descent - COVER_PADDING,
    width: match.width + COVER_PADDING * 2,
    height: match.size + COVER_PADDING * 2,
    color: COVER,
  });

  if (edit.value) {
    page.drawText(edit.value, {
      x: match.x,
      y: match.y,
      size: match.size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return { edit, applied: true };
}

/**
 * Rewrites the page's content stream with `target` removed.
 *
 * Returns false when the value cannot be located as text — a subset font with a
 * custom CMap stores glyph ids, not characters — which the caller treats as a
 * reason to decline rather than to proceed with a cover-up.
 */
function deleteFromTextLayer(page: PDFPage, target: string): boolean {
  const context = page.node.context;
  const contents = page.node.get(PDFName.of("Contents"));
  const resolved = context.lookup(contents);

  // A page may split its content across several streams; only the simple
  // single-stream case is handled, which covers the CVs people upload.
  if (!(resolved instanceof PDFRawStream)) return false;

  let decoded: Uint8Array;
  try {
    decoded = decodePDFRawStream(resolved).decode();
  } catch {
    return false;
  }

  // latin1 round-trips every byte unchanged, so the stream can be treated as
  // text and written back without corrupting binary segments.
  const source = Buffer.from(decoded).toString("latin1");
  const rewritten = removeTextFromStream(source, target);
  if (rewritten === null) return false;

  page.node.set(
    PDFName.of("Contents"),
    context.register(context.flateStream(Buffer.from(rewritten, "latin1"))),
  );
  return true;
}

function applyAppend(
  doc: PDFDocument,
  layout: PdfLayout,
  edit: PdfEdit,
  serifFonts: FontSet,
  sansFonts: FontSet,
): EditOutcome {
  const matches = findText(layout, edit.target);

  if (matches.length === 0) {
    return { edit, applied: false, reason: `"${edit.target}" was not found, so there is nowhere to append.` };
  }

  const match = matches[0];
  const pageLayout = layout.pages[match.pageNumber - 1];
  const page = doc.getPage(match.pageNumber - 1);
  const font = pickFont(match, serifFonts, sansFonts);

  const inline = `${edit.separator ?? "  |  "}${edit.value}`;
  const inlineWidth = font.widthOfTextAtSize(inline, match.size);

  // First choice: continue the existing line. Append at the end of the whole
  // line, not the matched fragment.
  const startX = match.line.endX;
  const roomOnLine = pageLayout.width - startX - PAGE_MARGIN;

  if (inlineWidth <= roomOnLine) {
    page.drawText(inline, {
      x: startX,
      y: match.line.y,
      size: match.size,
      font,
      color: rgb(0, 0, 0),
    });
    return { edit, applied: true };
  }

  // Contact lines are often full to the margin — the common case for "add my
  // phone number". Fall back to a new baseline underneath, but only into
  // genuine whitespace, never on top of the next line.
  const below = nextLineBelow(pageLayout.lines, match.line);
  const gap = below ? match.line.y - below.y : match.line.y - PAGE_MARGIN;
  const lineHeight = match.size * 1.5;

  if (gap < lineHeight * 2) {
    return {
      edit,
      applied: false,
      reason:
        `That line runs to the page margin (${Math.ceil(inlineWidth)}pt needed, ${Math.max(0, Math.floor(roomOnLine))}pt free) ` +
        `and there is no clear space beneath it either. Adding this would overlap existing text.`,
    };
  }

  const valueWidth = font.widthOfTextAtSize(edit.value, match.size);
  if (valueWidth > pageLayout.width - match.line.x - PAGE_MARGIN) {
    return {
      edit,
      applied: false,
      reason: `"${edit.value}" is too wide to fit on its own line here.`,
    };
  }

  page.drawText(edit.value, {
    x: match.line.x,
    y: match.line.y - lineHeight,
    size: match.size,
    font,
    color: rgb(0, 0, 0),
  });

  return { edit, applied: true };
}

/** The nearest line below `line` on the page, by baseline. */
function nextLineBelow(lines: PdfLayout["pages"][number]["lines"], line: { y: number }) {
  return lines
    .filter((candidate) => candidate.y < line.y - 1)
    .sort((a, b) => b.y - a.y)[0];
}

/**
 * How much horizontal room a replacement may occupy: from the start of the
 * match to whichever comes first — the next run on the line, or the page margin.
 */
function availableWidth(layout: PdfLayout, match: Match): number {
  const page = layout.pages[match.pageNumber - 1];
  const lastRun = match.runs[match.runs.length - 1];

  const next = match.line.runs
    .filter((run) => run.x > lastRun.x)
    .sort((a, b) => a.x - b.x)
    .find((run) => !match.runs.includes(run));

  const limit = next ? next.x - 2 : page.width - PAGE_MARGIN;
  return Math.max(0, limit - match.x);
}
