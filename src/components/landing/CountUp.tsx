"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Counts to `value` the first time it scrolls into view.
 *
 * Eased rather than linear, so it decelerates into the final figure instead of
 * stopping dead — a linear count reads like a loading spinner.
 */
export default function CountUp({
  value,
  suffix = "",
  prefix = "",
  duration = 1500,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  // With reduced motion the final figure is simply rendered — no state to set,
  // so the effect stays purely an animation driver.
  const shown = reduced ? value : display;

  useEffect(() => {
    if (!inView || reduced) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {shown.toLocaleString()}
      {suffix}
    </span>
  );
}
