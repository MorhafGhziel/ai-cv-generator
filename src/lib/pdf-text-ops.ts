/**
 * Removes a value from a PDF page's content stream.
 *
 * Painting a white rectangle over text hides it from a reader but leaves it in
 * the document. Applicant tracking systems read the text layer, not the pixels,
 * so a "replaced" email would still be parsed as the old one — the CV would
 * carry two. For an app whose entire purpose is machine-readable CVs, that is
 * worse than declining the edit.
 *
 * PDF draws text with two operators:
 *   (string) Tj              a single run
 *   [ (a) -12 (b) ] TJ       runs with kerning adjustments between them
 *
 * A value is routinely spread across several of these, so operators are scanned
 * in order and accumulated until the target is covered, then dropped whole.
 *
 * This only works when the font uses a straightforward encoding. Subset fonts
 * with a custom CMap store glyph indices rather than characters, and the value
 * is then genuinely not present as text — which is why every removal is
 * verified by the caller rather than assumed.
 */

interface TextOperator {
  /** Byte offsets into the content stream. */
  start: number;
  end: number;
  /** The literal characters this operator paints. */
  text: string;
}

/** Reads a PDF string literal starting at `(`, honouring escapes and nesting. */
function readLiteral(source: string, from: number): { value: string; next: number } | null {
  if (source[from] !== "(") return null;

  let depth = 0;
  let value = "";

  for (let i = from; i < source.length; i++) {
    const char = source[i];

    if (char === "\\") {
      const escaped = source[i + 1];
      switch (escaped) {
        case "n": value += "\n"; break;
        case "r": value += "\r"; break;
        case "t": value += "\t"; break;
        case "b": value += "\b"; break;
        case "f": value += "\f"; break;
        default:
          if (escaped >= "0" && escaped <= "7") {
            // Octal character code, up to three digits.
            const octal = source.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? "";
            value += String.fromCharCode(parseInt(octal, 8));
            i += octal.length;
            continue;
          }
          value += escaped;
      }
      i++;
      continue;
    }

    if (char === "(") {
      depth++;
      if (depth === 1) continue;
      value += char;
      continue;
    }

    if (char === ")") {
      depth--;
      if (depth === 0) return { value, next: i + 1 };
      value += char;
      continue;
    }

    if (depth > 0) value += char;
  }

  return null;
}

/** Reads a hex string starting at `<`, two hex digits per byte. */
function readHex(source: string, from: number): { value: string; next: number } | null {
  if (source[from] !== "<") return null;
  const close = source.indexOf(">", from);
  if (close === -1) return null;

  const digits = source.slice(from + 1, close).replace(/\s/g, "");
  let value = "";
  for (let i = 0; i < digits.length; i += 2) {
    const pair = digits.slice(i, i + 2).padEnd(2, "0");
    value += String.fromCharCode(parseInt(pair, 16));
  }
  return { value, next: close + 1 };
}

/** Finds every Tj/TJ operator with the text it paints. */
function findTextOperators(stream: string): TextOperator[] {
  const operators: TextOperator[] = [];

  for (let i = 0; i < stream.length; i++) {
    const char = stream[i];

    // A single-run operator: (string) Tj
    if (char === "(" || char === "<") {
      const read = char === "(" ? readLiteral(stream, i) : readHex(stream, i);
      if (!read) continue;

      const after = stream.slice(read.next, read.next + 6);
      const tj = after.match(/^\s*(Tj|')/);
      if (tj) {
        operators.push({ start: i, end: read.next + (tj[0].length), text: read.value });
        i = read.next;
        continue;
      }
      i = read.next - 1;
      continue;
    }

    // A kerned array: [ (a) -12 (b) ] TJ
    if (char === "[") {
      let cursor = i + 1;
      let text = "";
      let ok = false;

      while (cursor < stream.length) {
        const c = stream[cursor];
        if (c === "]") {
          const after = stream.slice(cursor + 1, cursor + 5).match(/^\s*TJ/);
          if (after) {
            operators.push({ start: i, end: cursor + 1 + after[0].length, text });
            ok = true;
          }
          break;
        }
        if (c === "(" || c === "<") {
          const read = c === "(" ? readLiteral(stream, cursor) : readHex(stream, cursor);
          if (!read) break;
          text += read.value;
          cursor = read.next;
          continue;
        }
        cursor++;
      }

      if (ok) i = cursor;
      continue;
    }
  }

  return operators;
}

const squash = (value: string) => value.replace(/\s+/g, "").toLowerCase();

/**
 * Deletes the operators that paint `target`. Returns the rewritten stream, or
 * `null` when the value could not be located as text — the signal that this
 * PDF's encoding puts it out of reach.
 */
export function removeTextFromStream(stream: string, target: string): string | null {
  const needle = squash(target);
  if (!needle) return null;

  const operators = findTextOperators(stream);

  // A value can span consecutive operators, so widen the window until covered.
  for (let start = 0; start < operators.length; start++) {
    let accumulated = "";
    for (let end = start; end < operators.length && end - start < 24; end++) {
      accumulated += operators[end].text;
      if (!squash(accumulated).includes(needle)) continue;

      const first = operators[start];
      const last = operators[end];
      // Replacing with spaces preserves every byte offset around it, so no
      // other operator in the stream shifts position.
      return (
        stream.slice(0, first.start) +
        " ".repeat(last.end - first.start) +
        stream.slice(last.end)
      );
    }
  }

  return null;
}
