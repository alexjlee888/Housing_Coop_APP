import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";

type Params = { params: Promise<{ buildingId: string; ticketId: string }> };

// POST: mark "my unit is affected"
export async function POST(req: NextRequest, { params }: Params) {
  const { buildingId, ticketId } = await params;
  let user;
  try {
    user = await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find the user's unit in this building
  const membership = await db.buildingMembership.findFirst({
    where: { userId: user.id, buildingId },
  });
  if (!membership?.unitId) {
    return NextResponse.json(
      { error: "You must be assigned to a unit to report impact." },
      { status: 400 }
    );
  }

  // Upsert so double-clicks are safe
  const impact = await db.ticketUnitImpact.upsert({
    where: { ticketId_unitId: { ticketId, unitId: membership.unitId } },
    create: { ticketId, unitId: membership.unitId, userId: user.id },
    update: {},
  });

  return NextResponse.json(impact, { status: 201 });
}

// DELETE: remove my unit impact
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, ticketId } = await params;
  let user;
  try {
    user = await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.buildingMembership.findFirst({
    where: { userId: user.id, buildingId },
  });
  if (!membership?.unitId) {
    return NextResponse.json({ error: "No unit assigned." }, { status: 400 });
  }

  await db.ticketUnitImpact.deleteMany({
    where: { ticketId, unitId: membership.unitId, userId: user.id },
  });

  return NextResponse.json({ deleted: true });
}
