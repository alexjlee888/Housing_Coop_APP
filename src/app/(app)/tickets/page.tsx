import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, MapPin, Users } from "lucide-react";
import type { TicketStatus, TicketPriority } from "@/generated/prisma/client";

const STATUS_ORDER: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};
const PRIORITY_VARIANT: Record<TicketPriority, "default" | "secondary" | "outline" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export default async function TicketsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const tickets = await db.ticket.findMany({
    where: { buildingId: membership.buildingId },
    include: {
      createdBy: { select: { name: true, username: true } },
      _count: { select: { unitImpacts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    tickets: tickets.filter((t) => t.status === status),
  })).filter((g) => g.tickets.length > 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maintenance requests and repair issues
          </p>
        </div>
        <Link href="/tickets/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="w-4 h-4" /> New Ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tickets yet. Submit one to report a maintenance issue.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ status, tickets: group }) => (
            <div key={status}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {STATUS_LABEL[status]} · {group.length}
              </h2>
              <div className="space-y-2">
                {group.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{ticket.createdBy.name ?? ticket.createdBy.username}</span>
                        {ticket.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {ticket.location}
                          </span>
                        )}
                        <span>{timeAgo(ticket.createdAt)}</span>
                        {ticket._count.unitImpacts > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {ticket._count.unitImpacts} unit{ticket._count.unitImpacts !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={PRIORITY_VARIANT[ticket.priority]} className="shrink-0 text-xs">
                      {ticket.priority}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
