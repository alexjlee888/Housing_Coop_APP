import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BuildingProvider } from "@/components/BuildingProvider";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Find the user's building membership
  const membership = await db.buildingMembership.findFirst({
    where: { userId },
    include: { building: true, unit: true },
  });

  // If no membership yet, send to onboarding
  if (!membership) redirect("/onboarding");

  return (
    <BuildingProvider membership={membership}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </BuildingProvider>
  );
}
