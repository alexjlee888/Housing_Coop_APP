import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, MapPin, Users } from "lucide-react";

function formatEventDate(start: Date, _end: Date, allDay: boolean) {
  if (allDay) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(start);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
}

export default async function CalendarPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const now = new Date();

  const [upcoming, past] = await Promise.all([
    db.calendarEvent.findMany({
      where: { buildingId: membership.buildingId, startAt: { gte: now } },
      include: {
        _count: { select: { attendees: true } },
        attendees: { where: { userId, rsvp: true }, select: { rsvp: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    db.calendarEvent.findMany({
      where: { buildingId: membership.buildingId, startAt: { lt: now } },
      include: {
        _count: { select: { attendees: true } },
        attendees: { where: { userId, rsvp: true }, select: { rsvp: true } },
      },
      orderBy: { startAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Building events and meetings</p>
        </div>
        <Link href="/calendar/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="w-4 h-4" /> New Event
        </Link>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <p className="text-muted-foreground text-sm">No events scheduled yet.</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Upcoming · {upcoming.length}
              </h2>
              <div className="space-y-2">
                {upcoming.map((event) => (
                  <Link
                    key={event.id}
                    href={`/calendar/${event.id}`}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatEventDate(event.startAt, event.endAt, event.allDay)}</span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event._count.attendees}
                        </span>
                      </div>
                    </div>
                    {event.attendees.length > 0 && (
                      <Badge variant="secondary" className="shrink-0 text-xs">Going</Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Past Events
              </h2>
              <div className="space-y-2">
                {past.map((event) => (
                  <Link
                    key={event.id}
                    href={`/calendar/${event.id}`}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors opacity-60"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventDate(event.startAt, event.endAt, event.allDay)}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
