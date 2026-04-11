import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditIssueForm } from "@/components/issues/EditIssueForm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function EditIssuePage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue || issue.buildingId !== membership.buildingId) notFound();

  const canEdit =
    issue.reportedById === userId ||
    membership.role === "BOARD_MEMBER" ||
    membership.role === "ADMIN";

  if (!canEdit) redirect(`/issues/${issueId}`);

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link
        href={`/issues/${issueId}`}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to issue
      </Link>
      <EditIssueForm issue={issue} buildingId={membership.buildingId} />
    </div>
  );
}
