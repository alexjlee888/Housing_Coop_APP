import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildingSettingsForm } from "@/components/settings/BuildingSettingsForm";
import { RegenerateJoinCode } from "@/components/settings/RegenerateJoinCode";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({
    where: { userId },
    include: { building: true },
  });

  if (!membership || membership.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { building } = membership;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Building Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your building information.</p>
      </div>

      <BuildingSettingsForm building={building} />

      <Card>
        <CardHeader>
          <CardTitle>Join Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this code with residents so they can join your building.
            Regenerating will invalidate the old code immediately.
          </p>
          <RegenerateJoinCode buildingId={building.id} currentCode={building.joinCode} />
        </CardContent>
      </Card>
    </div>
  );
}
