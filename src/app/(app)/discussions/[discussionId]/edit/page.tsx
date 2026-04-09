import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditDiscussionForm } from "@/components/discussions/EditDiscussionForm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function EditDiscussionPage({
  params,
}: {
  params: Promise<{ discussionId: string }>;
}) {
  const { discussionId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const discussion = await db.discussion.findUnique({ where: { id: discussionId } });
  if (!discussion || discussion.buildingId !== membership.buildingId) notFound();

  // Only the author or an admin can edit
  if (discussion.authorId !== userId && membership.role !== "ADMIN") {
    redirect(`/discussions/${discussionId}`);
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link
        href={`/discussions/${discussionId}`}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to thread
      </Link>
      <EditDiscussionForm
        discussion={discussion}
        buildingId={membership.buildingId}
      />
    </div>
  );
}
