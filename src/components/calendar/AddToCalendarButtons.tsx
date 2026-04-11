"use client";

import { ExternalLink, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

function toISONoMs(date: Date) {
  return date.toISOString().replace(/\.\d{3}/, "");
}

function googleCalendarUrl({
  title,
  description,
  location,
  startAt,
  endAt,
  allDay,
}: {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
}) {
  const fmt = allDay
    ? (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "")
    : (d: Date) => toISONoMs(d).replace(/[-:]/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(startAt)}/${fmt(endAt)}`,
    ...(description ? { details: description } : {}),
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function outlookUrl({
  title,
  description,
  location,
  startAt,
  endAt,
}: {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
}) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: startAt.toISOString(),
    enddt: endAt.toISOString(),
    ...(description ? { body: description } : {}),
    ...(location ? { location } : {}),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export function AddToCalendarButtons({
  eventId,
  buildingId,
  title,
  description,
  location,
  startAt,
  endAt,
  allDay,
}: {
  eventId: string;
  buildingId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
}) {
  const googleUrl = googleCalendarUrl({ title, description, location, startAt, endAt, allDay });
  const outlookLink = outlookUrl({ title, description, location, startAt, endAt });
  const icsUrl = `/api/buildings/${buildingId}/events/${eventId}/ics`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <ExternalLink className="w-3.5 h-3.5" /> Google Calendar
      </a>
      <a
        href={outlookLink}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <ExternalLink className="w-3.5 h-3.5" /> Outlook
      </a>
      <Link
        href={icsUrl}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <Download className="w-3.5 h-3.5" /> Download .ics
      </Link>
    </div>
  );
}
