"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import AppHeader from "@/components/app/AppHeader";
import PdfDropzone from "@/components/app/PdfDropzone";
import ProfileFormFields from "@/components/app/ProfileFormFields";
import { Button } from "@/components/ui/Button";
import { UploadIcon } from "@/components/ui/Icons";
import { apiSend, apiUpload, errorMessage } from "@/lib/client-api";
import { cvDataLenientSchema, cvDataSchema, type CVData } from "@/lib/cv-data";

export default function ProfileClient({ initialProfile }: { initialProfile: CVData }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CVData>(initialProfile);
  const [saved, setSaved] = useState<CVData>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState(false);

  // Compared by value so reordering a field back to its original state
  // correctly clears the unsaved marker.
  const dirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(saved),
    [profile, saved],
  );

  async function handleSave() {
    const parsed = cvDataSchema.safeParse(profile);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Something in the form isn't valid.");
      return;
    }

    setSaving(true);
    try {
      await apiSend("/api/profile", "PUT", parsed.data);
      setProfile(parsed.data);
      setSaved(parsed.data);
      toast.success("Profile saved.");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const raw = await apiUpload<unknown>("/api/onboarding/extract", formData);
      const parsed = cvDataLenientSchema.safeParse(raw);
      if (!parsed.success) throw new Error("The extracted CV came back in an unexpected shape.");

      setProfile(parsed.data);
      setReplacing(false);
      toast.success("Read it. Check everything below, then save.");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't read that PDF."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />

      <main className="mx-auto max-w-[780px] px-4 pb-32 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8">
          <p className="eyebrow">Your base CV</p>
          <h1 className="font-display mt-3 text-[clamp(1.8rem,4.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
            Everything starts here.
          </h1>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.65] text-ink-muted">
            Each tailored CV is rewritten from this profile. Nothing is invented, so anything
            missing here can never appear in an application.
          </p>
        </div>

        {/* -------------------------------------------- Replace from PDF */}
        <section className="mb-5 rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                Start again from a PDF
              </h2>
              <p className="mt-1 max-w-[52ch] text-[13px] leading-[1.55] text-ink-muted">
                Uploading a newer CV replaces everything below with what it reads. You still get
                to check it before anything is saved.
              </p>
            </div>
            {!replacing && !uploading && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplacing(true)}
                icon={<UploadIcon className="text-[1.05em]" />}
              >
                Upload PDF
              </Button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {(replacing || uploading) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-5">
                  <PdfDropzone onFile={handleUpload} uploading={uploading} />
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => setReplacing(false)}
                      className="mt-3 text-[13px] text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
                    >
                      Never mind
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <ProfileFormFields profile={profile} setProfile={setProfile} />
      </main>

      {/* Save bar. Appears only when there is something to save, so it never
          sits on screen as permanent furniture. */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 px-4 py-3.5 backdrop-blur-xl sm:px-6"
          >
            <div className="mx-auto flex max-w-[780px] items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-[13.5px] text-ink-muted">
                <span className="h-2 w-2 shrink-0 rounded-full bg-flame" aria-hidden="true" />
                Unsaved changes
              </p>
              <div className="flex items-center gap-2">
                <Button variant="quiet" size="sm" onClick={() => setProfile(saved)} disabled={saving}>
                  Discard
                </Button>
                <Button onClick={handleSave} loading={saving} loadingText="Saving…">
                  Save changes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
