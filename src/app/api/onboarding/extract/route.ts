import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { generateJSON } from "@/lib/ai";
import { ApiError, consumeQuota, handler, requireUserId } from "@/lib/api";
import { extractedProfileSchema } from "@/lib/cv-data";
import { prisma } from "@/lib/prisma";
import { buildExtractPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The UI has always promised 10MB; now the server actually enforces it. */
const MAX_BYTES = 10 * 1024 * 1024;
/** Long enough for any real CV, short enough to stay inside free-tier context. */
const MAX_CHARS = 40_000;
const MIN_CHARS = 50;

export const POST = handler(async (req) => {
  const userId = await requireUserId();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new ApiError(400, "That upload wasn't readable. Try selecting the file again.");
  }

  const file = formData.get("pdf");
  if (!(file instanceof File)) {
    throw new ApiError(400, "No file was attached.");
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new ApiError(415, "Only PDF files can be read. Export your CV as a PDF and try again.");
  }

  if (file.size > MAX_BYTES) {
    throw new ApiError(413, "That PDF is larger than 10MB. Try exporting it at a smaller size.");
  }

  if (file.size === 0) {
    throw new ApiError(400, "That file is empty.");
  }

  // Keep the bytes before anything reads them: pdf.js detaches the buffer it is
  // given, and this is the only copy of the user's own design that will ever
  // exist — text extraction throws away fonts, columns, colour and spacing.
  const uploaded = new Uint8Array(await file.arrayBuffer());

  let text: string;
  let pageCount = 0;
  try {
    const result = await extractText(uploaded.slice());
    const pages = result.text;
    pageCount = result.totalPages;
    text = (Array.isArray(pages) ? pages.join("\n") : String(pages)).slice(0, MAX_CHARS);
  } catch (error) {
    console.warn("[extract] unpdf failed:", error);
    throw new ApiError(422, "We couldn't read that PDF. It may be encrypted or corrupted.");
  }

  if (text.trim().length < MIN_CHARS) {
    throw new ApiError(
      422,
      "That PDF has almost no selectable text — it's probably a scan. Try a text-based export, or fill your profile in by hand.",
    );
  }

  // Charged only once the PDF has yielded usable text: parsing is local and
  // free, so an unreadable file should not cost the user a slice of quota.
  await consumeQuota(userId, "extract");

  const profile = await generateJSON(buildExtractPrompt(text), extractedProfileSchema);

  // Store the original so the user can always get their own document back, and
  // so single values can later be edited inside it without losing the design.
  // A failure here must not cost them the extraction they just paid quota for.
  try {
    const record = {
      filename: file.name.slice(0, 200) || "cv.pdf",
      bytes: Buffer.from(uploaded),
      byteSize: uploaded.byteLength,
      pageCount,
    };
    await prisma.originalDocument.upsert({
      where: { userId },
      create: { userId, ...record },
      update: record,
    });
  } catch (error) {
    console.error("[extract] could not store the original PDF:", error);
  }

  return NextResponse.json(profile);
});
