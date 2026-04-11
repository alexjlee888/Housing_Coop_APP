import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil, MapPin, Users } from "lucide-react";
import { IssueStatusUpdater } from "@/components/issues/IssueStatusUpdater";
import { DeleteButton } from "@/components/DeleteButton";
import type { TicketPriority } from "@/generated/prisma/client";

const PRIORITY_VARIANT: Record<TicketPriority, "default" | "secondary" | "outline" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: {
      reportedBy: { select: { name: true, username: true } },
      tickets: {
        include: {
          createdBy: { select: { name: true, username: true } },
          _count: { select: { unitImpacts: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!issue || issue.buildingId !== membership.buildingId) notFound();

  const canEdit =
    issue.reportedById === userId ||
    membership.role === "BOARD_MEMBER" ||
    membership.role === "ADMIN";

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/issues" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
          <ArrowLeft className="w-4 h-4" /> Issues
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/issues/${issueId}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
            <DeleteButton
              apiEndpoint={`/api/buildings/${membership.buildingId}/issues/${issueId}`}
              redirectTo="/issues"
              confirmMessage="Delete this issue and unlink all associated tickets?"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{issue.title}</CardTitle>
          </div>
          <IssueStatusUpdater
            issueId={issue.id}
            buildingId={membership.buildingId}
            currentStatus={issue.status}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
          <p className="text-xs text-muted-foreground">
            Reported by {issue.reportedBy.name ?? issue.reportedBy.username} · {timeAgo(issue.createdAt)}
          </p>
        </CardContent>
      </Card>

      {/* Linked Tickets */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {issue.tickets.length} Linked {issue.tickets.length === 1 ? "Ticket" : "Tickets"}
        </h2>

        {issue.tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets linked to this issue yet.</p>
        ) : (
          <div className="space-y-2">
            {issue.tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">{ticket.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{ticket.createdBy.name ?? ticket.createdBy.username}</span>
                    <span>{timeAgo(ticket.createdAt)}</span>
                    {ticket._count.unitImpacts > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {ticket._count.unitImpacts} unit{ticket._count.unitImpacts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={PRIORITY_VARIANT[ticket.priority]} className="text-xs">
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link
          href={`/tickets/new`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
        >
          Add linked ticket
        </Link>
      </div>
    </div>
  );
}
