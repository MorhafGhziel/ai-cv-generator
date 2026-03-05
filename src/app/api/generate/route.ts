import { CVData, TailoredCV } from "@/lib/cv-data";
import { generateWithAI } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cvProfile: true },
  });

  if (!user?.cvProfile) {
    return NextResponse.json(
      { error: "Please complete onboarding first" },
      { status: 400 }
    );
  }

  const baseCVData = user.cvProfile as unknown as CVData;

  const { jobDescription, previousCVs } = await req.json();
  if (!jobDescription || typeof jobDescription !== "string") {
    return NextResponse.json(
      { error: "Job description is required" },
      { status: 400 }
    );
  }

  const prompt = `You are an expert CV strategist. Your ONLY goal: make this CV pass ATS screening and get an interview for the specific job below. Given a job description and a candidate's real CV data, produce a strategically tailored CV in JSON format.

CORE PRINCIPLE:
The generated CV must read like it was written BY someone who does the exact job described. Every section — summary, skills, experience bullets, projects — must use the job posting's own keywords, phrases, and terminology. A recruiter skimming for 6 seconds should immediately think "this person matches."

RULES:
1. You CAN rephrase, reframe, and reword anything from the candidate's data to match the job's language. This is not fabrication — it is strategic framing.
2. You CAN add skills the candidate reasonably has based on their experience (e.g., if they built REST APIs with Node.js, they know HTTP, JSON, API design, server-side JavaScript — list those if the job asks for them).
3. You CAN upgrade bullet descriptions to use the job's exact terminology. If the job says "microservices" and the candidate built modular APIs, call it microservices-oriented architecture. If the job says "CI/CD pipelines" and the candidate deployed to Vercel/cloud, mention CI/CD.
4. You CAN adjust job titles slightly to match industry norms (e.g., "Frontend Developer" → "Software Engineer" if that's what the role calls for) as long as it's reasonable.
5. You MUST NOT invent companies, degrees, or projects that don't exist in the data.
6. Keep language natural and human. No AI buzzwords like "leveraging", "cutting-edge", "spearheaded", "synergy".

TAILORING STRATEGY:
- SUMMARY: Write 2-3 sentences that sound like the job description's ideal candidate. Mirror the job's key requirements (years of experience, domain, tech stack, soft skills). Address what the job values most.
- SKILLS: Read the job's required/preferred skills and match them. Use the EXACT skill names from the job posting. Group and name categories to mirror the job's language. If the job says "CI/CD" list "CI/CD". If it says "Agile methodologies" list "Agile methodologies". Put the most job-relevant skills first.
- EXPERIENCE: Rewrite every bullet to emphasize what this specific job cares about. If the job wants "scalable systems", describe the candidate's work in terms of scale. If it wants "team leadership", highlight leading and mentoring. If it wants "API design", make the API work prominent. Use the job's own action verbs and keywords in bullets.
- PROJECTS: Reframe project descriptions to highlight whatever the job values. A social media project can emphasize "real-time data" for a data job, "authentication & security" for a security job, or "scalable API architecture" for a backend job.
- ADDITIONAL SECTIONS: Add sections via "additionalSections" if the job asks for things not in standard sections (e.g., Certifications, Languages, Open Source, Publications). You may reasonably infer items — e.g., if the candidate works with Arabic content, add "Languages: Arabic (Native), English (Professional)". Only add what's defensible.
- LENGTH: Include everything relevant. Multiple pages are fine. Do NOT cut content to fit one page.

CONSISTENCY WITH PREVIOUS APPLICATIONS:
${previousCVs?.length ? `The candidate has already applied to other roles (possibly at the same company). Here are their previous tailored CVs. If any are for the SAME COMPANY, you MUST:
- Keep all facts consistent (job titles, dates, companies, education — don't contradict what was already submitted)
- You CAN frame bullets differently to match this specific role's requirements
- Use different emphasis/keywords to target this new role, but don't change the underlying facts
- Make sure the two CVs complement each other — if a recruiter sees both, they should look like the same person applying to two different roles, not two different people

PREVIOUS CVs:
${JSON.stringify(previousCVs, null, 2)}` : "No previous applications."}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE CV DATA:
${JSON.stringify(baseCVData, null, 2)}

Respond with ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "targetCompany": "the company name from the job description",
  "targetRole": "the job title from the job description",
  "summary": "tailored summary string",
  "skills": [{ "category": "Category Name", "items": ["skill1", "skill2"] }],
  "experience": [{ "company": "string", "title": "string", "location": "string", "period": "string", "bullets": ["string"], "link": "string or omit" }],
  "projects": [{ "name": "string", "description": "string" }],
  "education": { "degree": "string", "school": "string", "location": "string", "year": "string" },
  "additionalSections": [{ "title": "Section Name", "items": ["item1", "item2"] }]
}
The "additionalSections" field is optional — only include it when relevant.`;

  try {
    const text = await generateWithAI(prompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const jsonStr = jsonStart !== -1 && jsonEnd !== -1 ? cleaned.substring(jsonStart, jsonEnd + 1) : cleaned;
    const tailoredCV: TailoredCV = JSON.parse(jsonStr);
    return NextResponse.json(tailoredCV);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Generate CV error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
