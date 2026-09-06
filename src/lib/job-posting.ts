/**
 * Decides whether pasted text is actually a job posting.
 *
 * The composer only ever validated a minimum length, so "edit my phone number
 * to 96295293532" and a diversity questionnaire both sailed through. With
 * nothing job-shaped to work from, the model invented an employer or reused the
 * previous one, and the user got a CV aimed at a company they had not applied
 * to — having spent quota on it.
 *
 * The check is deliberately permissive: postings come in every language and
 * format, and wrongly rejecting a real one is far worse than occasionally
 * accepting something odd. It is looking for an absence of job-ness, not proof.
 */

/** Vocabulary that appears in essentially every posting, in any style. */
const POSTING_SIGNALS = [
  "responsibilit",
  "requirement",
  "qualification",
  "experience",
  "skills",
  "role",
  "position",
  "candidate",
  "team",
  "salary",
  "benefits",
  "apply",
  "job",
  "hiring",
  "we are looking",
  "you will",
  "you'll",
  "about the",
  "full-time",
  "part-time",
  "remote",
  "hybrid",
  "years of",
  "degree",
  "employer",
  "company",
  "department",
  "reporting to",
];

/** Phrasing that means the user is talking to the app, not pasting a posting. */
const INSTRUCTION_SIGNALS = [
  /^\s*(please\s+)?(edit|change|update|fix|add|remove|set|make|give|send|write|generate|create)\b/i,
  /\bmy (cv|resume|phone|email|number|address|name)\b/i,
  /\bgive me my\b/i,
];

export interface PostingCheck {
  ok: boolean;
  reason?: string;
}

const MIN_WORDS = 40;

export function checkJobPosting(text: string): PostingCheck {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  // An instruction aimed at the app, regardless of length.
  const looksLikeInstruction = INSTRUCTION_SIGNALS.some((p) => p.test(trimmed));
  if (looksLikeInstruction && words.length < 120) {
    return {
      ok: false,
      reason:
        "That reads like an instruction rather than a job posting. This box takes the posting itself — paste the whole advert, responsibilities and requirements included. To change details on your own CV, use Your CV instead.",
    };
  }

  if (words.length < MIN_WORDS) {
    return {
      ok: false,
      reason: `A posting needs more to work from — that's ${words.length} word${words.length === 1 ? "" : "s"}. Paste the full advert, including the responsibilities and requirements.`,
    };
  }

  const lower = trimmed.toLowerCase();
  const hits = POSTING_SIGNALS.filter((signal) => lower.includes(signal)).length;

  // Two independent signals out of ~27 is a very low bar, cleared by any real
  // posting while still catching a questionnaire or a note to us.
  if (hits < 2) {
    return {
      ok: false,
      reason:
        "This doesn't look like a job posting — none of the usual sections (responsibilities, requirements, qualifications) are in it. Paste the advert itself so the rewrite has something to match against.",
    };
  }

  return { ok: true };
}
