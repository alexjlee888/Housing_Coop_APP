import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditEventForm } from "@/components/calendar/EditEventForm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
    include: { reminders: { orderBy: { createdAt: "asc" } } },
  });

  if (!event || event.buildingId !== membership.buildingId) notFound();

  const canEdit =
    event.createdById === userId ||
    membership.role === "BOARD_MEMBER" ||
    membership.role === "ADMIN";

  if (!canEdit) redirect(`/calendar/${eventId}`);

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link
        href={`/calendar/${eventId}`}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to event
      </Link>
      <EditEventForm
        event={event}
        buildingId={membership.buildingId}
        existingReminders={event.reminders}
      />
    </div>
  );
}
