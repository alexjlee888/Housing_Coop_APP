import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";

// GET /api/me/membership — returns the current user's building membership
export async function GET() {
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.buildingMembership.findFirst({
    where: { userId: user.id },
    include: { building: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "No membership found" }, { status: 404 });
  }

  return NextResponse.json({
    buildingId: membership.buildingId,
    role: membership.role,
    building: membership.building,
  });
}
