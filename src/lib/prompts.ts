import type { CVData, TailoredCV } from "@/lib/cv-data";
import { preferencesToPrompt, type Preferences } from "@/lib/preferences";

/**
 * Prompt construction, kept out of the route handlers.
 *
 * The important change from the original prompts is how prior applications are
 * included. Previously the entire history — every full tailored CV — was
 * serialised into each request, so prompt size grew without bound as a user
 * generated more CVs, eventually blowing past the free-tier token limits. Now
 * only a small, capped digest is sent: enough to keep facts consistent across
 * applications, without resending whole documents.
 */

/** How many prior applications are worth showing the model. */
const HISTORY_LIMIT = 4;

export interface PriorApplication {
  company?: string | null;
  role?: string | null;
  cv: TailoredCV;
}

/**
 * Condenses prior applications to the facts that must stay consistent:
 * where the candidate applied, and the job titles and dates they claimed.
 * Bullet prose is deliberately dropped — rewording it per role is the point.
 */
function digestHistory(history: PriorApplication[]): string {
  const recent = history.slice(0, HISTORY_LIMIT);
  if (recent.length === 0) return "None.";

  return recent
    .map((entry, i) => {
      const roles = entry.cv.experience
        .slice(0, 6)
        .map((job) => `${job.title} at ${job.company} (${job.period})`)
        .join("; ");
      const target = [entry.company, entry.role].filter(Boolean).join(" — ") || "Unnamed application";
      return `${i + 1}. Applied to: ${target}\n   Claimed history: ${roles || "n/a"}`;
    })
    .join("\n");
}

export function buildTailorPrompt(
  base: CVData,
  jobDescription: string,
  history: PriorApplication[],
): string {
  return `You are an expert CV strategist. Your ONLY goal: make this CV pass ATS screening and win an interview for the specific job below. Given a job description and a candidate's real CV data, produce a strategically tailored CV.

CORE PRINCIPLE
The result must read as though written BY someone who already does the job described. Every section — summary, skills, experience bullets, projects — should use the posting's own vocabulary. A recruiter skimming for six seconds must immediately think "this person matches".

WHAT YOU MAY DO
1. Rephrase, reframe, and reorder anything in the candidate's data to match the job's language. This is framing, not fabrication.
2. Name skills the candidate demonstrably has. If they built REST APIs in Node.js, they know HTTP, JSON, API design and server-side JavaScript — list those when the job asks for them.
3. Adopt the posting's exact terminology. If it says "microservices" and the candidate built modular services, say microservices. If it says "CI/CD" and they shipped through automated deploys, say CI/CD.
4. Adjust job titles toward industry norms where the underlying work supports it.

WHAT YOU MUST NOT DO
5. Never invent employers, degrees, certifications, dates, or projects that are absent from the candidate's data.
6. Never claim a technology that has no basis anywhere in their experience.
7. Never use filler vocabulary: "leveraging", "cutting-edge", "spearheaded", "synergy", "passionate about", "results-driven".

SECTION STRATEGY
- SUMMARY: two or three sentences describing the posting's ideal candidate, grounded in this candidate's real record. Mirror the stated seniority, domain, and stack.
- SKILLS: match the posting's required and preferred lists using its exact skill names. Group categories the way the posting groups them. Most job-relevant first.
- EXPERIENCE: rewrite every bullet toward what this job values. Lead with outcomes and numbers wherever the source data supports them. Reuse the posting's action verbs.
- PROJECTS: reframe each description around whatever the job cares about most.
- ADDITIONAL SECTIONS: add Certifications, Languages, Publications, or similar via "additionalSections" only when the posting asks for them and the data defensibly supports them.
- LENGTH: include everything relevant. Two pages is fine. Do not cut real content to fit one page.

CONSISTENCY WITH PRIOR APPLICATIONS
The candidate may have applied elsewhere already. Facts below must not be contradicted — same employers, same titles, same dates. You may emphasise differently for this role, but a recruiter seeing two of these CVs must see one consistent person.

${digestHistory(history)}

JOB DESCRIPTION
${jobDescription}

CANDIDATE CV DATA
${JSON.stringify(base, null, 2)}

Respond with ONLY a JSON object in exactly this shape:
{
  "targetCompany": "company name from the job description",
  "targetRole": "job title from the job description",
  "summary": "tailored summary",
  "skills": [{ "category": "Category", "items": ["skill"] }],
  "experience": [{ "company": "", "title": "", "location": "", "period": "", "bullets": [""], "link": "" }],
  "projects": [{ "name": "", "description": "" }],
  "education": { "degree": "", "school": "", "location": "", "year": "" },
  "additionalSections": [{ "title": "", "items": [""] }]
}
"additionalSections" is optional — include it only when it earns its place.`;
}

export function buildAnswersPrompt(
  questions: string,
  jobDescription: string,
  cv: TailoredCV | null,
  preferences: Preferences,
  history: PriorApplication[],
): string {
  const today = new Date().toISOString().split("T")[0];

  return `You are helping a real person fill in a job application form. Write answers that sound like a normal human typed them — direct, specific, unfussy. Not like a marketing brochure.

TODAY'S DATE: ${today}

VOICE
- Plain everyday language. No buzzwords: no "scalable solutions", "cross-functional synergy", "spearheaded", "leveraged", "drove innovation".
- Short by default. A numeric question gets a number. A yes/no question gets yes or no. A simple open question gets one or two sentences.
- Contractions are good. Slight informality is good. Stiff corporate tone is not.
- Vary sentence openings across answers. Never start two answers the same way.
- No filler: not "I am passionate about", not "I thrive in", not "I am well-versed in". State the fact.
- Be confident without overselling. "I've worked with X for five years", not "I have deep, extensive expertise in X".

THE LONGER FIELDS
- Summary / headline / profile: two to three sentences, first person, confident and casual. Name the stack and the years of experience the posting cares about.
- Cover letter: three or four short paragraphs that read like a real email to a hiring manager. Open with the role and what drew you to it. Connect specific experience to specific requirements. Close by saying you'd like to talk. Never "Dear Hiring Manager", never "I am writing to express my interest".

FACTS
- The CV and the job description are your only sources of truth. Never contradict the CV.
- Years of experience: count from the earliest relevant role in the CV through today (${today}), and round up to the nearest whole year. For a specific technology, count from the first role that used it.
- Never answer "Not specified" or "N/A". A real applicant always writes something concrete.
- Match the posting's priorities: if it values leadership, mention leading; if it names a technology, mention that technology. Naturally, not as a checklist.

CANDIDATE'S STATED PREFERENCES
These come from the candidate directly. Honour them exactly.
${preferencesToPrompt(preferences)}

JOB DESCRIPTION
${jobDescription || "Not provided."}

THE CANDIDATE'S SUBMITTED CV
${cv ? JSON.stringify(cv, null, 2) : "Not provided."}

PRIOR APPLICATIONS (keep answers consistent with these)
${digestHistory(history)}

APPLICATION QUESTIONS (pasted raw from the form)
${questions}

Respond with ONLY a JSON object in exactly this shape:
{
  "answers": [
    { "question": "the original question text", "answer": "the answer to paste in", "explanation": "one short line on why, referencing the CV" }
  ]
}`;
}

export function buildExtractPrompt(text: string): string {
  return `You are a CV parser. Extract structured data from the CV text below.

Rules:
- Copy what is written. Do not invent, embellish, or infer facts that are not present.
- Leave a field as an empty string, or an array empty, when the CV does not state it.
- Keep bullet points as separate array entries, lightly cleaned of stray characters.
- Group skills under the headings the CV itself uses; fall back to sensible categories only when it has none.

CV TEXT
${text}

Respond with ONLY a JSON object in exactly this shape:
{
  "name": "Full Name",
  "contact": { "email": "", "phone": "", "location": "", "github": "", "linkedin": "", "website": "" },
  "summary": "professional summary or objective",
  "skills": [{ "category": "Category", "items": ["skill"] }],
  "experience": [{ "company": "", "title": "", "location": "", "period": "", "bullets": [""], "link": "" }],
  "projects": [{ "name": "", "description": "" }],
  "education": { "degree": "", "school": "", "location": "", "year": "" }
}`;
}
