"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The landing hero graphic: a job posting on the left, the candidate's CV on
 * the right, and the matching happening between them.
 *
 * The loop is deliberately slow and low-contrast — highlight bars wipe across
 * three lines, a match badge settles, and it rests for several seconds before
 * repeating. It illustrates the product rather than decorating the page, and
 * it collapses to a still composition under `prefers-reduced-motion`.
 */

const LINE = "var(--color-line-strong)";
const FAINT = "var(--color-line)";

/** Body copy line on a document. */
function Line({ x, y, w, h = 5, fill = LINE }: { x: number; y: number; w: number; h?: number; fill?: string }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />;
}

export default function HeroArt({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  // One full cycle: highlights sweep, badge lands, everything rests.
  const CYCLE = 6.4;
  const sweep = (i: number) =>
    reduced
      ? {}
      : {
          initial: { scaleX: 0 },
          animate: { scaleX: [0, 1, 1, 0] },
          transition: {
            duration: CYCLE,
            times: [0, 0.12, 0.78, 0.86],
            delay: 0.5 + i * 0.28,
            repeat: Infinity,
            repeatDelay: 0.6,
            ease: "easeInOut" as const,
          },
        };

  return (
    <div className={className}>
      <svg
        viewBox="0 0 520 470"
        fill="none"
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="A job posting beside a CV, with matching lines highlighted"
      >
        <defs>
          <clipPath id="hero-cv-clip">
            <rect x="206" y="86" width="286" height="344" rx="20" />
          </clipPath>
        </defs>

        {/* ---------------------------------------------------------------
            Back sheet — the job posting
        --------------------------------------------------------------- */}
        <motion.g
          animate={reduced ? undefined : { y: [0, -7, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <g transform="rotate(-6 150 250)">
            <rect x="24" y="96" width="252" height="322" rx="18" fill="var(--color-ink)" opacity="0.05" />
            <rect
              x="20"
              y="90"
              width="252"
              height="322"
              rx="18"
              fill="var(--color-surface)"
              stroke="var(--color-line)"
              strokeWidth="1.5"
            />

            {/* Posting header */}
            <rect x="44" y="118" width="26" height="26" rx="8" fill="var(--color-ink)" />
            <Line x={80} y={124} w={78} h={7} fill="var(--color-ink)" />
            <Line x={80} y={137} w={52} h={5} fill={FAINT} />

            {/* "Requirements" label */}
            <Line x={44} y={172} w={64} h={6} fill="var(--color-flame)" />

            {/* Requirement rows, each with a marker dot */}
            {[196, 220, 244, 268].map((y, i) => (
              <g key={y}>
                <circle cx="48" cy={y + 2.5} r="2.5" fill={LINE} />
                <Line x={60} y={y} w={[168, 140, 176, 122][i]} />
              </g>
            ))}

            <Line x={44} y={306} w={72} h={6} fill={FAINT} />
            {[330, 350, 370].map((y, i) => (
              <Line key={y} x={44} y={y} w={[196, 172, 148][i]} />
            ))}
          </g>
        </motion.g>

        {/* ---------------------------------------------------------------
            Front sheet — the tailored CV
        --------------------------------------------------------------- */}
        <motion.g
          animate={reduced ? undefined : { y: [0, -11, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
          <g transform="rotate(3 349 258)">
            <rect x="214" y="94" width="286" height="344" rx="20" fill="var(--color-ink)" opacity="0.09" />
            <rect
              x="206"
              y="86"
              width="286"
              height="344"
              rx="20"
              fill="var(--color-surface)"
              stroke="var(--color-line-strong)"
              strokeWidth="1.5"
            />

            <g clipPath="url(#hero-cv-clip)">
              {/* Name and contact row */}
              <Line x={236} y={122} w={132} h={13} fill="var(--color-ink)" />
              <Line x={236} y={146} w={186} h={5} fill={FAINT} />
              <path d="M236 168h230" stroke={FAINT} strokeWidth="1.5" />

              {/* Section: summary */}
              <Line x={236} y={188} w={58} h={6} fill="var(--color-flame-ink)" />
              <motion.rect
                x="234"
                y="204"
                width="222"
                height="13"
                rx="4"
                fill="var(--color-flame)"
                opacity="0.22"
                style={{ transformOrigin: "234px 210px" }}
                {...sweep(0)}
              />
              <Line x={236} y={207} w={218} />
              <Line x={236} y={224} w={190} />

              {/* Section: skills */}
              <Line x={236} y={256} w={44} h={6} fill="var(--color-flame-ink)" />
              <motion.rect
                x="234"
                y="272"
                width="196"
                height="13"
                rx="4"
                fill="var(--color-flame)"
                opacity="0.22"
                style={{ transformOrigin: "234px 278px" }}
                {...sweep(1)}
              />
              <Line x={236} y={275} w={192} />

              {/* Skill pills */}
              {[
                { x: 236, w: 54 },
                { x: 298, w: 42 },
                { x: 348, w: 62 },
                { x: 418, w: 38 },
              ].map((pill) => (
                <rect
                  key={pill.x}
                  x={pill.x}
                  y={294}
                  width={pill.w}
                  height={16}
                  rx={8}
                  fill="var(--color-flame-soft)"
                  stroke="var(--color-flame)"
                  strokeOpacity="0.28"
                />
              ))}

              {/* Section: experience */}
              <Line x={236} y={334} w={72} h={6} fill="var(--color-flame-ink)" />
              <Line x={236} y={352} w={104} h={7} fill="var(--color-ink)" />
              <motion.rect
                x="234"
                y="370"
                width="210"
                height="13"
                rx="4"
                fill="var(--color-flame)"
                opacity="0.22"
                style={{ transformOrigin: "234px 376px" }}
                {...sweep(2)}
              />
              <Line x={236} y={373} w={206} />
              <Line x={236} y={390} w={168} />
              <Line x={236} y={407} w={188} />
            </g>
          </g>
        </motion.g>

        {/* ---------------------------------------------------------------
            Match badge — lands after the highlights settle
        --------------------------------------------------------------- */}
        <motion.g
          initial={reduced ? undefined : { scale: 0, opacity: 0 }}
          animate={reduced ? undefined : { scale: [0, 1.12, 1, 1, 0.9], opacity: [0, 1, 1, 1, 0] }}
          transition={
            reduced
              ? undefined
              : {
                  duration: 6.4,
                  times: [0, 0.2, 0.28, 0.8, 0.9],
                  delay: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.6,
                  ease: "easeOut",
                }
          }
          style={{ transformOrigin: "462px 112px" }}
        >
          <circle cx="462" cy="112" r="30" fill="var(--color-mint)" stroke="var(--color-ink)" strokeWidth="2.5" />
          <path
            d="m449 113 8.5 8.5L476 103"
            stroke="var(--color-ink)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>

        {/* ---------------------------------------------------------------
            Scattered decoration
        --------------------------------------------------------------- */}
        <motion.g
          animate={reduced ? undefined : { y: [0, -9, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "44px 56px" }}
        >
          <path
            d="M44 34c1.2 7.4 4.6 11.2 11.6 13.6C48.6 50 45.2 53.8 44 61.2 42.8 53.8 39.4 50 32.4 47.6 39.4 45.2 42.8 41.4 44 34Z"
            fill="var(--color-sun)"
            stroke="var(--color-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </motion.g>

        <motion.g
          animate={reduced ? undefined : { y: [0, 10, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          style={{ transformOrigin: "486px 372px" }}
        >
          <path
            d="M494 344 480 366h7.5l-1.5 14 14-20h-8l2-16Z"
            fill="var(--color-flame)"
            stroke="var(--color-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </motion.g>

        <motion.circle
          cx="176"
          cy="440"
          r="7"
          fill="var(--color-grape)"
          stroke="var(--color-ink)"
          strokeWidth="2"
          animate={reduced ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
      </svg>
    </div>
  );
}
