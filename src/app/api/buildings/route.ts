import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { z } from "zod";

const createBuildingSchema = z.object({
  name: z.string().min(1, "Building name is required").max(100),
  address: z.string().optional(),
  description: z.string().optional(),
});

// POST /api/buildings — create a new building and make the caller ADMIN
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user isn't already in a building
  const existing = await db.buildingMembership.findFirst({
    where: { userId: user.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You are already a member of a building." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = createBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const building = await db.building.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      description: parsed.data.description,
      memberships: {
        create: {
          userId: user.id,
          role: "ADMIN",
        },
      },
    },
  });

  return NextResponse.json(building, { status: 201 });
}
