import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditTicketForm } from "@/components/tickets/EditTicketForm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function EditTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.buildingId !== membership.buildingId) notFound();

  const canEdit =
    ticket.createdById === userId ||
    membership.role === "BOARD_MEMBER" ||
    membership.role === "ADMIN";

  if (!canEdit) redirect(`/tickets/${ticketId}`);

  const issues = await db.issue.findMany({
    where: { buildingId: membership.buildingId },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link
        href={`/tickets/${ticketId}`}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to ticket
      </Link>
      <EditTicketForm
        ticket={ticket}
        buildingId={membership.buildingId}
        issues={issues}
      />
    </div>
  );
}
