export interface CVData {
  name: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    github: string;
    linkedin: string;
    website: string;
  };
  summary: string;
  skills: {
    category: string;
    items: string[];
  }[];
  experience: {
    company: string;
    title: string;
    location: string;
    period: string;
    bullets: string[];
    link?: string;
  }[];
  projects: {
    name: string;
    description: string;
  }[];
  education: {
    degree: string;
    school: string;
    location: string;
    year: string;
  };
}

export interface TailoredCV {
  targetCompany?: string;
  targetRole?: string;
  summary: string;
  skills: {
    category: string;
    items: string[];
  }[];
  experience: {
    company: string;
    title: string;
    location: string;
    period: string;
    bullets: string[];
    link?: string;
  }[];
  projects: {
    name: string;
    description: string;
  }[];
  education: {
    degree: string;
    school: string;
    location: string;
    year: string;
  };
  additionalSections?: {
    title: string;
    items: string[];
  }[];
}
