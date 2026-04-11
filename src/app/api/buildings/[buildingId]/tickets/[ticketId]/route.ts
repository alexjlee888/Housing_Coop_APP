import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  location: z.string().optional(),
  issueId: z.string().nullable().optional(),
});

type Params = { params: Promise<{ buildingId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId, ticketId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: { select: { name: true, username: true } },
      issue: { select: { id: true, title: true } },
      unitImpacts: {
        include: {
          unit: { select: { number: true, floor: true } },
          user: { select: { name: true, username: true } },
        },
        orderBy: { reportedAt: "asc" },
      },
    },
  });

  if (!ticket || ticket.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: Params) {
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

  const membership = await assertMembership(buildingId);
  if (ticket.createdById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const resolvedAt =
    parsed.data.status === "RESOLVED" && ticket.status !== "RESOLVED"
      ? new Date()
      : parsed.data.status && parsed.data.status !== "RESOLVED"
      ? null
      : undefined;

  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: {
      ...parsed.data,
      ...(resolvedAt !== undefined ? { resolvedAt } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, ticketId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket || ticket.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (ticket.createdById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  await db.ticket.delete({ where: { id: ticketId } });
  return NextResponse.json({ deleted: true });
}
