import { auth } from "@/lib/auth";
import Landing from "@/components/landing/Landing";

/**
 * The marketing page is public and stays reachable when signed in — the header
 * simply swaps its call to action for a link into the app, rather than
 * redirecting people away from a page they asked for.
 */
export default async function HomePage() {
  const session = await auth();
  return <Landing signedIn={Boolean(session?.user?.id)} />;
}
