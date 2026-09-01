import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/ai";
import { consumeQuota, handler, readJson, requireUserId, ApiError } from "@/lib/api";
import { generatedAnswersSchema, LIMITS, tailoredCVLenientSchema } from "@/lib/cv-data";
import { prisma } from "@/lib/prisma";
import { toPreferences } from "@/lib/preferences";
import { buildAnswersPrompt, type PriorApplication } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  questions: z
    .string()
    .trim()
    .min(3, "Paste at least one question.")
    .max(LIMITS.questions, "That's too much text at once — paste the questions in smaller batches."),
  /**
   * Which saved application these answers accompany. The client sends an id
   * rather than the CV itself, so the server can no longer be handed a CV the
   * user does not own.
   */
  entryId: z.string().trim().min(1).optional(),
});


export const POST = handler(async (req) => {
  const userId = await requireUserId();
  const { questions, entryId } = await readJson(req, bodySchema);

  const entry = entryId
    ? await prisma.cvEntry.findFirst({
        where: { id: entryId, userId },
        select: { id: true, jobDescription: true, cvData: true },
      })
    : await prisma.cvEntry.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, jobDescription: true, cvData: true },
      });

  if (!entry) {
    throw new ApiError(409, "Generate a tailored CV first so the answers can match it.");
  }

  await consumeQuota(userId, "answers");

  const [user, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } }),
    prisma.cvEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { targetCompany: true, targetRole: true, cvData: true },
    }),
  ]);

  const history: PriorApplication[] = recent.flatMap((item) => {
    const parsed = tailoredCVLenientSchema.safeParse(item.cvData);
    if (!parsed.success) return [];
    return [{ company: item.targetCompany, role: item.targetRole, cv: parsed.data }];
  });

  const cv = tailoredCVLenientSchema.safeParse(entry.cvData);
  const prompt = buildAnswersPrompt(
    questions,
    entry.jobDescription,
    cv.success ? cv.data : null,
    toPreferences(user?.preferences),
    history,
  );

  const { answers } = await generateJSON(prompt, generatedAnswersSchema);

  // Persisted against the application so they survive a reload — the user
  // spent quota on them.
  await prisma.cvEntry.update({ where: { id: entry.id }, data: { answers } });

  return NextResponse.json({ entryId: entry.id, answers });
});
