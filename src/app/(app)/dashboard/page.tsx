import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Discussion, User, CalendarEvent } from "@/generated/prisma/client";
import {
  MessageSquare,
  CheckSquare,
  Ticket,
  AlertTriangle,
  CalendarDays,
  Users,
} from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({
    where: { userId },
    include: { building: true },
  });

  if (!membership) redirect("/onboarding");

  const buildingId = membership.buildingId;

  const [
    memberCount,
    openTickets,
    openIssues,
    pendingTasks,
    upcomingEvents,
    recentDiscussions,
  ] = await Promise.all([
    db.buildingMembership.count({ where: { buildingId } }),
    db.ticket.count({ where: { buildingId, status: "OPEN" } }),
    db.issue.count({ where: { buildingId, status: "OPEN" } }),
    db.task.count({ where: { buildingId, status: { in: ["TODO", "IN_PROGRESS"] } } }),
    db.calendarEvent.findMany({
      where: { buildingId, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 3,
    }),
    db.discussion.findMany({
      where: { buildingId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { author: true, _count: { select: { replies: true } } },
    }),
  ]);

  const stats = [
    { label: "Members", value: memberCount, icon: Users },
    { label: "Open Tickets", value: openTickets, icon: Ticket },
    { label: "Open Issues", value: openIssues, icon: AlertTriangle },
    { label: "Active Tasks", value: pendingTasks, icon: CheckSquare },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{membership.building.name}</h1>
        {membership.building.description && (
          <p className="text-muted-foreground mt-1">
            {membership.building.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Discussions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Recent Discussions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDiscussions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No discussions yet.</p>
            ) : (
              recentDiscussions.map((d) => (
                <a
                  key={d.id}
                  href={`/discussions/${d.id}`}
                  className="flex items-start justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline truncate">
                      {d.isPinned && (
                        <Badge variant="secondary" className="mr-1 text-xs">
                          Pinned
                        </Badge>
                      )}
                      {d.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.author.name ?? d.author.username} · {d._count.replies} replies
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {formatDate(d.createdAt)}
                  </p>
                </a>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              upcomingEvents.map((e) => (
                <a
                  key={e.id}
                  href={`/calendar/${e.id}`}
                  className="flex items-start justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline truncate">
                      {e.title}
                    </p>
                    {e.location && (
                      <p className="text-xs text-muted-foreground">{e.location}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {formatDate(e.startAt)}
                  </p>
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
