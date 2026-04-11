import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["RESIDENT", "BOARD_MEMBER", "ADMIN"]),
});

type Params = { params: Promise<{ buildingId: string; userId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { buildingId, userId: targetUserId } = await params;
  let caller;
  try {
    caller = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "ADMIN");

  // Cannot demote yourself
  if (caller.id === targetUserId) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  const target = await db.buildingMembership.findFirst({
    where: { userId: targetUserId, buildingId },
  });
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.buildingMembership.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, userId: targetUserId } = await params;
  let caller;
  try {
    caller = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "ADMIN");

  // Cannot remove yourself
  if (caller.id === targetUserId) {
    return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
  }

  const target = await db.buildingMembership.findFirst({
    where: { userId: targetUserId, buildingId },
  });
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  await db.buildingMembership.delete({ where: { id: target.id } });
  return NextResponse.json({ deleted: true });
}
