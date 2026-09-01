"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { signOut, useSession } from "next-auth/react";
import { ChevronDownIcon, LogOutIcon, SlidersIcon, UserIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";

const TABS = [
  { href: "/dashboard", label: "Workspace" },
  { href: "/profile", label: "Your CV" },
  { href: "/settings", label: "Preferences" },
];

/**
 * Signed-in chrome. The active tab is marked with a shared layout indicator
 * that slides between tabs rather than cutting, so the header reads as one
 * continuous control.
 */
export default function AppHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-7">
          <Logo href="/dashboard" size={30} />

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Sections">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-200 ${
                    active ? "text-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="app-tab"
                      className="absolute inset-0 rounded-lg bg-sunk"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors duration-200 hover:bg-sunk"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full ring-1 ring-line"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-flame-soft text-[12px] font-semibold text-flame-ink">
                  {user.name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              )}
              <span className="hidden max-w-[140px] truncate text-[13.5px] font-medium text-ink sm:block">
                {user.name}
              </span>
              <ChevronDownIcon
                className={`text-[15px] text-ink-faint transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-[16px] border border-line bg-surface shadow-[var(--shadow-pop)]"
                >
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-[13.5px] font-medium text-ink">{user.name}</p>
                    <p className="truncate text-[12px] text-ink-faint">{user.email}</p>
                  </div>

                  <div className="p-1.5">
                    {/* Mobile-only: the tab row is hidden below sm. */}
                    <div className="sm:hidden">
                      {TABS.map((tab) => (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:bg-sunk hover:text-ink"
                        >
                          {tab.label}
                        </Link>
                      ))}
                      <div className="my-1.5 h-px bg-line" />
                    </div>

                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="hidden items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:bg-sunk hover:text-ink sm:flex"
                    >
                      <UserIcon className="text-[16px] text-ink-faint" />
                      Edit your CV
                    </Link>
                    <Link
                      href="/settings"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="hidden items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] text-ink-soft transition-colors hover:bg-sunk hover:text-ink sm:flex"
                    >
                      <SlidersIcon className="text-[16px] text-ink-faint" />
                      Application preferences
                    </Link>

                    <div className="my-1.5 h-px bg-line" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => signOut({ redirectTo: "/" })}
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] text-ink-soft transition-colors hover:bg-sunk hover:text-ink"
                    >
                      <LogOutIcon className="text-[16px] text-ink-faint" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
