"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion vocabulary for the whole app, so timing stays consistent.
 *
 * The rule everywhere: things enter by rising a short distance and settling —
 * no spins, no scale-from-zero, no parallax. Anything decorative is skipped
 * entirely when the user prefers reduced motion.
 */

const RISE = 14;
const DURATION = 0.55;
const EASE = [0.22, 1, 0.36, 1] as const;

const riseVariants: Variants = {
  hidden: { opacity: 0, y: RISE },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE } },
};

const staggerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

/** Reveals children once, the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  if (reduced) return <Component className={className}>{children}</Component>;

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: RISE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: DURATION, ease: EASE, delay }}
    >
      {children}
    </Component>
  );
}

/** Parent for a staggered group. Children should use `RevealItem`. */
export function RevealGroup({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "ul";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  if (reduced) return <Component className={className}>{children}</Component>;

  return (
    <Component
      className={className}
      variants={staggerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  if (reduced) return <Component className={className}>{children}</Component>;

  return (
    <Component className={className} variants={riseVariants}>
      {children}
    </Component>
  );
}

/** Immediate entrance for content already above the fold. */
export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: RISE }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
