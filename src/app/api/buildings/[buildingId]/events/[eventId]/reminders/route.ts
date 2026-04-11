import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  amount: z.number().int().positive(),
  unit: z.enum(["MINUTES", "HOURS", "DAYS"]),
});

type Params = { params: Promise<{ buildingId: string; eventId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
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

  // Only creator or BOARD_MEMBER+ can add reminders
  if (event.createdById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reminder = await db.eventReminder.create({
    data: { eventId, amount: parsed.data.amount, unit: parsed.data.unit },
  });

  return NextResponse.json(reminder, { status: 201 });
}
