import { redirect } from "next/navigation";
import ProfileClient from "@/components/app/ProfileClient";
import { auth } from "@/lib/auth";
import { toCVData } from "@/lib/cv-data";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Your CV" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cvProfile: true, onboardingComplete: true },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  return <ProfileClient initialProfile={toCVData(user.cvProfile)} />;
}
