import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, FileText, Paperclip } from "lucide-react";
import type { DocumentCategory } from "@/generated/prisma/client";

const CATEGORY_VARIANT: Record<DocumentCategory, "default" | "secondary" | "outline"> = {
  BYLAW: "default",
  REGULATION: "secondary",
  POLICY: "secondary",
  NOTICE: "outline",
  OTHER: "outline",
};

export default async function RegulationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const isBoardOrAdmin =
    membership.role === "BOARD_MEMBER" || membership.role === "ADMIN";

  const regulations = await db.regulation.findMany({
    where: {
      buildingId: membership.buildingId,
      ...(isBoardOrAdmin ? {} : { isPublished: true }),
    },
    include: {
      author: { select: { name: true, username: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regulations & Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bylaws, policies, and official building documents
          </p>
        </div>
        {isBoardOrAdmin && (
          <Link href="/regulations/new" className={cn(buttonVariants(), "gap-2")}>
            <Plus className="w-4 h-4" /> New Document
          </Link>
        )}
      </div>

      {regulations.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents published yet.</p>
      ) : (
        <div className="space-y-2">
          {regulations.map((reg) => (
            <Link
              key={reg.id}
              href={`/regulations/${reg.id}`}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{reg.title}</p>
                  {!reg.isPublished && (
                    <Badge variant="outline" className="text-xs shrink-0">Draft</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{reg.author.name ?? reg.author.username}</span>
                  <span>v{reg.version}</span>
                  <span>Updated {timeAgo(reg.updatedAt)}</span>
                  {reg._count.documents > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {reg._count.documents}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant={CATEGORY_VARIANT[reg.category]} className="shrink-0 text-xs">
                {reg.category}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
