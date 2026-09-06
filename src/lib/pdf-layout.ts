import { getDocumentProxy } from "unpdf";

/**
 * Reads a PDF's *positioned* text, which `extractText` discards.
 *
 * In-place editing depends entirely on this: to change a value without
 * disturbing the design you must know exactly where it sits, how wide it is,
 * and roughly what drew it.
 *
 * The awkward part is that PDF.js emits text in fragments decided by the
 * producer, not by meaning — "https://github.com/Mo", "rhafG", "hziel" are
 * three separate items on one line. Nothing can be matched until those are
 * stitched back into lines.
 */

export interface TextRun {
  text: string;
  /** PDF user space: origin bottom-left, y increases upward. */
  x: number;
  y: number;
  width: number;
  /** Rendered glyph size in points, derived from the transform matrix. */
  size: number;
  fontName: string;
  /** pdf.js reports these from the embedded font descriptor when present. */
  serif: boolean;
  bold: boolean;
  italic: boolean;
}

export interface TextLine {
  /** Runs joined in reading order, which is what callers search against. */
  text: string;
  runs: TextRun[];
  x: number;
  y: number;
  /** Right edge of the last run — where an append would start. */
  endX: number;
  size: number;
}

export interface PdfPageLayout {
  pageNumber: number;
  width: number;
  height: number;
  lines: TextLine[];
}

export interface PdfLayout {
  pageCount: number;
  pages: PdfPageLayout[];
}

/** Two runs belong to the same line when their baselines are this close. */
const BASELINE_TOLERANCE = 2.5;
/** A gap wider than this fraction of the font size implies a space between runs. */
const SPACE_RATIO = 0.22;
/** A gap wider than this multiple of the font size is a column break, not a space. */
const COLUMN_GAP_RATIO = 1.6;

export async function extractLayout(bytes: Uint8Array): Promise<PdfLayout> {
  // pdf.js takes ownership of the buffer it is handed and detaches it, leaving
  // the caller's array unusable. Anything that needs to read those bytes
  // afterwards — pdf-lib, to write the edit — would fail with "detached
  // ArrayBuffer". Copying here keeps that surprise inside this module.
  const pdf = await getDocumentProxy(bytes.slice());
  const pages: PdfPageLayout[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const styles = (content.styles ?? {}) as Record<
      string,
      { fontFamily?: string; ascent?: number; descent?: number }
    >;

    const runs: TextRun[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;

      const transform = item.transform as number[];
      const style = styles[item.fontName] ?? {};
      const family = String(style.fontFamily ?? "").toLowerCase();
      const name = String(item.fontName ?? "").toLowerCase();

      runs.push({
        text: item.str,
        x: transform[4],
        y: transform[5],
        width: item.width ?? 0,
        // The matrix encodes scale and rotation; its magnitude is the size.
        size: Math.hypot(transform[0], transform[1]),
        fontName: String(item.fontName ?? ""),
        serif: !family.includes("sans"),
        // Subset fonts often lose their real names, so this is a best effort.
        bold: /bold|black|heavy|semibold/.test(name) || /bold/.test(family),
        italic: /italic|oblique/.test(name) || /italic/.test(family),
      });
    }

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      lines: groupIntoLines(runs),
    });
  }

  return { pageCount: pdf.numPages, pages };
}

/**
 * Buckets runs by baseline, then splits each row wherever a wide horizontal gap
 * shows that it is really two blocks rather than one line.
 *
 * CV rows are frequently two-column — an employer left-aligned with dates
 * right-aligned, a university with its city. Treating that as a single line is
 * wrong twice over: editing it collapses two independently positioned blocks
 * into one left-aligned string, and any attempt to remove it has to span half
 * the page, which is exactly the case the removal guard refuses.
 */
function groupIntoLines(runs: TextRun[]): TextLine[] {
  const buckets: TextRun[][] = [];

  for (const run of [...runs].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const bucket = buckets.find(
      (b) => Math.abs(b[0].y - run.y) <= BASELINE_TOLERANCE,
    );
    if (bucket) bucket.push(run);
    else buckets.push([run]);
  }

  const segments: TextRun[][] = [];
  for (const bucket of buckets) {
    const ordered = [...bucket].sort((a, b) => a.x - b.x);
    let current: TextRun[] = [ordered[0]];

    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1];
      const run = ordered[i];
      const gap = run.x - (previous.x + previous.width);
      // A word space is well under half the font size; a column break is
      // several times it.
      const columnBreak = Math.max(run.size * COLUMN_GAP_RATIO, 10);

      if (gap > columnBreak) {
        segments.push(current);
        current = [run];
      } else {
        current.push(run);
      }
    }
    segments.push(current);
  }

  return segments.map((segment) => {
    const ordered = segment;
    const last = ordered[ordered.length - 1];

    // Reinsert the spaces the producer left implicit in the positions.
    let text = "";
    for (let i = 0; i < ordered.length; i++) {
      const run = ordered[i];
      if (i > 0) {
        const previous = ordered[i - 1];
        const gap = run.x - (previous.x + previous.width);
        const needsSpace =
          gap > run.size * SPACE_RATIO &&
          !text.endsWith(" ") &&
          !run.text.startsWith(" ");
        if (needsSpace) text += " ";
      }
      text += run.text;
    }

    return {
      text,
      runs: ordered,
      x: ordered[0].x,
      y: ordered[0].y,
      endX: last.x + last.width,
      size: Math.max(...ordered.map((r) => r.size)),
    };
  });
}

/**
 * Locates `needle` within a line and returns the runs that render it, plus the
 * box they occupy. Matching is whitespace-insensitive because the reinserted
 * spaces above are inferred, not authoritative.
 */
export interface Match {
  pageNumber: number;
  line: TextLine;
  runs: TextRun[];
  x: number;
  y: number;
  width: number;
  size: number;
}

export function findText(layout: PdfLayout, needle: string): Match[] {
  const target = normalise(needle);
  if (!target) return [];

  const matches: Match[] = [];

  for (const page of layout.pages) {
    for (const line of page.lines) {
      if (!normalise(line.text).includes(target)) continue;

      // Narrow to the runs that actually overlap the needle, so replacing a
      // phone number does not also cover the label beside it.
      const runs = runsCovering(line, target);
      if (runs.length === 0) continue;

      const first = runs[0];
      const last = runs[runs.length - 1];
      matches.push({
        pageNumber: page.pageNumber,
        line,
        runs,
        x: first.x,
        y: first.y,
        width: last.x + last.width - first.x,
        size: Math.max(...runs.map((r) => r.size)),
      });
    }
  }

  return matches;
}

/** Walks the line's runs accumulating text until the needle is covered. */
function runsCovering(line: TextLine, target: string): TextRun[] {
  for (let start = 0; start < line.runs.length; start++) {
    let accumulated = "";
    for (let end = start; end < line.runs.length; end++) {
      accumulated += line.runs[end].text;
      if (normalise(accumulated).includes(target)) {
        return line.runs.slice(start, end + 1);
      }
    }
  }
  return [];
}

function normalise(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}
