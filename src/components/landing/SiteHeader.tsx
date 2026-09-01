"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRightIcon, XIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "What you get" },
  { href: "#faq", label: "Questions" },
];

/**
 * Sticky landing header. It starts flush with the canvas and only grows a
 * hairline border and a faint shadow once the page has scrolled, so the top of
 * the page reads as one uninterrupted sheet.
 */
export default function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A locked body prevents the page scrolling behind the open mobile sheet.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled
            ? "border-b border-line bg-paper/85 backdrop-blur-xl shadow-[0_1px_0_rgba(26,23,20,0.02)]"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-ink-muted transition-colors duration-200 hover:bg-sunk hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {signedIn ? (
              <ButtonLink href="/dashboard" size="sm" icon={<ArrowRightIcon className="order-2 text-[1.05em]" />}>
                <span className="order-1">Open Craftly</span>
              </ButtonLink>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden rounded-lg px-3.5 py-2 text-[14px] font-medium text-ink-muted transition-colors duration-200 hover:bg-sunk hover:text-ink sm:block"
                >
                  Sign in
                </Link>
                <ButtonLink href="/sign-in" size="sm">
                  Start free
                </ButtonLink>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-sunk md:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-paper md:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-[68px] items-center justify-between px-5">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-sunk"
                aria-label="Close menu"
              >
                <XIcon className="text-[20px]" />
              </button>
            </div>

            <nav className="flex flex-col px-5 pt-6" aria-label="Mobile">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-line py-5 font-display text-[26px] font-medium tracking-[-0.03em] text-ink"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.3 }}
                >
                  {link.label}
                </motion.a>
              ))}

              <div className="mt-8 flex flex-col gap-3">
                <ButtonLink href={signedIn ? "/dashboard" : "/sign-in"} size="lg" className="w-full">
                  {signedIn ? "Open Craftly" : "Start free"}
                </ButtonLink>
                {!signedIn && (
                  <ButtonLink href="/sign-in" variant="ghost" size="lg" className="w-full">
                    Sign in
                  </ButtonLink>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
