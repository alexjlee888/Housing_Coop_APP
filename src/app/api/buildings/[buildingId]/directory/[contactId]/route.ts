import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  specialty: z.string().min(1).max(100).optional(),
  category: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  notes: z.string().optional(),
});

type Params = { params: Promise<{ buildingId: string; contactId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { buildingId, contactId } = await params;
  try {
    await ensureUser();
    await assertMembership(buildingId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contact = await db.directoryContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.directoryContact.update({
    where: { id: contactId },
    data: { ...parsed.data, email: parsed.data.email || null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, contactId } = await params;
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  const contact = await db.directoryContact.findUnique({ where: { id: contactId } });

  if (!contact || contact.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (contact.addedById !== user.id) {
    assertRole(membership, "BOARD_MEMBER");
  }

  await db.directoryContact.delete({ where: { id: contactId } });
  return NextResponse.json({ deleted: true });
}
