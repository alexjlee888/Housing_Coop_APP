import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";
import ical from "ical-generator";

type Params = { params: Promise<{ buildingId: string; eventId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId, eventId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
    include: { building: { select: { name: true } } },
  });

  if (!event || event.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const calendar = ical({ name: event.building.name });
  calendar.createEvent({
    id: event.id,
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: event.startAt,
    end: event.endAt,
    allDay: event.allDay,
  });

  const icsContent = calendar.toString();

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, "_")}.ics"`,
    },
  });
}
