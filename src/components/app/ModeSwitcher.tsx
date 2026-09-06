"use client";

import { DocIcon, PenIcon } from "@/components/ui/Icons";

/**
 * The app does two genuinely different things and people kept conflating them:
 * instructions like "add my phone number" were typed into the job-posting box,
 * producing a whole new CV aimed at whatever company came last.
 *
 * Making the choice the first thing on the page — with each option stating
 * plainly what happens to the design — removes the ambiguity before it starts.
 */

export type WorkMode = "tailor" | "edit";

const MODES: {
  id: WorkMode;
  title: string;
  body: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "tailor",
    title: "Tailor for a job",
    body: "Paste a posting. Get a new CV written to match it, in Craftly's format.",
    icon: <DocIcon />,
  },
  {
    id: "edit",
    title: "Edit my own CV",
    body: "Change details in the file you uploaded. Your design stays exactly as it is.",
    icon: <PenIcon />,
  },
];

export default function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: WorkMode;
  onChange: (next: WorkMode) => void;
}) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      role="tablist"
      aria-label="What would you like to do?"
    >
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`flex items-start gap-3.5 rounded-[20px] border p-5 text-left transition-[border-color,background-color,transform] duration-250 ease-[var(--ease-out-soft)] ${
              active
                ? "border-ink bg-surface"
                : "border-line bg-surface/50 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface"
            }`}
          >
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[20px] transition-colors duration-250 ${
                active ? "bg-flame text-white" : "bg-sunk text-ink-muted"
              }`}
            >
              {item.icon}
            </span>

            <span className="min-w-0">
              <span
                className={`block text-[15px] font-semibold tracking-[-0.01em] transition-colors duration-250 ${
                  active ? "text-ink" : "text-ink-soft"
                }`}
              >
                {item.title}
              </span>
              <span className="mt-1 block text-[13px] leading-[1.55] text-ink-muted">
                {item.body}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
