import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/ai";
import { consumeQuota, handler, readJson, requireUserId, ApiError } from "@/lib/api";
import { generatedCVSchema, LIMITS, tailoredCVLenientSchema, toCVData } from "@/lib/cv-data";
import { checkJobPosting } from "@/lib/job-posting";
import { prisma } from "@/lib/prisma";
import { buildTailorPrompt, type PriorApplication } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(40, "That job description is too short to tailor against — paste the full posting.")
    .max(LIMITS.jobDescription, "That job description is too long. Paste the role and requirements only."),
});

export const POST = handler(async (req) => {
  const userId = await requireUserId();

  const { jobDescription } = await readJson(req, bodySchema);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cvProfile: true, onboardingComplete: true },
  });

  if (!user?.onboardingComplete || !user.cvProfile) {
    throw new ApiError(409, "Set up your profile before generating a CV.");
  }

  // Checked before quota is spent. Without a real posting the model has nothing
  // to target, so it invents an employer or reuses the previous one — and the
  // user pays for a CV aimed at a company they never applied to.
  const posting = checkJobPosting(jobDescription);
  if (!posting.ok) {
    throw new ApiError(422, posting.reason ?? "That doesn't look like a job posting.");
  }

  await consumeQuota(userId, "generate");

  // Only the handful of most recent applications matter for consistency, and
  // the prompt digests them down to titles and dates.
  const recent = await prisma.cvEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { targetCompany: true, targetRole: true, cvData: true },
  });

  const history: PriorApplication[] = recent.flatMap((entry) => {
    const parsed = tailoredCVLenientSchema.safeParse(entry.cvData);
    if (!parsed.success) return [];
    return [{ company: entry.targetCompany, role: entry.targetRole, cv: parsed.data }];
  });

  const base = toCVData(user.cvProfile);
  const prompt = buildTailorPrompt(base, jobDescription, history);
  const tailored = await generateJSON(prompt, generatedCVSchema);

  // The generated CV is persisted here rather than in a second client call, so
  // a user can never spend quota and lose the result to a failed follow-up.
  const label =
    [tailored.targetCompany, tailored.targetRole].filter(Boolean).join(" — ") ||
    jobDescription.slice(0, 80);

  const entry = await prisma.cvEntry.create({
    data: {
      userId,
      jobSnippet: label,
      jobDescription,
      targetCompany: tailored.targetCompany || null,
      targetRole: tailored.targetRole || null,
      cvData: tailored,
    },
    select: { id: true, jobSnippet: true, targetCompany: true, targetRole: true, createdAt: true, cvData: true },
  });

  return NextResponse.json(entry, { status: 201 });
});
