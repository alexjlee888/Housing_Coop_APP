import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { CheckSquare, Plus, Circle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";

const statusIcon: Record<TaskStatus, React.ReactNode> = {
  TODO: <Circle className="w-4 h-4 text-muted-foreground" />,
  IN_PROGRESS: <Loader2 className="w-4 h-4 text-blue-500" />,
  DONE: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  CANCELLED: <XCircle className="w-4 h-4 text-muted-foreground" />,
};

const priorityVariant: Record<TaskPriority, "default" | "secondary" | "outline" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

const statusOrder: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];

export default async function TasksPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const tasks = await db.task.findMany({
    where: { buildingId: membership.buildingId },
    include: {
      createdBy: { select: { name: true, username: true } },
      assignee: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = statusOrder.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TaskStatus, typeof tasks>);

  const statusLabel: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
    CANCELLED: "Cancelled",
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Building maintenance and action items</p>
        </div>
        <Link href="/tasks/new" className={cn(buttonVariants({ variant: "default" }))}>
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tasks yet.</p>
          <Link href="/tasks/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
            Create the first task
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {statusOrder.map((status) => {
            const group = grouped[status];
            if (group.length === 0) return null;
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2">
                  {statusIcon[status]}
                  <h2 className="text-sm font-semibold">{statusLabel[status]}</h2>
                  <span className="text-xs text-muted-foreground">({group.length})</span>
                </div>
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                  {group.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task.assignee
                            ? `Assigned to ${task.assignee.name ?? task.assignee.username}`
                            : "Unassigned"}
                          {task.dueDate && ` · Due ${formatDate(task.dueDate)}`}
                        </p>
                      </div>
                      <Badge variant={priorityVariant[task.priority]} className="text-xs shrink-0">
                        {task.priority}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
