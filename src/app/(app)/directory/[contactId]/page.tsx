import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, Globe, Pencil } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";

export default async function ContactDetailPage({
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

  const canEdit = membership.role !== "RESIDENT";

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/directory" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
          <ArrowLeft className="w-4 h-4" /> Directory
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/directory/${contactId}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <DeleteButton
              apiEndpoint={`/api/buildings/${membership.buildingId}/directory/${contactId}`}
              redirectTo="/directory"
              confirmMessage="Delete this contact?"
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">{contact.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{contact.specialty}</Badge>
                {contact.category && (
                  <Badge variant="secondary">{contact.category}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                {contact.email}
              </a>
            )}
            {contact.website && (
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                {contact.website}
              </a>
            )}
          </div>

          {contact.notes && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Added {formatDate(contact.createdAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
