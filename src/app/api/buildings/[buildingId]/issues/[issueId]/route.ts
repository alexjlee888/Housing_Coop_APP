import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
});

type Params = { params: Promise<{ buildingId: string; issueId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId, issueId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: {
      reportedBy: { select: { name: true, username: true } },
      tickets: {
        include: {
          createdBy: { select: { name: true, username: true } },
          _count: { select: { unitImpacts: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!issue || issue.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(issue);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { buildingId, issueId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (issue.reportedById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const resolvedAt =
    parsed.data.status === "RESOLVED" && issue.status !== "RESOLVED"
      ? new Date()
      : parsed.data.status && parsed.data.status !== "RESOLVED"
      ? null
      : undefined;

  const updated = await db.issue.update({
    where: { id: issueId },
    data: {
      ...parsed.data,
      ...(resolvedAt !== undefined ? { resolvedAt } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, issueId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (issue.reportedById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  await db.issue.delete({ where: { id: issueId } });
  return NextResponse.json({ deleted: true });
}
