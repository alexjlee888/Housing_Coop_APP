import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  location: z.string().optional(),
  issueId: z.string().optional(),
});

type Params = { params: Promise<{ buildingId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(_req.url);
  const status = searchParams.get("status");

  const tickets = await db.ticket.findMany({
    where: {
      buildingId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      createdBy: { select: { name: true, username: true } },
      _count: { select: { unitImpacts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { buildingId } = await params;
  let user;
  try {
    user = await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ticket = await db.ticket.create({
    data: {
      buildingId,
      createdById: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority ?? "MEDIUM",
      location: parsed.data.location || null,
      issueId: parsed.data.issueId || null,
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
