import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  const { buildingId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await db.buildingMembership.findMany({
    where: { buildingId },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      unit: true,
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}
