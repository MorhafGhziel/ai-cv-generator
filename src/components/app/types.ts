import type { Answer, TailoredCV } from "@/lib/cv-data";

/** One saved application, as the dashboard holds it. */
export interface ApplicationEntry {
  id: string;
  jobSnippet: string;
  targetCompany: string | null;
  targetRole: string | null;
  createdAt: string;
  cvData: TailoredCV;
  answers: Answer[] | null;
}

export interface UsageRow {
  action: "generate" | "answers" | "extract";
  label: string;
  used: number;
  limit: number;
  remaining: number;
}
