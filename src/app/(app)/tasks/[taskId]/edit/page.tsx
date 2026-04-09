import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditTaskForm } from "@/components/tasks/EditTaskForm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.buildingId !== membership.buildingId) notFound();

  if (task.createdById !== userId && membership.role !== "ADMIN") {
    redirect(`/tasks/${taskId}`);
  }

  const members = await db.buildingMembership.findMany({
    where: { buildingId: membership.buildingId },
    include: { user: { select: { id: true, name: true, username: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link
        href={`/tasks/${taskId}`}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to task
      </Link>
      <EditTaskForm
        task={task}
        buildingId={membership.buildingId}
        members={members.map((m) => ({ userId: m.userId, user: m.user }))}
      />
    </div>
  );
}
