import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Clerk sends user.created / user.updated webhooks.
// Configure CLERK_WEBHOOK_SECRET in .env and register this URL in the Clerk dashboard.
export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { type, data } = payload;

  if (type === "user.created" || type === "user.updated") {
    const primaryEmail =
      data.email_addresses?.find(
        (e: { id: string; email_address: string }) =>
          e.id === data.primary_email_address_id
      )?.email_address ?? "";

    const name =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    const username = data.username ?? primaryEmail.split("@")[0];

    await db.user.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: primaryEmail,
        username,
        name,
        avatarUrl: data.image_url ?? null,
      },
      update: {
        email: primaryEmail,
        username,
        name,
        avatarUrl: data.image_url ?? null,
      },
    });
  }

  return NextResponse.json({ received: true });
}
