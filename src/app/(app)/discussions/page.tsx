import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { MessageSquare, Pin, Plus } from "lucide-react";

export default async function DiscussionsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const discussions = await db.discussion.findMany({
    where: { buildingId: membership.buildingId },
    include: {
      author: { select: { id: true, name: true, username: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discussions</h1>
          <p className="text-muted-foreground mt-1">
            Building-wide conversations and announcements
          </p>
        </div>
        <Link
          href="/discussions/new"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <Plus className="w-4 h-4 mr-1" />
          New Thread
        </Link>
      </div>

      {discussions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No discussions yet.</p>
          <Link
            href="/discussions/new"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            Start the first thread
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {discussions.map((d) => (
            <Link
              key={d.id}
              href={`/discussions/${d.id}`}
              className="flex items-start gap-4 px-4 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {d.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium text-sm">{d.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.author.name ?? d.author.username} · {timeAgo(d.createdAt)}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                {d._count.replies}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
