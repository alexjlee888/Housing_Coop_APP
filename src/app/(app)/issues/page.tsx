import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Ticket } from "lucide-react";
import type { IssueStatus } from "@/generated/prisma/client";

const STATUS_VARIANT: Record<IssueStatus, "default" | "secondary" | "outline"> = {
  OPEN: "default",
  IN_PROGRESS: "secondary",
  RESOLVED: "outline",
};

export default async function IssuesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const issues = await db.issue.findMany({
    where: { buildingId: membership.buildingId },
    include: {
      reportedBy: { select: { name: true, username: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Building-wide issues that may span multiple tickets
          </p>
        </div>
        <Link href="/issues/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="w-4 h-4" /> Report Issue
        </Link>
      </div>

      {issues.length === 0 ? (
        <p className="text-muted-foreground text-sm">No issues reported yet.</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/issues/${issue.id}`}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium truncate">{issue.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{issue.reportedBy.name ?? issue.reportedBy.username}</span>
                  <span>{timeAgo(issue.createdAt)}</span>
                  {issue._count.tickets > 0 && (
                    <span className="flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      {issue._count.tickets} ticket{issue._count.tickets !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[issue.status]} className="shrink-0 text-xs">
                {issue.status.replace("_", " ")}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
