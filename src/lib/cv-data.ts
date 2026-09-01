import { z } from "zod";

/**
 * Schemas are the single source of truth: the TypeScript types below are
 * inferred from them, so a shape can never drift from its validator.
 *
 * Two flavours exist for a reason:
 *  - `*Schema`      — strict. Used on user-submitted input (profile forms, API
 *                     bodies). Rejects garbage loudly.
 *  - `*LenientSchema`— forgiving. Used on model output, which is frequently
 *                     partial or slightly off-shape. Missing or malformed
 *                     fields fall back to sane empties via `.catch()` so a
 *                     half-good generation still renders instead of throwing.
 */

const trimmed = z.string().trim();

/** Caps exist to keep a single document from blowing up a prompt or a document. */
export const LIMITS = {
  name: 120,
  contactField: 200,
  summary: 2000,
  category: 80,
  skillItem: 80,
  skillsPerGroup: 60,
  skillGroups: 20,
  company: 160,
  title: 160,
  location: 160,
  period: 80,
  bullet: 600,
  bulletsPerRole: 20,
  roles: 30,
  projectName: 160,
  projectDescription: 1000,
  projects: 30,
  degree: 200,
  school: 200,
  year: 40,
  sectionItems: 40,
  jobDescription: 20000,
  questions: 10000,
} as const;

const contactSchema = z.object({
  email: trimmed.max(LIMITS.contactField).default(""),
  phone: trimmed.max(LIMITS.contactField).default(""),
  location: trimmed.max(LIMITS.contactField).default(""),
  github: trimmed.max(LIMITS.contactField).default(""),
  linkedin: trimmed.max(LIMITS.contactField).default(""),
  website: trimmed.max(LIMITS.contactField).default(""),
});

const skillGroupSchema = z.object({
  category: trimmed.max(LIMITS.category).default(""),
  items: z.array(trimmed.max(LIMITS.skillItem)).max(LIMITS.skillsPerGroup).default([]),
});

const experienceSchema = z.object({
  company: trimmed.max(LIMITS.company).default(""),
  title: trimmed.max(LIMITS.title).default(""),
  location: trimmed.max(LIMITS.location).default(""),
  period: trimmed.max(LIMITS.period).default(""),
  bullets: z.array(trimmed.max(LIMITS.bullet)).max(LIMITS.bulletsPerRole).default([]),
  link: trimmed.max(LIMITS.contactField).optional(),
});

const projectSchema = z.object({
  name: trimmed.max(LIMITS.projectName).default(""),
  description: trimmed.max(LIMITS.projectDescription).default(""),
});

const educationSchema = z.object({
  degree: trimmed.max(LIMITS.degree).default(""),
  school: trimmed.max(LIMITS.school).default(""),
  location: trimmed.max(LIMITS.location).default(""),
  year: trimmed.max(LIMITS.year).default(""),
});

/** The user's base profile — what every tailored CV is derived from. */
export const cvDataSchema = z.object({
  name: trimmed.min(1, "Name is required").max(LIMITS.name),
  contact: contactSchema,
  summary: trimmed.max(LIMITS.summary).default(""),
  skills: z.array(skillGroupSchema).max(LIMITS.skillGroups).default([]),
  experience: z.array(experienceSchema).max(LIMITS.roles).default([]),
  projects: z.array(projectSchema).max(LIMITS.projects).default([]),
  education: educationSchema,
});


/* -------------------------------------------------------------------------- */
/* Lenient variants — for parsing model output                                */
/* -------------------------------------------------------------------------- */

const emptyContact = { email: "", phone: "", location: "", github: "", linkedin: "", website: "" };
const emptyEducation = { degree: "", school: "", location: "", year: "" };

/**
 * A string that is repaired rather than rejected: coerced, trimmed, and
 * truncated to `max`.
 *
 * Truncating matters more than it looks. These schemas also parse rows already
 * in the database, and the profile editor re-saves whatever they produce — so a
 * field that *fails* validation doesn't just get skipped for one render, it
 * gets written back as deleted. One 601-character bullet must not cost the user
 * an entire job.
 */
function clamped(max: number) {
  return z.unknown().transform((value) => {
    if (typeof value === "string") return value.trim().slice(0, max);
    if (typeof value === "number" || typeof value === "boolean") return String(value).slice(0, max);
    return "";
  });
}

/** An array of strings, each clamped, the array itself capped. Never fails. */
function clampedList(max: number, itemMax: number) {
  return z.unknown().transform((value) => {
    if (!Array.isArray(value)) return [];
    return value
      .slice(0, max)
      .map((item) => (typeof item === "string" ? item.trim().slice(0, itemMax) : ""))
      .filter(Boolean);
  });
}

/**
 * Caps the array and drops entries that are not objects at all. Because every
 * field below is `clamped`, a well-shaped entry can no longer be dropped for
 * being slightly too long.
 */
function lenientArray<T extends z.ZodTypeAny>(item: T, max: number) {
  return z.unknown().transform((raw): z.output<T>[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .slice(0, max)
      .map((entry) => item.safeParse(entry))
      .filter((r): r is z.ZodSafeParseSuccess<z.output<T>> => r.success)
      .map((r) => r.data);
  });
}

const contactLenientSchema = z
  .object({
    email: clamped(LIMITS.contactField),
    phone: clamped(LIMITS.contactField),
    location: clamped(LIMITS.contactField),
    github: clamped(LIMITS.contactField),
    linkedin: clamped(LIMITS.contactField),
    website: clamped(LIMITS.contactField),
  })
  .catch(emptyContact);

const skillGroupLenientSchema = z.object({
  category: clamped(LIMITS.category),
  items: clampedList(LIMITS.skillsPerGroup, LIMITS.skillItem),
});

const experienceLenientSchema = z.object({
  company: clamped(LIMITS.company),
  title: clamped(LIMITS.title),
  location: clamped(LIMITS.location),
  period: clamped(LIMITS.period),
  bullets: clampedList(LIMITS.bulletsPerRole, LIMITS.bullet),
  link: clamped(LIMITS.contactField),
});

const projectLenientSchema = z.object({
  name: clamped(LIMITS.projectName),
  description: clamped(LIMITS.projectDescription),
});

const educationLenientSchema = z
  .object({
    degree: clamped(LIMITS.degree),
    school: clamped(LIMITS.school),
    location: clamped(LIMITS.location),
    year: clamped(LIMITS.year),
  })
  .catch(emptyEducation);

const additionalSectionLenientSchema = z.object({
  title: clamped(LIMITS.category),
  items: clampedList(LIMITS.sectionItems, LIMITS.bullet),
});

const answerLenientSchema = z.object({
  question: clamped(LIMITS.bullet),
  answer: clamped(4000),
  explanation: clamped(LIMITS.bullet),
});

export const cvDataLenientSchema = z.object({
  name: clamped(LIMITS.name),
  contact: contactLenientSchema,
  summary: clamped(LIMITS.summary),
  skills: lenientArray(skillGroupLenientSchema, LIMITS.skillGroups),
  experience: lenientArray(experienceLenientSchema, LIMITS.roles),
  projects: lenientArray(projectLenientSchema, LIMITS.projects),
  education: educationLenientSchema,
});

export const tailoredCVLenientSchema = z.object({
  targetCompany: clamped(LIMITS.company),
  targetRole: clamped(LIMITS.title),
  summary: clamped(LIMITS.summary),
  skills: lenientArray(skillGroupLenientSchema, LIMITS.skillGroups),
  experience: lenientArray(experienceLenientSchema, LIMITS.roles),
  projects: lenientArray(projectLenientSchema, LIMITS.projects),
  education: educationLenientSchema,
  additionalSections: lenientArray(additionalSectionLenientSchema, LIMITS.skillGroups),
});

export const answersLenientSchema = lenientArray(answerLenientSchema, 60);

/* -------------------------------------------------------------------------- */
/* Acceptance schemas — what counts as a usable generation                     */
/* -------------------------------------------------------------------------- */

/**
 * The lenient schemas above repair almost anything, which makes them unsafe as
 * a success signal: `{"error": "quota exceeded"}` parses into a perfectly valid
 * but entirely empty CV. These add the one check the lenient schemas cannot —
 * "did this actually contain a CV?" — so that `generateJSON` retries instead of
 * persisting a blank document against the user's spent quota.
 */
export const generatedCVSchema = tailoredCVLenientSchema.refine(
  (cv) => cv.summary.length > 0 || cv.experience.length > 0 || cv.skills.length > 0,
  { message: "the response contained no CV content" },
);

export const extractedProfileSchema = cvDataLenientSchema.refine(
  (cv) => cv.name.length > 0 || cv.experience.length > 0 || cv.education.school.length > 0,
  { message: "the response contained no profile content" },
);

export const generatedAnswersSchema = z
  .object({ answers: answersLenientSchema })
  .refine((value) => value.answers.length > 0, { message: "the response contained no answers" });

export type Contact = z.infer<typeof contactSchema>;
export type CVData = z.infer<typeof cvDataSchema>;
export type TailoredCV = z.infer<typeof tailoredCVLenientSchema>;
export type Answer = z.infer<typeof answerLenientSchema>;

export const emptyProfile: CVData = {
  name: "",
  contact: { ...emptyContact },
  summary: "",
  skills: [{ category: "", items: [] }],
  experience: [],
  projects: [],
  education: { ...emptyEducation },
};

/**
 * Coerces whatever is stored in `User.cvProfile` into a renderable profile.
 * Older rows predate validation, so this never throws.
 */
export function toCVData(value: unknown): CVData {
  const parsed = cvDataLenientSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...emptyProfile };
}
