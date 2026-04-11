import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
  category: z.enum(["BYLAW", "REGULATION", "POLICY", "NOTICE", "OTHER"]).optional(),
  isPublished: z.boolean().optional(),
});

type Params = { params: Promise<{ buildingId: string; regulationId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId, regulationId } = await params;
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
  const isBoardOrAdmin =
    membership?.role === "BOARD_MEMBER" || membership?.role === "ADMIN";

  const regulation = await db.regulation.findUnique({
    where: { id: regulationId },
    include: {
      author: { select: { name: true, username: true } },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });

  if (
    !regulation ||
    regulation.buildingId !== buildingId ||
    (!isBoardOrAdmin && !regulation.isPublished)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(regulation);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { buildingId, regulationId } = await params;
  try {
    await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "BOARD_MEMBER");

  const regulation = await db.regulation.findUnique({ where: { id: regulationId } });
  if (!regulation || regulation.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.regulation.update({
    where: { id: regulationId },
    data: {
      ...parsed.data,
      // Increment version on any content change
      version: { increment: 1 },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, regulationId } = await params;
  try {
    await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "BOARD_MEMBER");

  const regulation = await db.regulation.findUnique({ where: { id: regulationId } });
  if (!regulation || regulation.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.regulation.delete({ where: { id: regulationId } });
  return NextResponse.json({ deleted: true });
}
