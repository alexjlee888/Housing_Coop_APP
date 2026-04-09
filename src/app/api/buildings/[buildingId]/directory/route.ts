import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  specialty: z.string().min(1).max(100),
  category: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  notes: z.string().optional(),
});

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

  const contacts = await db.directoryContact.findMany({
    where: { buildingId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(contacts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
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

  const contact = await db.directoryContact.create({
    data: {
      buildingId,
      addedById: user.id,
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      category: parsed.data.category,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      website: parsed.data.website,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
