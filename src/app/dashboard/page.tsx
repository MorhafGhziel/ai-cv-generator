import { redirect } from "next/navigation";
import DashboardClient from "@/components/app/DashboardClient";
import { auth } from "@/lib/auth";
import { toCVData } from "@/lib/cv-data";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Workspace" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cvProfile: true, onboardingComplete: true },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  return <DashboardClient cvProfile={toCVData(user.cvProfile)} />;
}
