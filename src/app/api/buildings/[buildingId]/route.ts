import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  regenerateJoinCode: z.boolean().optional(),
});

type Params = { params: Promise<{ buildingId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { buildingId } = await params;
  try {
    await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "ADMIN");

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { regenerateJoinCode, ...rest } = parsed.data;

  const updated = await db.building.update({
    where: { id: buildingId },
    data: {
      ...rest,
      ...(regenerateJoinCode ? { joinCode: crypto.randomUUID() } : {}),
    },
  });

  return NextResponse.json(updated);
}
