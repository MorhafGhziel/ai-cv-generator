import Link from "next/link";
import { EmptyDocsSpot } from "@/components/art/Spots";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <EmptyDocsSpot size={128} />

      <p className="eyebrow mt-8">404</p>
      <h1 className="font-display mt-3 text-[32px] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
        Nothing filed here.
      </h1>
      <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.65] text-ink-muted">
        This page doesn&rsquo;t exist, or it was deleted. No harm done.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard" className={buttonClass("primary", "md")}>
          Go to workspace
        </Link>
        <Link href="/" className={buttonClass("ghost", "md")}>
          Back home
        </Link>
      </div>
    </div>
  );
}
