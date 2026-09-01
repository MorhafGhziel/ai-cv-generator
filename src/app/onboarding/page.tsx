import { redirect } from "next/navigation";
import OnboardingForm from "@/components/app/OnboardingForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingComplete: true, name: true },
  });

  if (user?.onboardingComplete) redirect("/dashboard");

  // Seeds the name field from the Google profile so the form starts filled in.
  return <OnboardingForm suggestedName={user?.name ?? session.user.name ?? null} />;
}
