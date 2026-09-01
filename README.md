# Craftly — one CV, every job

Craftly takes the CV you already have, plus a job description, and rewrites it in the employer's own language — same truth, aimed properly. It also drafts the answers to the screening questions on the application form.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![MongoDB](https://img.shields.io/badge/MongoDB-Prisma-47A248?logo=mongodb)

Runs entirely on free tiers — no paid service anywhere in the stack.

## What it does

- **Upload your CV once** — a PDF is read into a structured, editable profile
- **Tailor it per posting** — paste a job description, get a CV rewritten to match its vocabulary and priorities
- **Answer the form** — paste the screening questions, get answers written to match that CV and your own stated terms
- **Download as PDF** — single-column A4, typeset in Computer Modern, parses cleanly in applicant tracking systems
- **Stay consistent** — every generation is shown what you have already claimed elsewhere and must not contradict it

### What it deliberately won't do

The rewrite is bounded. On every generation the model is instructed never to invent an employer, a degree, or a date; never to claim a technology with no basis in your history; and never to reach for filler like "passionate about" or "results-driven". Tailoring is emphasis, not fabrication.

## Tech stack

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)      |
| Frontend      | React 19, Tailwind CSS v4, Motion       |
| Auth          | NextAuth.js v5 (Google OAuth, JWT)      |
| Database      | MongoDB via Prisma                      |
| Validation    | Zod v4 (shared client and server)       |
| AI            | Google Gemini, with Groq as fallback    |
| PDF parsing   | unpdf                                   |
| PDF export    | react-to-print                          |

## Design system

Warm paper: a cream canvas (`#FDFBF9`), warm charcoal ink, and a single orange accent. Separation comes from hairline borders rather than shadows, and colour beyond the accent is decorative only — it never encodes state.

Three typefaces, each with one job: **Fraunces** for display, **DM Sans** for UI, **Geist Mono** for small uppercase labels. Illustrations are hand-authored SVG, so there is no icon-library dependency and every glyph shares one optical weight.

Tokens live in `src/app/globals.css` under `@theme`. Motion vocabulary lives in `src/components/ui/Motion.tsx`, and everything decorative is skipped under `prefers-reduced-motion`.

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB database ([Atlas free tier](https://www.mongodb.com/atlas) is enough)
- Google OAuth credentials ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- At least one AI key — [Google AI Studio](https://aistudio.google.com/apikey) and/or [Groq](https://console.groq.com/keys), both free

### Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — create `.env.local`:

   ```env
   DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/craftly"

   AUTH_SECRET="a-long-random-string"
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"
   AUTH_URL="http://localhost:3000"

   GEMINI_API_KEY="your-gemini-api-key"
   GROQ_API_KEY="your-groq-api-key"
   ```

3. **Push the schema** (creates the collections and indexes)

   ```bash
   npx prisma db push
   ```

4. **Run**

   ```bash
   npm run dev
   ```

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Public landing page
│   ├── dashboard/                # The workspace: generate, review, download
│   ├── onboarding/               # First run — import or type in a CV
│   ├── profile/                  # Edit the base CV
│   ├── settings/                 # Application preferences + usage
│   ├── sign-in/                  # Google OAuth
│   ├── error.tsx, not-found.tsx  # Boundaries
│   └── api/
│       ├── generate/             # Tailor a CV (rate limited)
│       ├── answers/              # Answer screening questions (rate limited)
│       ├── onboarding/           # PDF extract + save
│       ├── cv-history/           # List, read, delete applications
│       ├── preferences/          # Salary, notice, work authorisation
│       └── usage/                # Remaining daily allowance
├── components/
│   ├── app/                      # Signed-in UI
│   ├── landing/                  # Marketing page
│   ├── art/                      # Hand-authored SVG illustrations
│   ├── ui/                       # Button, Field, Card, Motion, Icons, Logo
│   └── CVPreview.tsx             # The exported A4 document
├── lib/
│   ├── ai.ts                     # Provider fan-out, budgets, JSON parsing
│   ├── prompts.ts                # Prompt construction
│   ├── cv-data.ts                # Zod schemas — the source of truth for shapes
│   ├── preferences.ts            # Per-user application terms
│   ├── rate-limit.ts             # MongoDB-backed quotas
│   ├── api.ts                    # Auth, validation, error mapping for routes
│   └── client-api.ts             # Typed fetch wrapper
└── proxy.ts                      # Route protection (Next 16 proxy convention)
```

## How the backend holds together

**Validation.** `src/lib/cv-data.ts` defines every shape once in Zod and infers the TypeScript types from it, so a type can never drift from its validator. Each shape has two flavours: a strict schema for user input, and a lenient one for model output that repairs partial responses instead of throwing — a half-good generation still renders.

**AI calls.** `generateJSON` asks the provider for JSON natively (Gemini `responseMimeType`, Groq `response_format`), extracts the first *balanced* JSON value from the response, validates it, and retries once. The whole call — retries included — shares a single 50-second budget that sits under the Vercel Hobby ceiling, so it can never be killed mid-flight. Provider errors are logged server-side and returned to the client as one of a small set of readable messages.

**Rate limiting.** Every AI call writes a tiny `UsageEvent`. A check reads that user's last 24 hours in one indexed query and derives both a burst window and a daily quota from it. Limits sit below the Gemini and Groq free-tier ceilings so one user cannot exhaust the shared key. No Redis, no extra service.

**Preferences.** Salary range, notice period, work mode, relocation and sponsorship live per user and are rendered into the answers prompt. They used to be constants in the source.

**Route protection.** `proxy.ts` leaves the landing page and sign-in public. An unauthenticated API call gets a JSON 401 rather than a redirect to an HTML page, so client-side `fetch` reports "you're signed out" instead of failing to parse a document.

## Deploy

Push to GitHub, import on [Vercel](https://vercel.com), add the environment variables, deploy. The AI routes declare `maxDuration = 60`, which the Hobby plan allows.

## License

MIT
