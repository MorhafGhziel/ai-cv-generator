"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { CVData } from "@/lib/cv-data";
import ProfileFormFields from "@/components/ProfileFormFields";

type Step = "upload" | "review" | "saving";

const emptyProfile: CVData = {
  name: "",
  contact: { email: "", phone: "", location: "", github: "", linkedin: "", website: "" },
  summary: "",
  skills: [{ category: "General", items: [] }],
  experience: [],
  projects: [],
  education: { degree: "", school: "", location: "", year: "" },
};

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<CVData>(emptyProfile);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch("/api/onboarding/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setProfile(data);
      setStep("review");
      toast.success("CV data extracted! Review and edit below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extract CV");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setStep("saving");
    try {
      const res = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Profile saved!");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      setStep("review");
    }
  }

  if (step === "upload") {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
        <Toaster position="top-right" />
        <div className="w-full max-w-lg">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-warm-900 rounded-xl mb-4">
              <svg className="w-6 h-6 text-warm-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-warm-900 tracking-tight">
              Let&apos;s build your profile
            </h1>
            <p className="text-sm text-warm-500 mt-2 max-w-sm mx-auto">
              Upload your existing CV and our AI will extract everything.
              You can always edit it later.
            </p>
          </div>

          {/* Upload card */}
          <div className="bg-white rounded-2xl border border-warm-200 p-8 shadow-sm">
            {uploading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-10 h-10 border-2 border-warm-200 border-t-warm-900 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-warm-900">Reading your CV...</p>
                  <p className="text-xs text-warm-400 mt-1">Our AI is extracting your information</p>
                </div>
              </div>
            ) : (
              <>
                <label className="block border-2 border-dashed border-warm-200 rounded-xl p-10 cursor-pointer hover:border-warm-400 hover:bg-warm-50 transition-all group">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                    }}
                  />
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-warm-100 rounded-xl mb-3 group-hover:bg-warm-200 transition-colors">
                      <svg className="w-7 h-7 text-warm-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-warm-900">Click to upload your CV</p>
                    <p className="text-xs text-warm-400 mt-1">PDF format, up to 10MB</p>
                  </div>
                </label>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-warm-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-warm-400">or</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setProfile(emptyProfile);
                    setStep("review");
                  }}
                  className="w-full py-3 text-sm font-medium text-warm-600 hover:text-warm-900 border border-warm-200 rounded-xl hover:bg-warm-50 transition-all cursor-pointer"
                >
                  Start from scratch
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <Toaster position="top-right" />

      {/* Sticky header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-warm-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("upload")}
              className="p-2 text-warm-400 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors cursor-pointer"
              title="Back to upload"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-warm-900">Review your profile</h1>
              <p className="text-xs text-warm-400">Make sure everything looks right before continuing</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={step === "saving"}
            className="px-6 py-2.5 bg-warm-900 text-white rounded-xl text-sm font-medium hover:bg-warm-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {step === "saving" ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <ProfileFormFields profile={profile} setProfile={setProfile} />

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={step === "saving"}
            className="px-8 py-3 bg-warm-900 text-white rounded-xl text-sm font-medium hover:bg-warm-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {step === "saving" ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
