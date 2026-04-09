import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Ensures a User row exists in the database for the currently signed-in Clerk user.
 * This handles the case where the Clerk webhook hasn't fired yet (e.g. local dev).
 * Returns the user record.
 */
export async function ensureUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? "";

  const username =
    clerkUser.username ?? primaryEmail.split("@")[0];

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  const user = await db.user.upsert({
    where: { id: clerkUser.id },
    create: {
      id: clerkUser.id,
      email: primaryEmail,
      username,
      name,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
    update: {
      email: primaryEmail,
      username,
      name,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
  });

  return user;
}
