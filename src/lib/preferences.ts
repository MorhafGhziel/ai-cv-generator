import { z } from "zod";

/**
 * Job-application preferences. These used to be hardcoded into the answers
 * prompt (a $3000/mo cap, "freelancer, available immediately"), which meant
 * every user inherited one person's numbers. They now live per-user.
 */

export const CURRENCIES = ["USD", "EUR", "GBP", "SAR", "AED", "MXN", "TRY", "EGP"] as const;

export const NOTICE_PERIODS = [
  "Available immediately",
  "1 week",
  "2 weeks",
  "1 month",
  "2 months",
  "3 months",
] as const;

export const WORK_MODES = ["Remote", "Hybrid", "On-site", "No preference"] as const;

export const SALARY_PERIODS = ["month", "year"] as const;

export const preferencesSchema = z.object({
  /** Lower bound of the range to quote. 0 means "let the model decide". */
  salaryMin: z.number().int().min(0).max(10_000_000).default(0),
  salaryMax: z.number().int().min(0).max(10_000_000).default(0),
  salaryCurrency: z.enum(CURRENCIES).default("USD"),
  salaryPeriod: z.enum(SALARY_PERIODS).default("month"),
  noticePeriod: z.enum(NOTICE_PERIODS).default("2 weeks"),
  workMode: z.enum(WORK_MODES).default("Remote"),
  willingToRelocate: z.boolean().default(false),
  requiresVisaSponsorship: z.boolean().default(false),
  /** Free-text nuance the model should honour, e.g. "I only work afternoons GMT+3". */
  notes: z.string().trim().max(1000).default(""),
})
  .refine((p) => p.salaryMax === 0 || p.salaryMin === 0 || p.salaryMax >= p.salaryMin, {
    message: "Maximum salary must be greater than or equal to the minimum",
    path: ["salaryMax"],
  });

export type Preferences = z.infer<typeof preferencesSchema>;

const defaultPreferences: Preferences = preferencesSchema.parse({});

export function toPreferences(value: unknown): Preferences {
  const parsed = preferencesSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...defaultPreferences };
}

/**
 * Renders preferences as prompt instructions. Returns null when the user has
 * set nothing meaningful, so the prompt stays quiet rather than asserting
 * defaults the user never chose.
 */
export function preferencesToPrompt(p: Preferences): string {
  const lines: string[] = [];

  if (p.salaryMin > 0 || p.salaryMax > 0) {
    const unit = `${p.salaryCurrency}/${p.salaryPeriod}`;
    if (p.salaryMin > 0 && p.salaryMax > 0) {
      lines.push(
        `- Salary: quote a specific figure between ${p.salaryMin.toLocaleString()} and ${p.salaryMax.toLocaleString()} ${unit}. NEVER quote above ${p.salaryMax.toLocaleString()} ${unit}. Aim toward the upper end for large, well-funded, or US/UK/EU employers and toward the lower end for small startups. Convert to whatever currency the question asks for using approximate current rates, and match the period they ask for.`,
      );
    } else if (p.salaryMax > 0) {
      lines.push(
        `- Salary: quote a specific figure at or below ${p.salaryMax.toLocaleString()} ${unit}. NEVER exceed it. Convert to the currency and period the question asks for.`,
      );
    } else {
      lines.push(
        `- Salary: quote a specific figure at or above ${p.salaryMin.toLocaleString()} ${unit}. Convert to the currency and period the question asks for.`,
      );
    }
  } else {
    lines.push(
      "- Salary: the candidate has not set a target. Infer a reasonable market figure from the role, seniority, and location in the job description, and state it plainly as a single number or a tight range.",
    );
  }

  lines.push(`- Notice period / start date: ${p.noticePeriod}. For start-date questions, give a concrete date consistent with that.`);
  lines.push(`- Preferred work mode: ${p.workMode}. Answer work-mode questions in line with this.`);
  lines.push(
    p.willingToRelocate
      ? "- Relocation: the candidate is willing to relocate. Answer relocation questions positively."
      : "- Relocation: the candidate prefers not to relocate. Decline relocation politely but stay open to travel.",
  );
  lines.push(
    p.requiresVisaSponsorship
      ? "- Work authorisation: the candidate WILL require visa sponsorship. Answer sponsorship questions honestly."
      : "- Work authorisation: the candidate does NOT require visa sponsorship.",
  );

  if (p.notes) lines.push(`- Additional instructions from the candidate: ${p.notes}`);

  return lines.join("\n");
}
