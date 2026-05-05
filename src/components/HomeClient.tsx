"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Toaster, toast } from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import CVPreview from "@/components/CVPreview";
import { CVData, TailoredCV } from "@/lib/cv-data";

interface QA {
  question: string;
  answer: string;
  explanation: string;
}

interface HistoryEntry {
  id: string;
  jobSnippet: string;
  jobDescription: string;
  createdAt: string;
  cvData: TailoredCV;
}

interface HomeClientProps {
  cvProfile: CVData;
}

export default function HomeClient({ cvProfile }: HomeClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const cvRef = useRef<HTMLDivElement>(null);
  const [questions, setQuestions] = useState("");
  const [answers, setAnswers] = useState<QA[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/cv-history");
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch {
        // silently fail
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: cvRef,
    documentTitle: `${cvProfile.name.replace(/\s+/g, "_")}_CV`,
    onAfterPrint: () => setPrintId(null),
  });

  useEffect(() => {
    if (printId && cvRef.current) {
      const timeout = setTimeout(() => handlePrint(), 300);
      return () => clearTimeout(timeout);
    }
  }, [printId, handlePrint]);

  async function handleGenerate() {
    if (!jobDescription.trim()) {
      toast.error("Paste a job description first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          previousCVs: history
            .filter((e) => e.cvData?.targetCompany)
            .map((e) => ({ role: e.cvData.targetRole, company: e.cvData.targetCompany, cv: e.cvData })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const label = [data.targetCompany, data.targetRole].filter(Boolean).join(" — ") || jobDescription.trim().slice(0, 80);
      const saveRes = await fetch("/api/cv-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobSnippet: label, jobDescription: jobDescription.trim(), cvData: data }),
      });
      if (saveRes.ok) {
        const saved = await saveRes.json();
        setHistory((prev) => [saved, ...prev]);
      }
      toast.success("CV generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate CV");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/cv-history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => prev.filter((e) => e.id !== id));
        if (expandedId === id) setExpandedId(null);
        if (printId === id) setPrintId(null);
      }
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  async function handleAnswerQuestions() {
    if (!questions.trim()) {
      toast.error("Paste the application questions first.");
      return;
    }
    if (history.length === 0) {
      toast.error("Generate a CV first so answers match it.");
      return;
    }
    const lastEntry = history[0];
    setAnswersLoading(true);
    setAnswers([]);
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          jobDescription: lastEntry.jobDescription,
          cvData: lastEntry.cvData,
          previousCVs: history
            .filter((e) => e.id !== lastEntry.id && e.cvData?.targetCompany)
            .map((e) => ({ role: e.cvData.targetRole, company: e.cvData.targetCompany, cv: e.cvData })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setAnswers(data);
      toast.success("Answers ready!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate answers");
    } finally {
      setAnswersLoading(false);
    }
  }

  const printEntry = history.find((e) => e.id === printId);

  return (
    <div className="min-h-screen bg-warm-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-warm-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-warm-900 rounded-lg">
              <svg className="w-4 h-4 text-warm-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-warm-900 leading-tight">Craftly</h1>
              <p className="text-[10px] text-warm-400 leading-tight hidden sm:block">AI-powered CV workshop</p>
            </div>
          </div>

          {session?.user && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-warm-100 transition-colors cursor-pointer"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 bg-warm-200 rounded-full flex items-center justify-center text-xs font-medium text-warm-600">
                    {session.user.name?.charAt(0) || "?"}
                  </div>
                )}
                <span className="text-sm text-warm-700 hidden sm:inline font-medium">
                  {session.user.name}
                </span>
                <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-warm-200 shadow-lg py-1 z-20">
                    <button
                      onClick={() => { router.push("/profile"); setUserMenuOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-warm-700 hover:bg-warm-50 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      Edit profile
                    </button>
                    <div className="border-t border-warm-100 my-1" />
                    <button
                      onClick={() => signOut()}
                      className="w-full px-4 py-2.5 text-left text-sm text-warm-700 hover:bg-warm-50 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-warm-900 tracking-tight">
            Good to see you, {cvProfile.name.split(" ")[0]}.
          </h2>
          <p className="text-sm text-warm-500 mt-1">
            Paste a job description and let AI tailor your CV in seconds.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT COLUMN — CV Generator */}
          <div>
            {/* Input Section */}
            <div className="bg-white rounded-2xl border border-warm-200 p-6 shadow-sm mb-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-warm-900">Generate a tailored CV</h3>
                <p className="text-xs text-warm-400 mt-0.5">Paste the full job posting and we&apos;ll rewrite your CV to match.</p>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={8}
                className="w-full border border-warm-200 rounded-xl px-3 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-transparent resize-vertical transition-all"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="mt-4 px-6 py-2.5 bg-warm-900 text-white rounded-xl text-sm font-medium hover:bg-warm-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    Generate CV
                  </>
                )}
              </button>
            </div>

            {/* CV History */}
            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-warm-200 border-t-warm-900 rounded-full animate-spin" />
              </div>
            ) : history.length > 0 ? (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-warm-900">Your CVs</h3>
                  <span className="text-xs text-warm-400 bg-warm-100 px-2 py-0.5 rounded-full">{history.length}</span>
                </div>
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="text-sm text-warm-900 font-medium truncate">
                            {entry.jobSnippet}
                          </p>
                          <p className="text-xs text-warm-400 mt-0.5">
                            {new Date(entry.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 transition-colors cursor-pointer"
                          >
                            {expandedId === entry.id ? "Hide" : "View"}
                          </button>
                          <button
                            onClick={() => setPrintId(entry.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-warm-900 text-white hover:bg-warm-800 transition-colors cursor-pointer"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-warm-400 hover:text-red-500 transition-colors cursor-pointer rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {expandedId === entry.id && (
                        <div className="border-t border-warm-200">
                          <CVPreview data={entry.cvData} name={cvProfile.name} contact={cvProfile.contact} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : !loading ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-warm-100 rounded-2xl mb-4">
                  <svg className="w-7 h-7 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-warm-700">No CVs yet</p>
                <p className="text-xs text-warm-400 mt-1">Paste a job description above to generate your first tailored CV.</p>
              </div>
            ) : null}

            {/* Hidden div for PDF printing */}
            {printEntry && (
              <div style={{ overflow: "hidden", height: 0, width: 0, position: "fixed", left: 0, top: 0 }}>
                <div ref={cvRef} style={{ width: "210mm" }}>
                  <CVPreview data={printEntry.cvData} name={cvProfile.name} contact={cvProfile.contact} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Application Questions */}
          <div>
            <div className="bg-white rounded-2xl border border-warm-200 p-6 shadow-sm mb-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-warm-900">Answer application questions</h3>
                <p className="text-xs text-warm-400 mt-0.5">
                  Paste the questions from a job form and get smart, natural-sounding answers.
                </p>
              </div>
              <textarea
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder={`Paste questions here, e.g.:\nHow many years of experience do you have with React?\nWhat is your expected salary?\nAre you comfortable working remotely?`}
                rows={6}
                className="w-full border border-warm-200 rounded-xl px-3 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-transparent resize-vertical transition-all"
              />
              <button
                onClick={handleAnswerQuestions}
                disabled={answersLoading}
                className="mt-4 px-6 py-2.5 bg-warm-900 text-white rounded-xl text-sm font-medium hover:bg-warm-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm inline-flex items-center gap-2"
              >
                {answersLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                    Get answers
                  </>
                )}
              </button>
            </div>

            {/* Answers Display */}
            {answers.length > 0 && (
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-warm-900">Answers</h3>
                  <span className="text-xs text-warm-400 bg-warm-100 px-2 py-0.5 rounded-full">{answers.length}</span>
                </div>
                {answers.map((qa, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-warm-200 p-5 shadow-sm"
                  >
                    <p className="text-sm font-medium text-warm-900 mb-3">
                      {qa.question}
                    </p>
                    <div className="bg-warm-50 rounded-xl p-3.5 mb-2.5 flex items-start justify-between gap-3">
                      <p className="text-sm text-warm-800 whitespace-pre-wrap leading-relaxed">
                        {qa.answer}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qa.answer);
                          toast.success("Copied!");
                        }}
                        className="shrink-0 p-1.5 text-warm-400 hover:text-warm-700 hover:bg-warm-200 rounded-lg transition-colors cursor-pointer"
                        title="Copy answer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-warm-400 italic leading-relaxed">
                      {qa.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state for answers */}
            {answers.length === 0 && !answersLoading && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-warm-100 rounded-2xl mb-4">
                  <svg className="w-7 h-7 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-warm-700">No answers yet</p>
                <p className="text-xs text-warm-400 mt-1">Paste application questions above after generating a CV.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
