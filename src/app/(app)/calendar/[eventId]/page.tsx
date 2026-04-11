import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, MapPin, Pencil, Clock, Bell } from "lucide-react";
import { RsvpButton } from "@/components/calendar/RsvpButton";
import { AddToCalendarButtons } from "@/components/calendar/AddToCalendarButtons";
import { DeleteButton } from "@/components/DeleteButton";

function formatRange(start: Date, end: Date, allDay: boolean) {
  if (allDay) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }).format(start);
  }
  const datePart = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(start);
  const startTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(start);
  const endTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(end);
  return `${datePart} · ${startTime} – ${endTime}`;
}

function initials(user: { name: string | null; username: string }) {
  return (user.name ?? user.username).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function reminderLabel(amount: number, unit: string) {
  const u = unit === "MINUTES" ? "min" : unit === "HOURS" ? "hr" : "day";
  return `${amount} ${u}${amount !== 1 ? "s" : ""} before`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
    include: {
      createdBy: { select: { name: true, username: true } },
      attendees: {
        include: { user: { select: { name: true, username: true, avatarUrl: true } } },
      },
      reminders: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!event || event.buildingId !== membership.buildingId) notFound();

  const canEdit =
    event.createdById === userId ||
    membership.role === "BOARD_MEMBER" ||
    membership.role === "ADMIN";

  const myAttendee = event.attendees.find((a) => a.userId === userId);
  const going = event.attendees.filter((a) => a.rsvp === true);
  const declined = event.attendees.filter((a) => a.rsvp === false);

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/calendar" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
          <ArrowLeft className="w-4 h-4" /> Calendar
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/calendar/${eventId}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
            <DeleteButton
              apiEndpoint={`/api/buildings/${membership.buildingId}/events/${eventId}`}
              redirectTo="/calendar"
              confirmMessage="Delete this event?"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{event.title}</CardTitle>
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatRange(event.startAt, event.endAt, event.allDay)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description && (
            <p className="text-sm whitespace-pre-wrap">{event.description}</p>
          )}

          {event.reminders.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Bell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {event.reminders.map((r) => (
                <Badge key={r.id} variant="secondary" className="text-xs">
                  {reminderLabel(r.amount, r.unit)}
                </Badge>
              ))}
            </div>
          )}

          <div className="pt-2 space-y-3">
            <RsvpButton
              eventId={event.id}
              buildingId={membership.buildingId}
              currentRsvp={myAttendee?.rsvp ?? null}
            />
            <AddToCalendarButtons
              eventId={event.id}
              buildingId={membership.buildingId}
              title={event.title}
              description={event.description}
              location={event.location}
              startAt={event.startAt}
              endAt={event.endAt}
              allDay={event.allDay}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Attendees · {event.attendees.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {going.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Going · {going.length}
              </p>
              <div className="flex flex-wrap gap-3">
                {going.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarImage src={a.user.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials(a.user)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{a.user.name ?? a.user.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {declined.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Can't go · {declined.length}
              </p>
              <div className="flex flex-wrap gap-3">
                {declined.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 opacity-50">
                    <Avatar size="sm">
                      <AvatarImage src={a.user.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials(a.user)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{a.user.name ?? a.user.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.attendees.filter((a) => a.rsvp === null).length > 0 && (
            <p className="text-xs text-muted-foreground">
              {event.attendees.filter((a) => a.rsvp === null).length} invited, no response yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
