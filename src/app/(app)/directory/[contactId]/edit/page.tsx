import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditContactForm } from "@/components/directory/EditContactForm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const contact = await db.directoryContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.buildingId !== membership.buildingId) notFound();

  // Only BOARD_MEMBER+ can edit directory contacts
  if (membership.role === "RESIDENT") {
    redirect(`/directory/${contactId}`);
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link
        href={`/directory/${contactId}`}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to contact
      </Link>
      <EditContactForm contact={contact} buildingId={membership.buildingId} />
    </div>
  );
}
