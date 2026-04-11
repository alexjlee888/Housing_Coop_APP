import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";
import { z } from "zod";

const rsvpSchema = z.object({ rsvp: z.boolean() });

type Params = { params: Promise<{ buildingId: string; eventId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { buildingId, eventId } = await params;
  let user;
  try {
    user = await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event || event.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const attendee = await db.eventAttendee.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, rsvp: parsed.data.rsvp },
    update: { rsvp: parsed.data.rsvp },
  });

  return NextResponse.json(attendee);
}
