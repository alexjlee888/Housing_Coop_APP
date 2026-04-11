import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
});

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
    include: {
      createdBy: { select: { name: true, username: true } },
      attendees: {
        include: { user: { select: { name: true, username: true, avatarUrl: true } } },
      },
      reminders: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!event || event.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { buildingId, eventId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event || event.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.createdById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.calendarEvent.update({
    where: { id: eventId },
    data: {
      ...parsed.data,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, eventId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event || event.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.createdById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  await db.calendarEvent.delete({ where: { id: eventId } });
  return NextResponse.json({ deleted: true });
}
