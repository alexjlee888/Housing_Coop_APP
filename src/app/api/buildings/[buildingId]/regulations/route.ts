import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  category: z.enum(["BYLAW", "REGULATION", "POLICY", "NOTICE", "OTHER"]).optional(),
  isPublished: z.boolean().optional(),
});

type Params = { params: Promise<{ buildingId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId } = await params;
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

  const regulations = await db.regulation.findMany({
    where: {
      buildingId,
      // Residents only see published regulations
      ...(isBoardOrAdmin ? {} : { isPublished: true }),
    },
    include: {
      author: { select: { name: true, username: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(regulations);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { buildingId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "BOARD_MEMBER");

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const regulation = await db.regulation.create({
    data: {
      buildingId,
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body || null,
      category: parsed.data.category ?? "OTHER",
      isPublished: parsed.data.isPublished ?? false,
    },
  });

  return NextResponse.json(regulation, { status: 201 });
}
