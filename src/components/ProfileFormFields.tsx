"use client";

import { CVData } from "@/lib/cv-data";

interface ProfileFormFieldsProps {
  profile: CVData;
  setProfile: React.Dispatch<React.SetStateAction<CVData>>;
}

const inputClass =
  "w-full border border-warm-200 rounded-xl px-3 py-2.5 text-sm text-warm-900 placeholder-warm-400 bg-white focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-transparent transition-all";

export default function ProfileFormFields({ profile, setProfile }: ProfileFormFieldsProps) {
  function updateContact(field: keyof CVData["contact"], value: string) {
    setProfile((p) => ({ ...p, contact: { ...p.contact, [field]: value } }));
  }

  function updateSkillCategory(index: number, category: string) {
    setProfile((p) => {
      const skills = [...p.skills];
      skills[index] = { ...skills[index], category };
      return { ...p, skills };
    });
  }

  function updateSkillItems(index: number, items: string) {
    setProfile((p) => {
      const skills = [...p.skills];
      skills[index] = { ...skills[index], items: items.split(",").map((s) => s.trim()).filter(Boolean) };
      return { ...p, skills };
    });
  }

  function addSkillGroup() {
    setProfile((p) => ({ ...p, skills: [...p.skills, { category: "", items: [] }] }));
  }

  function removeSkillGroup(index: number) {
    setProfile((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== index) }));
  }

  function updateExperience(index: number, field: string, value: string | string[]) {
    setProfile((p) => {
      const experience = [...p.experience];
      experience[index] = { ...experience[index], [field]: value };
      return { ...p, experience };
    });
  }

  function addExperience() {
    setProfile((p) => ({
      ...p,
      experience: [...p.experience, { company: "", title: "", location: "", period: "", bullets: [""], link: "" }],
    }));
  }

  function removeExperience(index: number) {
    setProfile((p) => ({ ...p, experience: p.experience.filter((_, i) => i !== index) }));
  }

  function updateProject(index: number, field: string, value: string) {
    setProfile((p) => {
      const projects = [...p.projects];
      projects[index] = { ...projects[index], [field]: value };
      return { ...p, projects };
    });
  }

  function addProject() {
    setProfile((p) => ({ ...p, projects: [...p.projects, { name: "", description: "" }] }));
  }

  function removeProject(index: number) {
    setProfile((p) => ({ ...p, projects: p.projects.filter((_, i) => i !== index) }));
  }

  return (
    <div className="space-y-5">
      {/* Name */}
      <FormSection title="Full name" description="How you want to appear on your CV.">
        <input
          type="text"
          value={profile.name}
          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          className={inputClass}
          placeholder="e.g. Jane Smith"
        />
      </FormSection>

      {/* Contact */}
      <FormSection title="Contact details" description="How recruiters can reach you.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["email", "phone", "location", "github", "linkedin", "website"] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-warm-500 mb-1.5 capitalize">{field}</label>
              <input
                type="text"
                value={profile.contact[field]}
                onChange={(e) => updateContact(field, e.target.value)}
                className={inputClass}
                placeholder={
                  field === "email" ? "you@email.com" :
                  field === "phone" ? "+1 234 567 890" :
                  field === "location" ? "City, Country" :
                  field === "github" ? "github.com/username" :
                  field === "linkedin" ? "linkedin.com/in/username" :
                  "yourwebsite.com"
                }
              />
            </div>
          ))}
        </div>
      </FormSection>

      {/* Summary */}
      <FormSection title="Professional summary" description="A brief overview of your experience and goals.">
        <textarea
          value={profile.summary}
          onChange={(e) => setProfile((p) => ({ ...p, summary: e.target.value }))}
          rows={3}
          className={`${inputClass} resize-vertical`}
          placeholder="Experienced software engineer with 5+ years building web applications..."
        />
      </FormSection>

      {/* Skills */}
      <FormSection title="Skills" description="Group your skills by category (e.g. Languages, Frameworks).">
        <div className="space-y-2">
          {profile.skills.map((group, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={group.category}
                onChange={(e) => updateSkillCategory(i, e.target.value)}
                placeholder="Category"
                className={`w-1/3 ${inputClass}`}
              />
              <input
                type="text"
                value={group.items.join(", ")}
                onChange={(e) => updateSkillItems(i, e.target.value)}
                placeholder="React, TypeScript, Node.js..."
                className={`flex-1 ${inputClass}`}
              />
              <button
                onClick={() => removeSkillGroup(i)}
                className="px-3 text-warm-400 hover:text-red-500 transition-colors cursor-pointer rounded-xl hover:bg-red-50"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <AddButton onClick={addSkillGroup} label="Add skill group" />
      </FormSection>

      {/* Experience */}
      <FormSection title="Work experience" description="Your professional positions, most recent first.">
        <div className="space-y-3">
          {profile.experience.map((exp, i) => (
            <div key={i} className="border border-warm-200 rounded-xl p-4 bg-warm-50/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-warm-500">Position {i + 1}</span>
                <button
                  onClick={() => removeExperience(i)}
                  className="text-xs text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} placeholder="Company" className={inputClass} />
                <input value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} placeholder="Job title" className={inputClass} />
                <input value={exp.location} onChange={(e) => updateExperience(i, "location", e.target.value)} placeholder="Location" className={inputClass} />
                <input value={exp.period} onChange={(e) => updateExperience(i, "period", e.target.value)} placeholder="Jan 2022 - Present" className={inputClass} />
              </div>
              <textarea
                value={exp.bullets.join("\n")}
                onChange={(e) => updateExperience(i, "bullets", e.target.value.split("\n"))}
                placeholder="Key achievements (one per line)"
                rows={3}
                className={`${inputClass} resize-vertical`}
              />
              <input
                value={exp.link || ""}
                onChange={(e) => updateExperience(i, "link", e.target.value)}
                placeholder="Link (optional)"
                className={`${inputClass} mt-2`}
              />
            </div>
          ))}
        </div>
        <AddButton onClick={addExperience} label="Add position" />
      </FormSection>

      {/* Projects */}
      <FormSection title="Projects" description="Side projects, open source contributions, or portfolio pieces.">
        <div className="space-y-3">
          {profile.projects.map((proj, i) => (
            <div key={i} className="border border-warm-200 rounded-xl p-4 bg-warm-50/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-warm-500">Project {i + 1}</span>
                <button
                  onClick={() => removeProject(i)}
                  className="text-xs text-warm-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
              <input value={proj.name} onChange={(e) => updateProject(i, "name", e.target.value)} placeholder="Project name" className={`${inputClass} mb-2`} />
              <textarea value={proj.description} onChange={(e) => updateProject(i, "description", e.target.value)} placeholder="What does it do? What did you use?" rows={2} className={`${inputClass} resize-vertical`} />
            </div>
          ))}
        </div>
        <AddButton onClick={addProject} label="Add project" />
      </FormSection>

      {/* Education */}
      <FormSection title="Education" description="Your academic background.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={profile.education.degree} onChange={(e) => setProfile((p) => ({ ...p, education: { ...p.education, degree: e.target.value } }))} placeholder="Degree (e.g. B.Sc. Computer Science)" className={inputClass} />
          <input value={profile.education.school} onChange={(e) => setProfile((p) => ({ ...p, education: { ...p.education, school: e.target.value } }))} placeholder="School / University" className={inputClass} />
          <input value={profile.education.location} onChange={(e) => setProfile((p) => ({ ...p, education: { ...p.education, location: e.target.value } }))} placeholder="Location" className={inputClass} />
          <input value={profile.education.year} onChange={(e) => setProfile((p) => ({ ...p, education: { ...p.education, year: e.target.value } }))} placeholder="Year (e.g. 2020)" className={inputClass} />
        </div>
      </FormSection>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-warm-200 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-warm-900 mb-0.5">{title}</h2>
      {description && <p className="text-xs text-warm-400 mb-4">{description}</p>}
      {children}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-1.5 text-sm text-warm-500 hover:text-warm-700 cursor-pointer transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {label}
    </button>
  );
}
