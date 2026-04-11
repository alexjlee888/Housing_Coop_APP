import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";

type Params = { params: Promise<{ buildingId: string; eventId: string; reminderId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, eventId, reminderId } = await params;
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

  await db.eventReminder.deleteMany({ where: { id: reminderId, eventId } });
  return NextResponse.json({ deleted: true });
}
