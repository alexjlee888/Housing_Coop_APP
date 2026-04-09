import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, Phone, Mail, Globe, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DirectoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({ where: { userId } });
  if (!membership) redirect("/onboarding");

  const contacts = await db.directoryContact.findMany({
    where: { buildingId: membership.buildingId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Group by category
  const grouped = contacts.reduce((acc, c) => {
    const key = c.category ?? "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, typeof contacts>);

  const categories = Object.keys(grouped).sort();

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Directory</h1>
          <p className="text-muted-foreground mt-1">Contractors, vendors, and building contacts</p>
        </div>
        <Link href="/directory/new" className={cn(buttonVariants({ variant: "default" }))}>
          <Plus className="w-4 h-4 mr-1" />
          Add Contact
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No contacts yet.</p>
          <Link href="/directory/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
            Add the first contact
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {category}
              </h2>
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {grouped[category].map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/directory/${contact.id}`}
                    className="flex items-start gap-4 px-4 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{contact.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {contact.specialty}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {contact.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.website && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            {contact.website}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
