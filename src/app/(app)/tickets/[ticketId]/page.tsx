import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, MapPin, Pencil, Link2 } from "lucide-react";
import { TicketStatusUpdater } from "@/components/tickets/TicketStatusUpdater";
import { UnitImpactButton } from "@/components/tickets/UnitImpactButton";
import { DeleteButton } from "@/components/DeleteButton";
import type { TicketPriority } from "@/generated/prisma/client";

const PRIORITY_VARIANT: Record<TicketPriority, "default" | "secondary" | "outline" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: { select: { name: true, username: true } },
      issue: { select: { id: true, title: true } },
      unitImpacts: {
        include: {
          unit: { select: { number: true, floor: true } },
          user: { select: { name: true, username: true } },
        },
        orderBy: { reportedAt: "asc" },
      },
    },
  });

  if (!ticket || ticket.buildingId !== membership.buildingId) notFound();

  const canEdit =
    ticket.createdById === userId || membership.role === "BOARD_MEMBER" || membership.role === "ADMIN";

  // Check if current user's unit is already in unitImpacts
  const alreadyReported = ticket.unitImpacts.some((i) => i.userId === userId);

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/tickets" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
          <ArrowLeft className="w-4 h-4" /> Tickets
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/tickets/${ticketId}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
            <DeleteButton
              apiEndpoint={`/api/buildings/${membership.buildingId}/tickets/${ticketId}`}
              redirectTo="/tickets"
              confirmMessage="Delete this ticket?"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{ticket.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={PRIORITY_VARIANT[ticket.priority]}>{ticket.priority}</Badge>
              {ticket.location && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {ticket.location}
                </span>
              )}
            </div>
          </div>
          <TicketStatusUpdater
            ticketId={ticket.id}
            buildingId={membership.buildingId}
            currentStatus={ticket.status}
          />
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>

          {ticket.issue && (
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Linked issue:</span>
              <Link href={`/issues/${ticket.issue.id}`} className="underline underline-offset-2 hover:text-foreground">
                {ticket.issue.title}
              </Link>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Reported by {ticket.createdBy.name ?? ticket.createdBy.username} · {timeAgo(ticket.createdAt)}
            {ticket.resolvedAt && ` · Resolved ${formatDate(ticket.resolvedAt)}`}
          </p>
        </CardContent>
      </Card>

      {/* Unit Impact Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Unit Impact · {ticket.unitImpacts.length}{" "}
            {ticket.unitImpacts.length === 1 ? "unit" : "units"} affected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.unitImpacts.length > 0 && (
            <div className="space-y-2">
              {ticket.unitImpacts.map((impact) => (
                <div key={impact.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Unit {impact.unit.number}</span>
                  {impact.unit.floor && (
                    <span className="text-muted-foreground">Floor {impact.unit.floor}</span>
                  )}
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {impact.user.name ?? impact.user.username}
                  </span>
                </div>
              ))}
            </div>
          )}

          <UnitImpactButton
            ticketId={ticket.id}
            buildingId={membership.buildingId}
            alreadyReported={alreadyReported}
            hasUnit={!!membership.unitId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
