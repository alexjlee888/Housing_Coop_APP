import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

const joinSchema = z.object({
  joinCode: z.string().min(1, "Join code is required"),
});

// POST /api/buildings/join — join a building by its join code
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { error: "User not found. Please wait a moment and try again." },
      { status: 404 }
    );
  }

  // Check user isn't already in a building
  const existing = await db.buildingMembership.findFirst({ where: { userId } });
  if (existing) {
    return NextResponse.json(
      { error: "You are already a member of a building." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const building = await db.building.findUnique({
    where: { joinCode: parsed.data.joinCode },
  });

  if (!building) {
    return NextResponse.json(
      { error: "Invalid join code. Please check and try again." },
      { status: 404 }
    );
  }

  const membership = await db.buildingMembership.create({
    data: {
      userId,
      buildingId: building.id,
      role: "RESIDENT",
    },
  });

  return NextResponse.json({ membership, building }, { status: 201 });
}
