"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import AppHeader from "@/components/app/AppHeader";
import type { UsageRow } from "@/components/app/types";
import { Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { apiSend, errorMessage } from "@/lib/client-api";
import {
  CURRENCIES,
  NOTICE_PERIODS,
  SALARY_PERIODS,
  WORK_MODES,
  preferencesSchema,
  type Preferences,
} from "@/lib/preferences";

function Block({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {description && (
        <p className="mt-1 max-w-[58ch] text-[13px] leading-[1.55] text-ink-muted">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * These values feed straight into the answers prompt. Before this page existed
 * they were constants in the source, so every user inherited one person's
 * salary ceiling and availability.
 */
export default function SettingsClient({
  initialPreferences,
  usage,
}: {
  initialPreferences: Preferences;
  usage: UsageRow[];
}) {
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences);
  const [saved, setSaved] = useState<Preferences>(initialPreferences);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => JSON.stringify(prefs) !== JSON.stringify(saved), [prefs, saved]);

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  /** Empty input means "no target", which the prompt reads as "you decide". */
  function setAmount(key: "salaryMin" | "salaryMax", raw: string) {
    const digits = raw.replace(/[^\d]/g, "");
    set(key, digits === "" ? 0 : Math.min(Number(digits), 10_000_000));
  }

  async function handleSave() {
    const parsed = preferencesSchema.safeParse(prefs);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Those preferences aren't valid.");
      return;
    }

    setSaving(true);
    try {
      await apiSend("/api/preferences", "PUT", parsed.data);
      setSaved(parsed.data);
      setPrefs(parsed.data);
      toast.success("Preferences saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save your preferences."));
    } finally {
      setSaving(false);
    }
  }

  const noTarget = prefs.salaryMin === 0 && prefs.salaryMax === 0;

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />

      <main className="mx-auto max-w-[780px] px-4 pb-32 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8">
          <p className="eyebrow">Application preferences</p>
          <h1 className="font-display mt-3 text-[clamp(1.8rem,4.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
            Your terms, once.
          </h1>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.65] text-ink-muted">
            Screening forms ask the same handful of questions. Set your answers here and every
            generated response will respect them — so you never accidentally quote a number you
            didn&rsquo;t mean.
          </p>
        </div>

        <div className="space-y-5">
          {/* ------------------------------------------------------ Salary */}
          <Block
            title="Salary"
            description="The range you'd quote. Answers are converted into whatever currency and period the form asks for, and never go above your maximum."
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto]">
              <Input
                label="Minimum"
                inputMode="numeric"
                value={prefs.salaryMin === 0 ? "" : prefs.salaryMin.toLocaleString()}
                onChange={(e) => setAmount("salaryMin", e.target.value)}
                placeholder="No minimum"
              />
              <Input
                label="Maximum"
                inputMode="numeric"
                value={prefs.salaryMax === 0 ? "" : prefs.salaryMax.toLocaleString()}
                onChange={(e) => setAmount("salaryMax", e.target.value)}
                placeholder="No maximum"
              />
              <Select
                label="Currency"
                value={prefs.salaryCurrency}
                onChange={(e) => set("salaryCurrency", e.target.value as Preferences["salaryCurrency"])}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
              <Select
                label="Per"
                value={prefs.salaryPeriod}
                onChange={(e) => set("salaryPeriod", e.target.value as Preferences["salaryPeriod"])}
              >
                {SALARY_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </Select>
            </div>

            <AnimatePresence>
              {noTarget && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-3 text-[12.5px] leading-relaxed text-ink-faint"
                >
                  With both left blank, salary answers are estimated from the role, seniority and
                  location in each posting.
                </motion.p>
              )}
            </AnimatePresence>
          </Block>

          {/* ------------------------------------------------ Availability */}
          <Block title="Availability" description="How soon you can start, and how you want to work.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Notice period"
                value={prefs.noticePeriod}
                onChange={(e) => set("noticePeriod", e.target.value as Preferences["noticePeriod"])}
              >
                {NOTICE_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </Select>
              <Select
                label="Preferred work mode"
                value={prefs.workMode}
                onChange={(e) => set("workMode", e.target.value as Preferences["workMode"])}
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-5 divide-y divide-line border-t border-line pt-1">
              <div className="py-3.5">
                <Toggle
                  label="Willing to relocate"
                  description="Relocation questions are answered positively."
                  checked={prefs.willingToRelocate}
                  onChange={(next) => set("willingToRelocate", next)}
                />
              </div>
              <div className="py-3.5">
                <Toggle
                  label="I need visa sponsorship"
                  description="Sponsorship questions are answered honestly rather than skipped."
                  checked={prefs.requiresVisaSponsorship}
                  onChange={(next) => set("requiresVisaSponsorship", next)}
                />
              </div>
            </div>
          </Block>

          {/* ------------------------------------------------------- Notes */}
          <Block
            title="Anything else"
            description="Free text the model must honour on every answer. Constraints work best here."
          >
            <Textarea
              value={prefs.notes}
              onChange={(e) => set("notes", e.target.value.slice(0, 1000))}
              rows={3}
              maxLength={1000}
              aria-label="Additional instructions"
              placeholder="Only available afternoons GMT+3. Don't mention my current employer by name."
              aside={`${prefs.notes.length}/1000`}
            />
          </Block>

          {/* ------------------------------------------------------- Usage */}
          <Block
            title="Today's usage"
            description="Craftly runs on free AI tiers, so there's a rolling 24-hour cap per person."
          >
            <ul className="space-y-4">
              {usage.map((row) => {
                const pct = Math.min(100, Math.round((row.used / row.limit) * 100));
                return (
                  <li key={row.action}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-4">
                      <span className="text-[13.5px] capitalize text-ink-soft">{row.label}</span>
                      <span className="font-mono text-[12px] tabular-nums text-ink-faint">
                        {row.used} / {row.limit}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sunk-deep">
                      <motion.div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-danger" : "bg-flame"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Block>
        </div>
      </main>

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
                <Button variant="quiet" size="sm" onClick={() => setPrefs(saved)} disabled={saving}>
                  Discard
                </Button>
                <Button onClick={handleSave} loading={saving} loadingText="Saving…">
                  Save preferences
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
