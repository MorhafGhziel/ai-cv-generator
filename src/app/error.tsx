"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

/**
 * Route-level error boundary. Without one, a malformed stored profile or a
 * failed data fetch renders the framework's default error screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[render]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <LogoMark size={40} />

      <h1 className="font-display mt-7 text-[32px] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
        That didn&rsquo;t load.
      </h1>
      <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.65] text-ink-muted">
        Something broke on the way to this page. Trying again usually sorts it — if it doesn&rsquo;t,
        head back to your workspace.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
          Try again
        </button>
        <Link href="/dashboard" className={buttonClass("ghost", "md")}>
          Go to workspace
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-[11px] tracking-[0.1em] text-ink-faint">
          {error.digest}
        </p>
      )}
    </div>
  );
}
