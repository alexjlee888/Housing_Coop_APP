import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pin, Pencil } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { ReplyForm } from "@/components/discussions/ReplyForm";
import { DeleteButton } from "@/components/DeleteButton";

export default async function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ discussionId: string }>;
}) {
  const { discussionId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const discussion = await db.discussion.findUnique({
    where: { id: discussionId },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!discussion || discussion.buildingId !== membership.buildingId) notFound();

  const canEdit =
    discussion.authorId === userId || membership.role === "ADMIN";

  function initials(user: { name: string | null; username: string }) {
    return (user.name ?? user.username)
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/discussions"
          className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}
        >
          <ArrowLeft className="w-4 h-4" /> Discussions
        </Link>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/discussions/${discussionId}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <DeleteButton
              apiEndpoint={`/api/buildings/${membership.buildingId}/discussions/${discussionId}`}
              redirectTo="/discussions"
              confirmMessage="Delete this thread and all its replies?"
            />
          </div>
        )}
      </div>

      {/* Thread */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {discussion.isPinned && (
            <Badge variant="secondary" className="gap-1">
              <Pin className="w-3 h-3" /> Pinned
            </Badge>
          )}
          <h1 className="text-2xl font-bold">{discussion.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={discussion.author.avatarUrl ?? undefined} />
            <AvatarFallback>{initials(discussion.author)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {discussion.author.name ?? discussion.author.username} ·{" "}
            {timeAgo(discussion.createdAt)}
          </span>
        </div>

        <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap border border-border rounded-xl p-4 bg-muted/30">
          {discussion.body}
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {discussion.replies.length}{" "}
          {discussion.replies.length === 1 ? "Reply" : "Replies"}
        </h2>

        {discussion.replies.map((reply) => (
          <div key={reply.id} className="flex gap-3">
            <Avatar size="sm">
              <AvatarImage src={reply.author.avatarUrl ?? undefined} />
              <AvatarFallback>{initials(reply.author)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">
                  {reply.author.name ?? reply.author.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(reply.createdAt)}
                </span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{reply.body}</p>
            </div>
          </div>
        ))}

        <ReplyForm
          buildingId={membership.buildingId}
          discussionId={discussion.id}
        />
      </div>
    </div>
  );
}
