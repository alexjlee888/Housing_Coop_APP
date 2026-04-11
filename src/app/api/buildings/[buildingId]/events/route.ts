import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().optional(),
});

type Params = { params: Promise<{ buildingId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await db.calendarEvent.findMany({
    where: { buildingId },
    include: {
      createdBy: { select: { name: true, username: true } },
      _count: { select: { attendees: true } },
      attendees: { select: { userId: true, rsvp: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { buildingId } = await params;
  let user;
  try {
    user = await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await db.calendarEvent.create({
    data: {
      buildingId,
      createdById: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      allDay: parsed.data.allDay ?? false,
      // Auto-invite all building members
      attendees: {
        create: await db.buildingMembership
          .findMany({ where: { buildingId }, select: { userId: true } })
          .then((members) => members.map((m) => ({ userId: m.userId }))),
      },
    },
  });

  return NextResponse.json(event, { status: 201 });
}
