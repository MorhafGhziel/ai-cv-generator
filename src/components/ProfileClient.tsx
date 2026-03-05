"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { CVData } from "@/lib/cv-data";
import ProfileFormFields from "@/components/ProfileFormFields";

interface ProfileClientProps {
  initialProfile: CVData;
}

export default function ProfileClient({ initialProfile }: ProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<CVData>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSave() {
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Profile updated!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch("/api/onboarding/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setProfile(data);
      toast.success("CV data extracted! Review and save below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extract CV");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-warm-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-sm text-warm-500 hover:text-warm-700 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back
            </button>
            <div>
              <h1 className="text-lg font-bold text-warm-900">Edit profile</h1>
              <p className="text-xs text-warm-400">Update your base CV information</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-warm-900 text-white rounded-xl text-sm font-medium hover:bg-warm-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Upload new CV */}
        <div className="bg-white rounded-2xl border border-warm-200 p-5 mb-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-warm-900">Replace with a new CV</h2>
              <p className="text-xs text-warm-400 mt-0.5">Upload a PDF and we&apos;ll re-extract all your data.</p>
            </div>
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-warm-200 border-t-warm-900 rounded-full animate-spin" />
                <span className="text-xs text-warm-500">Extracting...</span>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-warm-200 rounded-xl text-sm font-medium text-warm-600 hover:bg-warm-50 hover:border-warm-300 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload PDF
              </label>
            )}
          </div>
        </div>

        {/* Profile form */}
        <ProfileFormFields profile={profile} setProfile={setProfile} />

        {/* Bottom save */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-warm-900 text-white rounded-xl text-sm font-medium hover:bg-warm-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
