import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
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

  const issues = await db.issue.findMany({
    where: { buildingId },
    include: {
      reportedBy: { select: { name: true, username: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(issues);
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

  const issue = await db.issue.create({
    data: {
      buildingId,
      reportedById: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
    },
  });

  return NextResponse.json(issue, { status: 201 });
}
