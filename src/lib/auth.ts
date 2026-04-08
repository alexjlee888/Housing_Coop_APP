import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { MemberRole } from "@/generated/prisma/client";

export type { MemberRole };

/**
 * Returns the current user's BuildingMembership for a given building.
 * Throws if not authenticated or not a member.
 */
export async function assertMembership(buildingId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const membership = await db.buildingMembership.findUnique({
    where: { userId_buildingId: { userId, buildingId } },
    include: { building: true, unit: true },
  });

  if (!membership) throw new Error("Not a member of this building");
  return membership;
}

const ROLE_ORDER: MemberRole[] = ["RESIDENT", "BOARD_MEMBER", "ADMIN"];

/**
 * Throws if the membership role is below the required minimum.
 */
export function assertRole(
  membership: { role: MemberRole },
  minimum: MemberRole
) {
  if (ROLE_ORDER.indexOf(membership.role) < ROLE_ORDER.indexOf(minimum)) {
    throw new Error("Forbidden: insufficient role");
  }
}

/**
 * Returns the current user's membership across all buildings (for onboarding checks).
 */
export async function getCurrentMembership() {
  const { userId } = await auth();
  if (!userId) return null;

  return db.buildingMembership.findFirst({
    where: { userId },
    include: { building: true, unit: true },
  });
}
