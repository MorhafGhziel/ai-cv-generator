# Craftly — AI CV Generator

Craftly takes your base CV and a job description, then uses AI to generate a perfectly tailored resume in seconds. No more rewriting from scratch for every application.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![MongoDB](https://img.shields.io/badge/MongoDB-Prisma-47A248?logo=mongodb)

## What it does

- **Upload your CV once** — PDF upload with AI-powered extraction, or fill in manually
- **Generate tailored CVs** — Paste any job description and get a rewritten CV that mirrors the role's language, emphasizes relevant skills, and restructures your experience to match
- **Answer application questions** — Paste screening questions from job forms and get natural, human-sounding answers based on your real experience
- **Download as PDF** — Clean, professional A4 layout ready to submit
- **Edit anytime** — Update your base profile whenever your experience changes

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Frontend | React 19, Tailwind CSS v4 |
| Auth | NextAuth.js v5 (Google OAuth) |
| Database | MongoDB with Prisma ORM |
| AI | Google Gemini + Groq (fallback) |
| PDF Parsing | unpdf |
| PDF Export | react-to-print |

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB database (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- Google OAuth credentials ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- At least one AI provider API key:
  - [Google AI Studio](https://aistudio.google.com/apikey) (Gemini)
  - [Groq Console](https://console.groq.com/keys) (optional fallback)

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/MorhafGhziel/ai-cv-generator.git
   cd ai-cv-generator
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root:

   ```env
   # Database
   DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/craftly"

   # Auth
   AUTH_SECRET="your-random-secret-here"
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"

   # AI Providers (at least one required)
   GEMINI_API_KEY="your-gemini-api-key"
   GROQ_API_KEY="your-groq-api-key"
   ```

4. **Generate Prisma client**

   ```bash
   npx prisma generate
   ```

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (CV generator + Q&A)
│   ├── sign-in/page.tsx            # Google OAuth sign-in
│   ├── onboarding/page.tsx         # First-time profile setup
│   ├── profile/page.tsx            # Edit profile
│   └── api/
│       ├── generate/route.ts       # AI CV tailoring
│       ├── answers/route.ts        # AI application answers
│       ├── profile/route.ts        # Update profile
│       ├── cv-history/             # CRUD for saved CVs
│       └── onboarding/             # PDF extract + save
├── components/
│   ├── HomeClient.tsx              # Main dashboard UI
│   ├── CVPreview.tsx               # A4 CV renderer
│   ├── ProfileFormFields.tsx       # Reusable profile form
│   ├── ProfileClient.tsx           # Profile edit page
│   └── OnboardingForm.tsx          # Onboarding flow
├── lib/
│   ├── ai.ts                      # Gemini/Groq with fallback
│   ├── auth.ts                    # NextAuth config
│   ├── prisma.ts                  # DB client
│   └── cv-data.ts                 # TypeScript interfaces
└── middleware.ts                   # Auth protection
```

## How the AI works

1. **CV Extraction** — When you upload a PDF, the text is extracted with `unpdf` and sent to the AI to parse into structured JSON (name, skills, experience, etc.)

2. **CV Tailoring** — Your base profile + the job description are sent to the AI with instructions to:
   - Mirror the job's language and terminology
   - Reframe bullet points to emphasize relevant skills
   - Add inferable skills (e.g. if you built REST APIs, include "API Design")
   - Never fabricate companies, degrees, or roles

3. **Application Answers** — Questions are analyzed against your latest tailored CV to generate natural, casual-tone answers with appropriate detail levels

The system tries multiple models in sequence (Gemini Flash → Groq Llama) with retry logic, so it stays reliable even when individual providers hit rate limits.

## Deploy

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your repo to GitHub
2. Import the project on Vercel
3. Add your environment variables
4. Deploy

## License

MIT
