import { generateWithAI } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questions, jobDescription, cvData, previousCVs } = await req.json();
  if (!questions || typeof questions !== "string") {
    return NextResponse.json(
      { error: "Questions are required" },
      { status: 400 }
    );
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `You are helping a real person answer job application questions. Write answers that sound like a normal human typed them — casual, direct, and natural. NOT like a corporate AI or a marketing brochure.

TODAY'S DATE: ${currentDate}

TONE & STYLE RULES:
- Write like a real person would in an application form — brief, straightforward, no fluff.
- Use simple everyday language. NO buzzwords like "scalable solutions", "cross-functional synergy", "spearheaded", "leveraged", "drove innovation", etc.
- Keep answers SHORT by default. For numeric questions, just give the number. For yes/no, just say yes or no. For simple open-ended, 1-2 sentences max.
- EXCEPT for these longer fields — write more but still sound human:
  - "Summary" / "Headline" / "Profile": Write 2-3 sentences. Like a LinkedIn headline or profile summary — casual, confident, first person. Mention the key tech/skills the job wants and years of experience. Example: "Fullstack developer with 5+ years building web apps with React, Node.js, and cloud services. I've led small teams and shipped production systems end-to-end. Currently looking for remote roles where I can keep growing."
  - "Cover letter": Write 3-4 short paragraphs. Keep it conversational — like a real email to a hiring manager, not a formal letter. Open with what role you're applying for and why it caught your eye. Middle paragraphs: connect your actual experience to what the job needs (use specifics from the CV). Close casually — say you'd love to chat more. NO "Dear Hiring Manager" or "I am writing to express my interest" — just be direct and real.
- Don't oversell. Be confident but not over-the-top. A real person doesn't say "I have extensive, deep expertise in..." — they say "I've been working with X for Y years" or just "5 years".
- Vary your sentence structure. Don't start every answer the same way.
- It's okay to be slightly informal. Use contractions (I've, I'm, don't). Avoid stiff corporate tone.
- NO filler phrases like "I am passionate about", "I thrive in", "I am well-versed in". Just state the facts.

CONTENT RULES:
- The CV and JOB DESCRIPTION together are your sources of truth. Answers must be consistent with the CV AND relevant to what the job is asking for.
- For "years of experience" questions: Calculate from the EARLIEST role in the CV's experience section to TODAY (${currentDate}). For example, if the earliest role started in Sep 2020 and today is ${currentDate}, that is 5+ years. If a technology appears in ANY role, count from the first role that used it up to today.
- IMPORTANT: Always round UP. If the calculation gives 5.4 years, say "5" or "6", never less. The candidate's summary says "5+ years" — respect that as the minimum.
- For technology-specific experience questions: Count years from the FIRST role where it appeared up to today.
- For yes/no or select questions: Pick the answer that best matches the CV and job. If the job requires something and the CV supports it, answer positively.
- For open-ended questions: Give a direct answer that connects the candidate's real experience to what the job is looking for. Don't write an essay.
- NEVER contradict the CV. NEVER answer less than what the CV summary states.
- Match answers to the job's priorities — if the job cares about leadership, mention leading teams. If it cares about a specific tech, mention that tech. But do it naturally, not like you're checking boxes.
- NEVER answer "Not specified" — always give a concrete answer. A real person filling out a form always puts something.

SALARY RULES:
- For salary questions: ALWAYS give a specific number. The candidate's ABSOLUTE MAXIMUM is 3000 USD/month (36,000 USD/year). NEVER exceed this.
- Extract the company name, size, and location from the JOB DESCRIPTION above to estimate the right salary. Consider:
  - Company size & followers: Huge companies (100k+ followers, Fortune 500) = ask closer to the max (2500-3000 USD/month). Mid-size (10k-100k followers) = 2000-2500 USD/month. Small/startup (under 10k) = 1500-2000 USD/month.
  - Location: US/UK/EU companies pay more, so ask closer to max. Companies in developing regions, adjust down slightly.
  - Role level: Senior/Lead roles = aim higher. Junior/Mid = aim lower.
- Convert to whatever currency the question asks for. Use approximate current exchange rates. For example: 1 USD ≈ 17 MXN, 1 USD ≈ 0.78 GBP, 1 USD ≈ 0.92 EUR. Calculate accordingly.
- If the question asks for annual salary, give annual. If monthly, give monthly. Match the format they ask for.
- Just state the number naturally, like "Around 550,000 MXN annually" or "2,500 USD/month". Don't over-explain.

NOTICE PERIOD & AVAILABILITY RULES:
- For notice period questions: Answer "Available immediately" or "2 weeks" — the candidate is a freelancer/contractor and can start quickly.
- For start date questions: Answer with a date about 2 weeks from today.
- For availability/relocation questions: Answer positively and directly.

JOB DESCRIPTION:
${jobDescription || "Not provided"}

THE CANDIDATE'S SUBMITTED CV:
${cvData ? JSON.stringify(cvData, null, 2) : "Not provided"}

${previousCVs?.length ? `PREVIOUS APPLICATIONS (same candidate, possibly same company — keep answers consistent):
The candidate has applied to other roles before. If any are at the SAME COMPANY, make sure your answers don't contradict what was previously submitted. Keep facts (years, skills, experience) consistent. You can adjust emphasis for this specific role.
${JSON.stringify(previousCVs.map((p: { role: string; company: string }) => ({ role: p.role, company: p.company })), null, 2)}` : ""}

APPLICATION QUESTIONS (pasted raw from the application form):
${questions}

IMPORTANT: Your ENTIRE response must be ONLY a valid JSON array. No text before or after. No "Here are", no explanation, no markdown. Start with [ and end with ].

Format:
[
  {
    "question": "the original question text",
    "answer": "the recommended answer",
    "explanation": "brief note on why this answer, referencing the CV"
  }
]`;

  try {
    const text = await generateWithAI(prompt);
    // Strip any non-JSON text before the array and after it
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonStart = cleaned.indexOf("[");
    const jsonEnd = cleaned.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("AI response did not contain valid JSON array");
    }
    const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
    const answers = JSON.parse(jsonStr);
    return NextResponse.json(answers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Generate answers error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
