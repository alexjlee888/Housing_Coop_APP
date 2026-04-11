import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditRegulationForm } from "@/components/regulations/EditRegulationForm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function EditRegulationPage({
  params,
}: {
  params: Promise<{ regulationId: string }>;
}) {
  const { regulationId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  if (membership.role === "RESIDENT") redirect(`/regulations/${regulationId}`);

  const regulation = await db.regulation.findUnique({ where: { id: regulationId } });
  if (!regulation || regulation.buildingId !== membership.buildingId) notFound();

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link
        href={`/regulations/${regulationId}`}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to document
      </Link>
      <EditRegulationForm regulation={regulation} buildingId={membership.buildingId} />
    </div>
  );
}
