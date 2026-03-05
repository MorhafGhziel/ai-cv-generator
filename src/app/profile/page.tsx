import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CVData } from "@/lib/cv-data";
import ProfileClient from "@/components/ProfileClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cvProfile: true, onboardingComplete: true },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  const cvProfile = user.cvProfile as unknown as CVData;

  return <ProfileClient initialProfile={cvProfile} />;
}
