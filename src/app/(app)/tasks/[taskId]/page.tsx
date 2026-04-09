import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar, User, Pencil } from "lucide-react";
import { TaskStatusUpdater } from "@/components/tasks/TaskStatusUpdater";
import { DeleteButton } from "@/components/DeleteButton";
import type { TaskPriority } from "@/generated/prisma/client";

const priorityVariant: Record<TaskPriority, "default" | "secondary" | "outline" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      createdBy: { select: { name: true, username: true } },
      assignee: { select: { name: true, username: true } },
    },
  });

  if (!task || task.buildingId !== membership.buildingId) notFound();

  const canEdit = task.createdById === userId || membership.role === "ADMIN";

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/tasks" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
          <ArrowLeft className="w-4 h-4" /> Tasks
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/tasks/${taskId}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <DeleteButton
              apiEndpoint={`/api/buildings/${membership.buildingId}/tasks/${taskId}`}
              redirectTo="/tasks"
              confirmMessage="Delete this task?"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{task.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
            </div>
          </div>
          <TaskStatusUpdater
            taskId={task.id}
            buildingId={membership.buildingId}
            currentStatus={task.status}
          />
        </CardHeader>

        <CardContent className="space-y-4">
          {task.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 shrink-0" />
              <span>
                {task.assignee
                  ? task.assignee.name ?? task.assignee.username
                  : "Unassigned"}
              </span>
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Due {formatDate(task.dueDate)}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Created by {task.createdBy.name ?? task.createdBy.username} ·{" "}
            {formatDate(task.createdAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
