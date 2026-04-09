import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
});

type Params = { params: Promise<{ buildingId: string; discussionId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { buildingId, discussionId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discussion = await db.discussion.findUnique({
    where: { id: discussionId },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!discussion || discussion.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(discussion);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { buildingId, discussionId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const discussion = await db.discussion.findUnique({ where: { id: discussionId } });

  if (!discussion || discussion.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (discussion.authorId !== user.id) {
    assertRole(membership, "ADMIN");
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.discussion.update({
    where: { id: discussionId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, discussionId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const discussion = await db.discussion.findUnique({ where: { id: discussionId } });

  if (!discussion || discussion.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only author or admin can delete
  if (discussion.authorId !== user.id) {
    assertRole(membership, "ADMIN");
  }

  await db.discussion.delete({ where: { id: discussionId } });
  return NextResponse.json({ deleted: true });
}
