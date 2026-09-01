import type { Contact, TailoredCV } from "@/lib/cv-data";

/**
 * The exported document itself — not app chrome.
 *
 * Deliberately plain: one column, Computer Modern, A4 metrics, no colour and
 * no icons. That is what parses cleanly in applicant tracking systems and what
 * reads as a document a person wrote. Every section is omitted when empty, so
 * a partial generation never leaves a heading with nothing under it.
 */

interface CVPreviewProps {
  data: TailoredCV;
  name: string;
  contact: Contact;
}

const CM_STACK =
  "'Computer Modern Serif', 'Latin Modern Roman', 'CMU Serif', Georgia, 'Times New Roman', serif";

export default function CVPreview({ data, name, contact }: CVPreviewProps) {
  const links = [
    { label: "GitHub", href: contact.github },
    { label: "LinkedIn", href: contact.linkedin },
    { label: "Portfolio", href: contact.website },
  ].filter((link) => link.href);

  const details = [contact.email, contact.phone, contact.location].filter(Boolean);

  return (
    <div
      id="cv-preview"
      className="mx-auto w-[210mm] bg-white px-[18mm] py-[15mm] text-[10pt] leading-[1.5] text-[#1a1a1a]"
      style={{ fontFamily: CM_STACK }}
    >
      <header className="mb-4">
        <h1 className="text-[23pt] font-semibold leading-[1.1] tracking-[-0.02em] text-[#111]">
          {name || "Your name"}
        </h1>

        {(details.length > 0 || links.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8.5pt] text-[#555]">
            {details.map((detail, i) => (
              <span key={detail} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#ccc]">|</span>}
                {detail}
              </span>
            ))}
            {links.map((link, i) => (
              <span key={link.label} className="flex items-center gap-2">
                {(details.length > 0 || i > 0) && <span className="text-[#ccc]">|</span>}
                <a href={link.href} className="text-[#555] no-underline">
                  {link.label}
                </a>
              </span>
            ))}
          </div>
        )}
      </header>

      {data.summary && (
        <Section title="Summary">
          <p className="text-[9.5pt] leading-[1.6] text-[#333]">{data.summary}</p>
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Skills">
          <div className="space-y-[3px]">
            {data.skills
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={group.category} className="text-[9.5pt]">
                  {group.category && (
                    <span className="font-semibold text-[#222]">{group.category}: </span>
                  )}
                  <span className="text-[#444]">{group.items.join("  ·  ")}</span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {data.experience.length > 0 && (
        <Section title="Experience">
          {data.experience.map((job, i) => (
            <div key={`${job.company}-${job.period}-${i}`} className="mb-3 last:mb-0">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[10pt] font-semibold text-[#111]">{job.company}</span>
                {job.location && (
                  <span className="shrink-0 text-[8.5pt] text-[#777]">{job.location}</span>
                )}
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[9.5pt] italic text-[#444]">{job.title}</span>
                {job.period && (
                  <span className="shrink-0 text-[8.5pt] text-[#777]">{job.period}</span>
                )}
              </div>

              {job.bullets.length > 0 && (
                <ul className="ml-4 mt-1 space-y-[2px] text-[9.5pt] text-[#333]">
                  {job.bullets.map((bullet, index) => (
                    <li
                      key={index}
                      className="relative pl-3 before:absolute before:left-0 before:text-[#999] before:content-['–']"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {job.link && <p className="ml-7 mt-[2px] text-[8pt] text-[#999]">{job.link}</p>}
            </div>
          ))}
        </Section>
      )}

      {data.projects.length > 0 && (
        <Section title="Projects">
          {data.projects.map((project, i) => (
            <div key={`${project.name}-${i}`} className="mb-2 last:mb-0 text-[9.5pt]">
              <span className="font-semibold text-[#111]">{project.name}</span>
              {project.description && <span className="text-[#444]"> — {project.description}</span>}
            </div>
          ))}
        </Section>
      )}

      {(data.education.degree || data.education.school) && (
        <Section title="Education">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[10pt] font-semibold text-[#111]">{data.education.degree}</span>
            {data.education.location && (
              <span className="shrink-0 text-[8.5pt] text-[#777]">{data.education.location}</span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[9.5pt] text-[#444]">{data.education.school}</span>
            {data.education.year && (
              <span className="shrink-0 text-[8.5pt] text-[#777]">{data.education.year}</span>
            )}
          </div>
        </Section>
      )}

      {data.additionalSections
        ?.filter((section) => section.title && section.items.length > 0)
        .map((section) => (
          <Section key={section.title} title={section.title}>
            <ul className="ml-4 space-y-[2px] text-[9.5pt] text-[#333]">
              {section.items.map((item, index) => (
                <li
                  key={index}
                  className="relative pl-3 before:absolute before:left-0 before:text-[#999] before:content-['–']"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 break-inside-avoid">
      <h2 className="mb-2 border-b border-[#ddd] pb-1 text-[11pt] font-semibold uppercase tracking-[0.08em] text-[#111]">
        {title}
      </h2>
      {children}
    </section>
  );
}
