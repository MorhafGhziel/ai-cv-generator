import Link from "next/link";
import { redirect } from "next/navigation";
import { WelcomeSpot } from "@/components/art/Spots";
import { buttonClass } from "@/components/ui/Button";
import { ArrowLeftIcon, GoogleIcon } from "@/components/ui/Icons";
import { LogoMark } from "@/components/ui/Logo";
import { FadeIn } from "@/components/ui/Motion";
import { auth, signIn } from "@/lib/auth";

export const metadata = { title: "Sign in" };

/**
 * Only same-origin paths are accepted, so the callback cannot be an open
 * redirect.
 *
 * Checking for a leading `//` is not enough: browsers normalise a backslash to
 * a forward slash in special schemes, so `/\evil.com` resolves to `//evil.com`
 * and sends the user off-site. Both separators are rejected.
 */
function safeCallback(value: string | undefined): string {
  if (!value || value[0] !== "/") return "/dashboard";
  if (value[1] === "/" || value[1] === "\\") return "/dashboard";
  return value;
}

/**
 * Auth.js error codes, translated into what the reader should actually do.
 * `Configuration` in particular means something is wrong on the server — the
 * database is unreachable, or a key is missing — so telling someone to try
 * again is bad advice; retrying can never fix it.
 */
const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "We couldn't reach our database, so sign-in can't complete. This is on our side — nothing you do differently will help. Please try again in a few minutes.",
  AccessDenied: "You cancelled the sign-in, or Google declined the request. You can try again below.",
  Verification: "That sign-in link has expired or was already used. Start again below.",
  OAuthAccountNotLinked:
    "That email is already registered through a different sign-in method. Use the method you signed up with.",
};

const DEFAULT_ERROR = "That sign-in didn't go through. Please try again.";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeCallback(callbackUrl);

  if (session?.user?.id) redirect(redirectTo);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="mx-auto flex h-[68px] w-full max-w-[1180px] items-center px-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg py-2 text-[13.5px] text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="text-[16px]" />
          Back
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-24">
        <FadeIn className="w-full max-w-[400px]">
          <div className="text-center">
            <div className="flex justify-center">
              <WelcomeSpot size={100} />
            </div>
            <h1 className="font-display mt-6 text-[34px] font-medium leading-[1.1] tracking-[-0.04em] text-ink">
              Welcome to craftly
            </h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
              One CV in. A tailored one out, for every role you apply to.
            </p>
          </div>

          <div className="mt-9 rounded-[24px] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
            {error && (
              <p
                role="alert"
                className="mb-5 rounded-[12px] border border-[color:color-mix(in_srgb,var(--color-danger)_25%,transparent)] bg-danger-soft px-4 py-3 text-[13px] leading-relaxed text-danger"
              >
                {ERROR_MESSAGES[error] ?? DEFAULT_ERROR}
              </p>
            )}

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo });
              }}
            >
              <button
                type="submit"
                className={buttonClass("secondary", "lg", "w-full")}
              >
                <GoogleIcon className="text-[1.25em]" />
                Continue with Google
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-ink-faint">
              We read your name and email address, nothing else. No posting, no contacts, no
              calendar.
            </p>
          </div>

          <ul className="mt-8 space-y-2.5">
            {[
              "Free — no card, no trial",
              "Your CV is never used to train a model",
              "Delete any application permanently, any time",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink-muted">
                <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-flame-soft">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-2.5 w-2.5 text-flame-ink"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </FadeIn>
      </main>

      <footer className="pb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 opacity-60 transition-opacity hover:opacity-100">
          <LogoMark size={20} />
          <span className="font-display text-[13px] font-semibold tracking-[-0.02em] text-ink">
            craftly
          </span>
        </Link>
      </footer>
    </div>
  );
}
