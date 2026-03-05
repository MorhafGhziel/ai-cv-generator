import { auth } from "@/lib/auth";
import { generateWithAI } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a valid PDF file" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text: pages } = await extractText(new Uint8Array(buffer));
    const text = pages.join("\n");

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from PDF. Please try a different file." },
        { status: 400 }
      );
    }

    const prompt = `You are a CV parser. Extract structured data from the following CV text and return ONLY valid JSON (no markdown, no code fences).

CV TEXT:
${text}

Return this exact JSON structure, filling in what you find. Use empty strings or empty arrays for missing fields:
{
  "name": "Full Name",
  "contact": {
    "email": "",
    "phone": "",
    "location": "",
    "github": "",
    "linkedin": "",
    "website": ""
  },
  "summary": "Professional summary or objective",
  "skills": [{ "category": "Category Name", "items": ["skill1", "skill2"] }],
  "experience": [{ "company": "Company", "title": "Job Title", "location": "Location", "period": "Start - End", "bullets": ["achievement 1"], "link": "" }],
  "projects": [{ "name": "Project Name", "description": "Description" }],
  "education": { "degree": "Degree", "school": "School Name", "location": "Location", "year": "Year" }
}`;

    const result = await generateWithAI(prompt);
    const cleaned = result
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const jsonStr =
      jsonStart !== -1 && jsonEnd !== -1
        ? cleaned.substring(jsonStart, jsonEnd + 1)
        : cleaned;
    const profile = JSON.parse(jsonStr);

    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("PDF extract error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
