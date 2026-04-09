import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";
import { z } from "zod";

const replySchema = z.object({ body: z.string().min(1) });

type Params = { params: Promise<{ buildingId: string; discussionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { buildingId, discussionId } = await params;
  let user;
  try {
    user = await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discussion = await db.discussion.findUnique({ where: { id: discussionId } });
  if (!discussion || discussion.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reply = await db.discussionReply.create({
    data: { discussionId, authorId: user.id, body: parsed.data.body },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(reply, { status: 201 });
}
