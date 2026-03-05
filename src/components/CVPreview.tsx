import { CVData, TailoredCV } from "@/lib/cv-data";

interface CVPreviewProps {
  data: TailoredCV;
  name: string;
  contact: CVData["contact"];
}

export default function CVPreview({ data, name, contact }: CVPreviewProps) {
  return (
    <div
      id="cv-preview"
      className="bg-white text-[#1a1a1a] w-[210mm] mx-auto px-[18mm] py-[14mm] font-[var(--font-inter),_'Inter',_sans-serif] text-[10pt] leading-[1.5]"
    >
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[24pt] font-semibold tracking-[-0.02em] text-[#111]">
          {name}
        </h1>
        <div className="flex items-center gap-1.5 text-[8.5pt] text-[#555] mt-1.5 flex-wrap">
          <span>{contact.email}</span>
          <span className="text-[#ccc]">|</span>
          <span>{contact.phone}</span>
          <span className="text-[#ccc]">|</span>
          <span>{contact.location}</span>
          {contact.github && (
            <>
              <span className="text-[#ccc]">|</span>
              <a href={contact.github} className="text-[#555] no-underline hover:text-[#111]">GitHub</a>
            </>
          )}
          {contact.linkedin && (
            <>
              <span className="text-[#ccc]">|</span>
              <a href={contact.linkedin} className="text-[#555] no-underline hover:text-[#111]">LinkedIn</a>
            </>
          )}
          {contact.website && (
            <>
              <span className="text-[#ccc]">|</span>
              <a href={contact.website} className="text-[#555] no-underline hover:text-[#111]">Portfolio</a>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <Section title="Summary">
        <p className="text-[9.5pt] text-[#333] leading-[1.6]">{data.summary}</p>
      </Section>

      {/* Skills */}
      <Section title="Skills">
        <div className="space-y-1">
          {data.skills.map((group) => (
            <div key={group.category} className="text-[9.5pt]">
              <span className="font-semibold text-[#222]">{group.category}: </span>
              <span className="text-[#444]">{group.items.join("  ·  ")}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Experience */}
      <Section title="Experience">
        {data.experience.map((job) => (
          <div key={`${job.company}-${job.period}`} className="mb-3">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-[10pt] text-[#111]">{job.company}</span>
              <span className="text-[8.5pt] text-[#777] shrink-0 ml-4">{job.location}</span>
            </div>
            <div className="flex justify-between items-baseline mt-[-1px]">
              <span className="text-[9.5pt] text-[#444] italic">{job.title}</span>
              <span className="text-[8.5pt] text-[#777] shrink-0 ml-4">{job.period}</span>
            </div>
            <ul className="mt-1 text-[9.5pt] text-[#333] space-y-0.5 ml-4">
              {job.bullets.map((bullet, i) => (
                <li key={i} className="relative pl-3 before:content-['–'] before:absolute before:left-0 before:text-[#999]">
                  {bullet}
                </li>
              ))}
            </ul>
            {job.link && (
              <div className="text-[8pt] text-[#999] mt-0.5 ml-4 pl-3">
                {job.link}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* Projects */}
      <Section title="Projects">
        {data.projects.map((project) => (
          <div key={project.name} className="mb-2">
            <span className="font-semibold text-[9.5pt] text-[#111]">{project.name}</span>
            <span className="text-[9.5pt] text-[#444]"> — {project.description}</span>
          </div>
        ))}
      </Section>

      {/* Education */}
      <Section title="Education">
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-[10pt] text-[#111]">{data.education.degree}</span>
          <span className="text-[8.5pt] text-[#777] shrink-0 ml-4">{data.education.location}</span>
        </div>
        <div className="flex justify-between items-baseline mt-[-1px]">
          <span className="text-[9.5pt] text-[#444]">{data.education.school}</span>
          <span className="text-[8.5pt] text-[#777] shrink-0 ml-4">{data.education.year}</span>
        </div>
      </Section>

      {/* Additional Sections */}
      {data.additionalSections?.map((section) => (
        <Section key={section.title} title={section.title}>
          <ul className="text-[9.5pt] text-[#333] space-y-0.5 ml-4">
            {section.items.map((item, i) => (
              <li key={i} className="relative pl-3 before:content-['–'] before:absolute before:left-0 before:text-[#999]">
                {item}
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <h2 className="text-[11pt] font-semibold uppercase tracking-[0.08em] text-[#111] border-b border-[#ddd] pb-1 mb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
