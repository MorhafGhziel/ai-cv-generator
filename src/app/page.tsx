import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CVData } from "@/lib/cv-data";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cvProfile: true, onboardingComplete: true },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  const cvProfile = user.cvProfile as unknown as CVData;

  return <HomeClient cvProfile={cvProfile} />;
}
