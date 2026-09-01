"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import PdfDropzone from "@/components/app/PdfDropzone";
import ProfileFormFields from "@/components/app/ProfileFormFields";
import { WelcomeSpot } from "@/components/art/Spots";
import { HandArrow } from "@/components/art/Stickers";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, CheckIcon, PenIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { apiSend, apiUpload, errorMessage } from "@/lib/client-api";
import { cvDataLenientSchema, cvDataSchema, emptyProfile, type CVData } from "@/lib/cv-data";

type Step = "start" | "review";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * First run. Two steps, with the progress rail always visible, so it is clear
 * from the outset that this is short.
 */
export default function OnboardingForm({ suggestedName }: { suggestedName?: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("start");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CVData>(() => ({
    ...emptyProfile,
    name: suggestedName ?? "",
  }));
  const [cameFromPdf, setCameFromPdf] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const raw = await apiUpload<unknown>("/api/onboarding/extract", formData);
      const parsed = cvDataLenientSchema.safeParse(raw);
      if (!parsed.success) throw new Error("The extracted CV came back in an unexpected shape.");

      setProfile({ ...parsed.data, name: parsed.data.name || suggestedName || "" });
      setCameFromPdf(true);
      setStep("review");
      toast.success("Got it. Have a quick look before we save.");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't read that PDF."));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const parsed = cvDataSchema.safeParse(profile);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please fill in your name first.");
      return;
    }

    setSaving(true);
    try {
      await apiSend("/api/onboarding/save", "POST", parsed.data);
      toast.success("You're set up.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save your profile."));
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Progress rail */}
      <div className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[780px] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/" size={30} />
          <div className="flex items-center gap-2.5">
            <StepDot label="Import" done={step === "review"} active={step === "start"} />
            <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
            <StepDot label="Review" done={false} active={step === "review"} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "start" ? (
          <motion.main
            key="start"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="mx-auto max-w-[620px] px-4 pb-24 pt-12 sm:px-6 sm:pt-20"
          >
            <div className="text-center">
              <div className="flex justify-center">
                <WelcomeSpot size={104} />
              </div>
              <h1 className="font-display mt-6 text-[clamp(2rem,6vw,2.9rem)] font-medium leading-[1.08] tracking-[-0.04em] text-ink">
                Let&rsquo;s get your CV in.
              </h1>
              <p className="mx-auto mt-4 max-w-[44ch] text-[15.5px] leading-[1.65] text-ink-muted">
                Upload the CV you already have and it&rsquo;ll be read into an editable profile.
                You only do this once.
              </p>
            </div>

            <div className="mt-10">
              <PdfDropzone onFile={handleUpload} uploading={uploading} />
            </div>

            {!uploading && (
              <>
                <div className="my-7 flex items-center gap-4">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[12px] text-ink-faint">or</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={<PenIcon className="text-[1.1em]" />}
                  onClick={() => {
                    setCameFromPdf(false);
                    setStep("review");
                  }}
                >
                  Type it in myself
                </Button>

                <p className="mt-8 flex items-start justify-center gap-2 text-center text-[12.5px] leading-relaxed text-ink-faint">
                  <HandArrow width={44} className="-mt-0.5 shrink-0 opacity-35" flip />
                  Your CV is stored against your account and never used to train a model.
                </p>
              </>
            )}
          </motion.main>
        ) : (
          <motion.main
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="mx-auto max-w-[780px] px-4 pb-32 pt-8 sm:px-6 sm:pt-12"
          >
            <button
              type="button"
              onClick={() => setStep("start")}
              className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeftIcon className="text-[16px]" />
              Back
            </button>

            <div className="mb-8">
              <p className="eyebrow">Step two of two</p>
              <h1 className="font-display mt-3 text-[clamp(1.8rem,4.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
                {cameFromPdf ? "Check what we read." : "Tell us about you."}
              </h1>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.65] text-ink-muted">
                {cameFromPdf
                  ? "PDF parsing is good, not perfect. Fix anything that came out wrong — this becomes the source of truth for every CV you generate."
                  : "Only your name is required. Everything else can be filled in as you go, and edited any time."}
              </p>
            </div>

            <ProfileFormFields profile={profile} setProfile={setProfile} />

            <div className="mt-8 flex justify-end">
              <Button
                size="lg"
                onClick={handleSave}
                loading={saving}
                loadingText="Saving…"
                disabled={!profile.name.trim()}
                icon={<CheckIcon className="text-[1.1em]" />}
              >
                Save and start
              </Button>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-300 ${
          done
            ? "border-mint bg-mint text-white"
            : active
              ? "border-flame bg-flame text-white"
              : "border-line-strong text-ink-faint"
        }`}
      >
        {done ? <CheckIcon className="text-[13px]" /> : label.charAt(0)}
      </span>
      <span
        className={`hidden text-[13px] font-medium transition-colors duration-300 sm:block ${
          active ? "text-ink" : "text-ink-faint"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
