"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import HeroArt from "@/components/art/HeroArt";
import { PasteSpot, SendSpot, TailorSpot } from "@/components/art/Spots";
import { HandArrow, MarkerStroke, StarSticker } from "@/components/art/Stickers";
import AnswerDemo from "@/components/landing/AnswerDemo";
import CountUp from "@/components/landing/CountUp";
import Faq from "@/components/landing/Faq";
import KeywordFlow from "@/components/landing/KeywordFlow";
import RejectionGrid from "@/components/landing/RejectionGrid";
import RewriteDemo from "@/components/landing/RewriteDemo";
import SiteHeader from "@/components/landing/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import {
  ArrowRightIcon,
  BoltIcon,
  DocIcon,
  ShieldIcon,
  SlidersIcon,
} from "@/components/ui/Icons";
import { FadeIn, Reveal, RevealGroup, RevealItem } from "@/components/ui/Motion";

const STEPS = [
  {
    n: "01",
    title: "Paste the posting",
    body: "The whole thing — responsibilities, requirements, and the paragraph at the bottom nobody reads. The more it says, the better the match.",
    Art: PasteSpot,
  },
  {
    n: "02",
    title: "Watch it rewrite",
    body: "Your real experience, reordered and reworded in the language the posting uses. Same jobs, same dates, same truth — aimed properly.",
    Art: TailorSpot,
  },
  {
    n: "03",
    title: "Download and apply",
    body: "A clean A4 PDF that parses in any tracking system, plus drafted answers for the screening questions on the form.",
    Art: SendSpot,
  },
];

const FEATURES = [
  {
    icon: <ShieldIcon />,
    title: "Consistent across applications",
    body: "Every generation sees what you have already claimed elsewhere. Two applications to the same company will never describe two different people.",
  },
  {
    icon: <DocIcon />,
    title: "Typeset like a real document",
    body: "Single column, Computer Modern, A4. No sidebars, no colour blocks, no photo. It reads like a person wrote it, because a person did.",
  },
  {
    icon: <SlidersIcon />,
    title: "Your numbers, your rules",
    body: "Set your salary range, notice period and work authorisation once. Every answer respects them, so you never accidentally undersell yourself.",
  },
  {
    icon: <BoltIcon />,
    title: "Free, with an honest ceiling",
    body: "No card, no trial. It runs on free AI tiers, so there is a generous daily cap — well past what a serious week of applying needs.",
  },
];

const WONT_DO = [
  "Invent an employer, a degree, or a date",
  "Claim a technology with no basis in your history",
  "Write “passionate about” or “results-driven”",
  "Pad a bullet with a number you never measured",
];

/** A hairline that draws itself as the section arrives. */
function DrawnRule() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="h-px origin-left bg-line"
      initial={reduced ? undefined : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

export default function Landing({ signedIn }: { signedIn: boolean }) {
  const reduced = useReducedMotion();
  const startHref = signedIn ? "/dashboard" : "/sign-in";

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader signedIn={signedIn} />

      <main>
        {/* ================================================================
            Hero
        ================================================================ */}
        {/* Fills the viewport below the 68px sticky header. `svh` rather than
            `vh` so mobile browser chrome collapsing doesn't crop the CTA, and
            `min-h` rather than `h` so the stacked mobile layout can still grow
            past the fold instead of overflowing. */}
        <section className="relative flex min-h-[calc(100svh-68px)] items-center overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-32 h-[620px] w-[620px] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-flame) 16%, transparent), transparent 68%)",
            }}
          />

          <div className="relative mx-auto w-full max-w-[1180px] px-5 py-14 sm:px-8 sm:py-16">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
              <div>
                <FadeIn>
                  <p className="eyebrow">For people applying to a lot of jobs</p>
                </FadeIn>

                <FadeIn delay={0.06}>
                  <h1 className="font-display mt-5 text-[clamp(3.1rem,9vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-ink">
                    one CV.
                    <br />
                    <span className="relative inline-block">
                      every job.
                      <MarkerStroke className="absolute -bottom-1 left-0 h-3.5 w-full sm:-bottom-2 sm:h-4" />
                    </span>
                  </h1>
                </FadeIn>

                <FadeIn delay={0.14}>
                  <p className="mt-7 max-w-[52ch] text-[17px] leading-[1.65] text-ink-muted sm:text-[18px]">
                    Paste the posting. Craftly rewrites your CV in the employer&rsquo;s own
                    words — the same truth, told the way they&rsquo;re reading for — then
                    drafts the answers to their application form.
                  </p>
                </FadeIn>

                <FadeIn delay={0.22}>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <ButtonLink href={startHref} size="lg">
                      {signedIn ? "Open Craftly" : "Start free — no card"}
                    </ButtonLink>
                    <ButtonLink href="#how" variant="ghost" size="lg">
                      See how it works
                    </ButtonLink>
                  </div>
                </FadeIn>

                <FadeIn delay={0.3}>
                  <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13px] text-ink-faint">
                    {["Free to use", "Your CV never trains a model", "PDF in, PDF out"].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-flame" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m5 12.5 4.5 4.5L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              </div>

              <FadeIn delay={0.18} className="relative">
                <HeroArt className="mx-auto w-full max-w-[540px]" />
              </FadeIn>
            </div>
          </div>

          {/* Now that the hero owns the whole viewport, something has to say the
              page continues. Only shown where the fold is real — on a stacked
              mobile layout the content already overflows, which says it itself. */}
          <motion.a
            href="#how"
            aria-label="Scroll to how it works"
            className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink-faint transition-colors duration-200 hover:text-ink lg:flex"
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <span className="eyebrow">Scroll</span>
            <motion.svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              animate={reduced ? undefined : { y: [0, 5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d="M12 5v14M6 13l6 6 6-6" />
            </motion.svg>
          </motion.a>
        </section>

        {/* ================================================================
            The live rewrite — the whole argument in one block
        ================================================================ */}
        <section className="border-y border-line bg-sunk/40">
          <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mx-auto max-w-[52ch] text-center">
              <p className="eyebrow">Watch it work</p>
              <h2 className="font-display mt-5 text-[clamp(1.9rem,4.5vw,3rem)] font-medium leading-[1.08] tracking-[-0.035em] text-ink">
                One line. Three jobs. Nothing invented.
              </h2>
              <p className="mt-5 text-[15.5px] leading-[1.7] text-ink-muted">
                This is a real bullet from a real CV, rewritten for three different postings.
                Watch which words change — and which facts never do.
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mx-auto mt-12 max-w-[860px]">
              <RewriteDemo />
            </Reveal>
          </div>
        </section>

        {/* ================================================================
            The problem, with the grid
        ================================================================ */}
        <section className="overflow-hidden">
          <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <p className="eyebrow">The problem</p>
                <h2 className="font-display mt-5 max-w-[16ch] text-[clamp(2rem,5vw,3.2rem)] font-medium leading-[1.08] tracking-[-0.035em] text-ink">
                  The same CV, sent forty times.
                </h2>
                <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.75] text-ink-muted">
                  Most applications are read twice: once by software matching keywords, once
                  by a person giving it six seconds. Both are looking for their own words
                  back. A CV written in your words, however good, quietly fails both.
                </p>
                <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.75] text-ink-muted">
                  Rewriting it by hand for every role is the correct answer and nobody has
                  time for it. So the job is to do that rewrite properly, in about a minute,
                  without inventing a single thing you did not do.
                </p>
              </Reveal>

              <Reveal delay={0.1}>
                <RejectionGrid />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================================================================
            Numbers
        ================================================================ */}
        <section className="border-y border-line bg-ink">
          <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 sm:py-16">
            <dl className="grid gap-10 sm:grid-cols-3">
              {[
                { value: 6, suffix: "s", label: "A recruiter's first pass over your CV" },
                { value: 75, suffix: "%", label: "Of CVs are filtered before a person reads them" },
                { value: 60, suffix: "s", label: "To rewrite yours for the role in front of you" },
              ].map((stat, i) => (
                <Reveal key={stat.label} delay={i * 0.08}>
                  <div>
                    <dt className="font-display text-[clamp(2.6rem,6vw,3.8rem)] font-medium leading-none tracking-[-0.04em] text-paper">
                      <CountUp value={stat.value} suffix={stat.suffix} />
                    </dt>
                    <dd className="mt-3 max-w-[26ch] text-[14px] leading-[1.6] text-paper/55">
                      {stat.label}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* ================================================================
            How it works
        ================================================================ */}
        <section id="how" className="scroll-mt-24">
          <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="max-w-[42ch]">
              <p className="eyebrow">How it works</p>
              <h2 className="font-display mt-5 text-[clamp(1.9rem,4.5vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
                Three steps, about a minute.
              </h2>
            </Reveal>

            <div className="relative mt-14">
              {/* Connector that draws between the cards on desktop. */}
              <motion.div
                aria-hidden="true"
                className="absolute left-[16%] right-[16%] top-[64px] hidden h-px origin-left md:block"
                style={{
                  background:
                    "repeating-linear-gradient(to right, var(--color-line-strong) 0 6px, transparent 6px 12px)",
                }}
                initial={reduced ? undefined : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />

              <RevealGroup className="relative grid gap-6 md:grid-cols-3 md:gap-7">
                {STEPS.map(({ n, title, body, Art }) => (
                  <RevealItem key={n}>
                    <article className="group relative h-full rounded-[24px] border border-line bg-surface p-7 shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1.5 hover:border-line-strong hover:shadow-[var(--shadow-lift)]">
                      <div className="flex items-start justify-between">
                        <span className="flex h-7 items-center rounded-full bg-sunk px-2.5 font-mono text-[11px] font-medium tracking-[0.14em] text-ink-muted">
                          {n}
                        </span>
                        <motion.div
                          animate={reduced ? undefined : { y: [0, -6, 0] }}
                          transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Number(n) * 0.7,
                          }}
                        >
                          <Art
                            size={92}
                            className="-mr-1 -mt-1 transition-transform duration-500 ease-[var(--ease-back)] group-hover:-rotate-6 group-hover:scale-110"
                          />
                        </motion.div>
                      </div>
                      <h3 className="font-display mt-6 text-[22px] font-medium tracking-[-0.025em] text-ink">
                        {title}
                      </h3>
                      <p className="mt-2.5 text-[14.5px] leading-[1.65] text-ink-muted">{body}</p>
                    </article>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>

        {/* ================================================================
            Keyword crossing
        ================================================================ */}
        <section id="features" className="scroll-mt-24 border-t border-line bg-sunk/40">
          <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <p className="eyebrow">What you get</p>
                <h2 className="font-display mt-5 max-w-[18ch] text-[clamp(1.9rem,4.5vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
                  It speaks their language, not yours.
                </h2>
                <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.75] text-ink-muted">
                  Screening software matches vocabulary, not meaning. If the posting says
                  CI/CD and you wrote &ldquo;automated deploys&rdquo;, the rewrite says CI/CD
                  — because you did that. If you have never touched Kubernetes, it stays out.
                </p>
              </Reveal>

              <Reveal delay={0.1}>
                <KeywordFlow />
              </Reveal>
            </div>

            <div className="my-16 sm:my-20">
              <DrawnRule />
            </div>

            {/* Form answers */}
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
              <Reveal delay={0.1} className="lg:order-2">
                <p className="eyebrow">And the form</p>
                <h2 className="font-display mt-5 max-w-[18ch] text-[clamp(1.9rem,4.5vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
                  The questions nobody wants to answer again.
                </h2>
                <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.75] text-ink-muted">
                  Paste the screening questions and get answers written to match the CV you
                  just generated — short where short is right, and in your own stated terms
                  for salary, notice and availability.
                </p>
                <div className="mt-8">
                  <ButtonLink href={startHref} variant="secondary">
                    Try it on one posting
                  </ButtonLink>
                </div>
              </Reveal>

              <Reveal className="lg:order-1">
                <AnswerDemo />
              </Reveal>
            </div>

            <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <RevealItem key={feature.title}>
                  <article className="group h-full rounded-[20px] border border-line bg-surface p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-line-strong">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-flame-soft text-[21px] text-flame-ink transition-transform duration-400 ease-[var(--ease-back)] group-hover:-rotate-6 group-hover:scale-110">
                      {feature.icon}
                    </span>
                    <h3 className="mt-5 text-[15.5px] font-semibold tracking-[-0.01em] text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.65] text-ink-muted">{feature.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ================================================================
            What it won't do
        ================================================================ */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <p className="eyebrow">The line it won&rsquo;t cross</p>
                <h2 className="font-display mt-5 max-w-[16ch] text-[clamp(1.9rem,4.5vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
                  Tailoring is not lying.
                </h2>
                <p className="mt-6 max-w-[48ch] text-[15.5px] leading-[1.75] text-ink-muted">
                  A tailored CV emphasises differently. A fabricated one gets you caught in
                  the interview, and it should. So the rewrite is bounded — hard rules the
                  model is held to on every single generation.
                </p>
                <div className="mt-8">
                  <ButtonLink href={startHref} variant="secondary" size="lg">
                    Start free
                  </ButtonLink>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="relative">
                  <StarSticker
                    size={40}
                    className="absolute -left-4 -top-6 hidden rotate-[-14deg] sm:block"
                  />
                  <RevealGroup as="ul" className="space-y-px overflow-hidden rounded-[20px] border border-line bg-surface">
                    {WONT_DO.map((item) => (
                      <RevealItem
                        key={item}
                        as="li"
                        className="flex items-center gap-4 border-b border-line px-6 py-5 last:border-b-0"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
                            <path d="m7 7 10 10M17 7 7 17" />
                          </svg>
                        </span>
                        <span className="text-[14.5px] leading-snug text-ink-soft">{item}</span>
                      </RevealItem>
                    ))}
                  </RevealGroup>
                  <p className="mt-4 flex items-start gap-2 pl-1 text-[13px] leading-relaxed text-ink-faint">
                    <HandArrow width={54} className="-mt-1 shrink-0 opacity-40" flip />
                    Everything it writes traces back to something you told it.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================================================================
            FAQ
        ================================================================ */}
        <section id="faq" className="scroll-mt-24 border-t border-line bg-sunk/40">
          <div className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 sm:py-28">
            <Reveal>
              <p className="eyebrow">Questions</p>
              <h2 className="font-display mt-5 text-[clamp(1.9rem,4.5vw,2.9rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
                The things people ask first.
              </h2>
            </Reveal>
            <Reveal delay={0.08} className="mt-12">
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* ================================================================
            Closing CTA
        ================================================================ */}
        <section className="px-3 pb-3 sm:px-4 sm:pb-4">
          <Reveal>
            <div className="paper-grain relative overflow-hidden rounded-[32px] bg-flame px-6 py-20 text-center sm:rounded-[44px] sm:px-8 sm:py-28">
              {/* Drifting paper sheets behind the copy */}
              {!reduced &&
                [
                  { left: "6%", top: "16%", rotate: -14, delay: 0 },
                  { left: "86%", top: "22%", rotate: 11, delay: 1.1 },
                  { left: "14%", top: "68%", rotate: 8, delay: 0.6 },
                  { left: "80%", top: "70%", rotate: -9, delay: 1.7 },
                ].map((sheet, i) => (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    className="pointer-events-none absolute hidden h-14 w-11 rounded-[4px] bg-white/15 sm:block"
                    style={{ left: sheet.left, top: sheet.top, rotate: `${sheet.rotate}deg` }}
                    animate={{ y: [0, -14, 0] }}
                    transition={{
                      duration: 7,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: sheet.delay,
                    }}
                  />
                ))}

              <h2 className="font-display relative mx-auto max-w-[16ch] text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
                Stop sending the same CV.
              </h2>
              <p className="relative mx-auto mt-6 max-w-[46ch] text-[16px] leading-[1.65] text-white/85">
                Upload it once. Paste a posting. Get the version that actually fits the role
                you want — in about a minute, for free.
              </p>
              <div className="relative mt-10 flex justify-center">
                <ButtonLink
                  href={startHref}
                  size="lg"
                  className="!bg-ink !text-white [--btn-depth-color:rgba(0,0,0,0.45)] hover:!bg-[#2a2520]"
                  icon={<ArrowRightIcon className="order-2 text-[1.05em]" />}
                >
                  <span className="order-1">{signedIn ? "Open Craftly" : "Start free with Google"}</span>
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ==================================================================
          Footer
      ================================================================== */}
      <footer className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-line pt-8 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-[16px] font-semibold tracking-[-0.02em] text-ink">
              craftly
            </p>
            <p className="mt-1 text-[13px] text-ink-faint">
              One CV, aimed properly at every job you want.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]" aria-label="Footer">
            <a href="#how" className="text-ink-muted transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#faq" className="text-ink-muted transition-colors hover:text-ink">
              Questions
            </a>
            <Link href={startHref} className="text-ink-muted transition-colors hover:text-ink">
              {signedIn ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
