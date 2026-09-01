"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { PlusIcon, TrashIcon } from "@/components/ui/Icons";
import type { CVData } from "@/lib/cv-data";

/**
 * The base-profile editor.
 *
 * Structured as labelled blocks rather than one long column of inputs, so the
 * shape of a CV — who you are, what you know, where you worked — stays legible
 * while editing it.
 */

interface Props {
  profile: CVData;
  setProfile: React.Dispatch<React.SetStateAction<CVData>>;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function Block({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-[1.55] text-ink-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A removable sub-record: one role, one project, one skill group. */
function Row({
  onRemove,
  removeLabel,
  children,
}: {
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="relative rounded-[16px] border border-line bg-sunk/40 p-4"
    >
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[9px] text-ink-faint transition-colors duration-200 hover:bg-danger-soft hover:text-danger"
      >
        <TrashIcon className="text-[16px]" />
      </button>
      <div className="pr-10">{children}</div>
    </motion.div>
  );
}

/**
 * Comma-separated skills, held as raw text while editing.
 *
 * Deriving the input's value straight from the parsed array cannot work: typing
 * a comma produces a trailing empty entry, which is filtered out, which
 * re-renders the field without the comma the user just typed — so only the
 * first skill in a group could ever be entered. The raw string is the source of
 * truth during editing; the array is only re-derived from it.
 */
function SkillItemsInput({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [raw, setRaw] = useState(() => items.join(", "));

  return (
    <Input
      label="Skills"
      value={raw}
      onChange={(event) => {
        setRaw(event.target.value);
        onChange(event.target.value.split(",").map((s) => s.trim()).filter(Boolean));
      }}
      onBlur={() => setRaw(items.join(", "))}
      placeholder="Go, TypeScript, SQL"
      hint="Comma separated"
    />
  );
}

export default function ProfileFormFields({ profile, setProfile }: Props) {
  /* ---------------------------------------------------------------- helpers */

  function setContact(field: keyof CVData["contact"], value: string) {
    setProfile((p) => ({ ...p, contact: { ...p.contact, [field]: value } }));
  }

  function setEducation(field: keyof CVData["education"], value: string) {
    setProfile((p) => ({ ...p, education: { ...p.education, [field]: value } }));
  }

  function updateSkill(index: number, patch: Partial<CVData["skills"][number]>) {
    setProfile((p) => ({
      ...p,
      skills: p.skills.map((group, i) => (i === index ? { ...group, ...patch } : group)),
    }));
  }

  function updateExperience(index: number, patch: Partial<CVData["experience"][number]>) {
    setProfile((p) => ({
      ...p,
      experience: p.experience.map((job, i) => (i === index ? { ...job, ...patch } : job)),
    }));
  }

  function updateProject(index: number, patch: Partial<CVData["projects"][number]>) {
    setProfile((p) => ({
      ...p,
      projects: p.projects.map((project, i) => (i === index ? { ...project, ...patch } : project)),
    }));
  }

  /* ------------------------------------------------------------------ view */

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- Identity */}
      <Block title="You" description="How your name and contact details appear at the top of every CV.">
        <div className="space-y-4">
          <Input
            label="Full name"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={profile.contact.email}
              onChange={(e) => setContact("email", e.target.value)}
              placeholder="ada@example.com"
              autoComplete="email"
            />
            <Input
              label="Phone"
              type="tel"
              value={profile.contact.phone}
              onChange={(e) => setContact("phone", e.target.value)}
              placeholder="+44 7700 900000"
              autoComplete="tel"
            />
            <Input
              label="Location"
              value={profile.contact.location}
              onChange={(e) => setContact("location", e.target.value)}
              placeholder="London, UK"
            />
            <Input
              label="Website"
              value={profile.contact.website}
              onChange={(e) => setContact("website", e.target.value)}
              placeholder="ada.dev"
            />
            <Input
              label="GitHub"
              value={profile.contact.github}
              onChange={(e) => setContact("github", e.target.value)}
              placeholder="github.com/ada"
            />
            <Input
              label="LinkedIn"
              value={profile.contact.linkedin}
              onChange={(e) => setContact("linkedin", e.target.value)}
              placeholder="linkedin.com/in/ada"
            />
          </div>
        </div>
      </Block>

      {/* -------------------------------------------------------- Summary */}
      <Block
        title="Summary"
        description="Two or three sentences. It gets rewritten for each role, so plain and factual beats polished here."
      >
        <Textarea
          value={profile.summary}
          onChange={(e) => setProfile((p) => ({ ...p, summary: e.target.value }))}
          rows={4}
          maxLength={2000}
          aria-label="Professional summary"
          placeholder="Backend engineer with six years building payment systems in Go and Postgres…"
          aside={`${profile.summary.length}/2000`}
        />
      </Block>

      {/* --------------------------------------------------------- Skills */}
      <Block
        title="Skills"
        description="Group them the way you'd say them out loud. Separate each group's skills with commas."
        action={
          <Button
            size="sm"
            variant="ghost"
            icon={<PlusIcon className="text-[1.05em]" />}
            onClick={() => setProfile((p) => ({ ...p, skills: [...p.skills, { category: "", items: [] }] }))}
          >
            Group
          </Button>
        }
      >
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {profile.skills.map((group, index) => (
              <Row
                key={index}
                removeLabel={`Remove skill group ${index + 1}`}
                onRemove={() =>
                  setProfile((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== index) }))
                }
              >
                <div className="space-y-3">
                  <Input
                    label="Category"
                    value={group.category}
                    onChange={(e) => updateSkill(index, { category: e.target.value })}
                    placeholder="Languages"
                  />
                  <SkillItemsInput
                    items={group.items}
                    onChange={(items) => updateSkill(index, { items })}
                  />
                </div>
              </Row>
            ))}
          </AnimatePresence>

          {profile.skills.length === 0 && (
            <p className="py-2 text-[13px] text-ink-faint">No skill groups yet.</p>
          )}
        </div>
      </Block>

      {/* ----------------------------------------------------- Experience */}
      <Block
        title="Experience"
        description="Most recent first. Write bullets as you did them — the rewrite handles the rest."
        action={
          <Button
            size="sm"
            variant="ghost"
            icon={<PlusIcon className="text-[1.05em]" />}
            onClick={() =>
              setProfile((p) => ({
                ...p,
                experience: [
                  ...p.experience,
                  { company: "", title: "", location: "", period: "", bullets: [""], link: "" },
                ],
              }))
            }
          >
            Role
          </Button>
        }
      >
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {profile.experience.map((job, index) => (
              <Row
                key={index}
                removeLabel={`Remove role ${index + 1}`}
                onRemove={() =>
                  setProfile((p) => ({ ...p, experience: p.experience.filter((_, i) => i !== index) }))
                }
              >
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Company"
                      value={job.company}
                      onChange={(e) => updateExperience(index, { company: e.target.value })}
                      placeholder="Monzo"
                    />
                    <Input
                      label="Title"
                      value={job.title}
                      onChange={(e) => updateExperience(index, { title: e.target.value })}
                      placeholder="Backend Engineer"
                    />
                    <Input
                      label="Location"
                      value={job.location}
                      onChange={(e) => updateExperience(index, { location: e.target.value })}
                      placeholder="Remote"
                    />
                    <Input
                      label="Period"
                      value={job.period}
                      onChange={(e) => updateExperience(index, { period: e.target.value })}
                      placeholder="Mar 2022 — Present"
                    />
                  </div>

                  <Textarea
                    label="What you did"
                    value={job.bullets.join("\n")}
                    onChange={(e) =>
                      updateExperience(index, { bullets: e.target.value.split("\n") })
                    }
                    onBlur={(e) =>
                      updateExperience(index, {
                        bullets: e.target.value.split("\n").map((b) => b.trim()).filter(Boolean),
                      })
                    }
                    rows={4}
                    hint="One achievement per line."
                    placeholder={"Cut checkout latency from 800ms to 210ms\nLed the migration off the legacy ledger"}
                  />

                  <Input
                    label="Link"
                    value={job.link ?? ""}
                    onChange={(e) => updateExperience(index, { link: e.target.value })}
                    placeholder="Optional — a case study or the product"
                  />
                </div>
              </Row>
            ))}
          </AnimatePresence>

          {profile.experience.length === 0 && (
            <p className="py-2 text-[13px] text-ink-faint">No roles yet.</p>
          )}
        </div>
      </Block>

      {/* ------------------------------------------------------- Projects */}
      <Block
        title="Projects"
        description="Side projects, open source, anything you built that isn't a job."
        action={
          <Button
            size="sm"
            variant="ghost"
            icon={<PlusIcon className="text-[1.05em]" />}
            onClick={() =>
              setProfile((p) => ({ ...p, projects: [...p.projects, { name: "", description: "" }] }))
            }
          >
            Project
          </Button>
        }
      >
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {profile.projects.map((project, index) => (
              <Row
                key={index}
                removeLabel={`Remove project ${index + 1}`}
                onRemove={() =>
                  setProfile((p) => ({ ...p, projects: p.projects.filter((_, i) => i !== index) }))
                }
              >
                <div className="space-y-3">
                  <Input
                    label="Name"
                    value={project.name}
                    onChange={(e) => updateProject(index, { name: e.target.value })}
                    placeholder="Ledger"
                  />
                  <Textarea
                    label="Description"
                    value={project.description}
                    onChange={(e) => updateProject(index, { description: e.target.value })}
                    rows={2}
                    placeholder="A double-entry accounting library in Rust, used by 400 repos."
                  />
                </div>
              </Row>
            ))}
          </AnimatePresence>

          {profile.projects.length === 0 && (
            <p className="py-2 text-[13px] text-ink-faint">No projects yet.</p>
          )}
        </div>
      </Block>

      {/* ------------------------------------------------------ Education */}
      <Block title="Education" description="Your highest or most relevant qualification.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Degree"
            value={profile.education.degree}
            onChange={(e) => setEducation("degree", e.target.value)}
            placeholder="BSc Computer Science"
          />
          <Input
            label="School"
            value={profile.education.school}
            onChange={(e) => setEducation("school", e.target.value)}
            placeholder="University of Manchester"
          />
          <Input
            label="Location"
            value={profile.education.location}
            onChange={(e) => setEducation("location", e.target.value)}
            placeholder="Manchester, UK"
          />
          <Input
            label="Year"
            value={profile.education.year}
            onChange={(e) => setEducation("year", e.target.value)}
            placeholder="2019"
          />
        </div>
      </Block>
    </div>
  );
}
