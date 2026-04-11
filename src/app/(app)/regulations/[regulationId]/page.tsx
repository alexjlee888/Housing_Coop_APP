import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { DocumentUploader } from "@/components/regulations/DocumentUploader";

export default async function RegulationDetailPage({
  params,
}: {
  params: Promise<{ regulationId: string }>;
}) {
  const { regulationId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const isBoardOrAdmin =
    membership.role === "BOARD_MEMBER" || membership.role === "ADMIN";

  const regulation = await db.regulation.findUnique({
    where: { id: regulationId },
    include: {
      author: { select: { name: true, username: true } },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });

  if (
    !regulation ||
    regulation.buildingId !== membership.buildingId ||
    (!isBoardOrAdmin && !regulation.isPublished)
  ) {
    notFound();
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/regulations" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
          <ArrowLeft className="w-4 h-4" /> Regulations
        </Link>
        {isBoardOrAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href={`/regulations/${regulationId}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
            <DeleteButton
              apiEndpoint={`/api/buildings/${membership.buildingId}/regulations/${regulationId}`}
              redirectTo="/regulations"
              confirmMessage="Delete this document and all attachments?"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl">{regulation.title}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{regulation.category}</Badge>
                <Badge variant="outline">v{regulation.version}</Badge>
                {!regulation.isPublished && (
                  <Badge variant="outline">Draft</Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            By {regulation.author.name ?? regulation.author.username} ·{" "}
            Last updated {formatDate(regulation.updatedAt)}
          </p>
        </CardHeader>

        {regulation.body && (
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {regulation.body}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUploader
            regulationId={regulation.id}
            buildingId={membership.buildingId}
            initialDocuments={regulation.documents}
            canEdit={isBoardOrAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
