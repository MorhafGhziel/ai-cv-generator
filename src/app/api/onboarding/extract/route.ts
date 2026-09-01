import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { generateJSON } from "@/lib/ai";
import { ApiError, consumeQuota, handler, requireUserId } from "@/lib/api";
import { extractedProfileSchema } from "@/lib/cv-data";
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

  let text: string;
  try {
    const { text: pages } = await extractText(new Uint8Array(await file.arrayBuffer()));
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
  return NextResponse.json(profile);
});
