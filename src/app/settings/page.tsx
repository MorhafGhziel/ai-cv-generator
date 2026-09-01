import { redirect } from "next/navigation";
import SettingsClient from "@/components/app/SettingsClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPreferences } from "@/lib/preferences";
import { getUsageSummary } from "@/lib/rate-limit";

export const metadata = { title: "Preferences" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/settings");

  const [user, usage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true, onboardingComplete: true },
    }),
    getUsageSummary(session.user.id),
  ]);

  if (!user?.onboardingComplete) redirect("/onboarding");

  return <SettingsClient initialPreferences={toPreferences(user.preferences)} usage={usage} />;
}
