import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { MemberActions } from "@/components/settings/MemberActions";
import type { MemberRole } from "@/generated/prisma/client";

const roleVariant: Record<MemberRole, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  BOARD_MEMBER: "secondary",
  RESIDENT: "outline",
};

export default async function MembersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const membership = await db.buildingMembership.findFirst({
    where: { userId },
    include: { building: true },
  });

  if (!membership) redirect("/onboarding");

  const isAdmin = membership.role === "ADMIN";

  const members = await db.buildingMembership.findMany({
    where: { buildingId: membership.buildingId },
    include: {
      user: true,
      unit: true,
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground mt-1">
          {members.length} {members.length === 1 ? "member" : "members"} in{" "}
          {membership.building.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            All Members
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((m) => {
            const initials = (m.user.name ?? m.user.username)
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const isMe = m.userId === userId;

            return (
              <div key={m.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <Avatar size="default">
                  <AvatarImage src={m.user.avatarUrl ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.user.name ?? m.user.username}
                    {isMe && (
                      <span className="text-muted-foreground font-normal ml-1">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.user.email}
                    {m.unit && <span className="ml-2">· Unit {m.unit.number}</span>}
                    <span className="ml-2">· Joined {formatDate(m.joinedAt)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isAdmin && !isMe ? (
                    <MemberActions
                      buildingId={membership.buildingId}
                      targetUserId={m.userId}
                      currentRole={m.role}
                    />
                  ) : (
                    <Badge variant={roleVariant[m.role]} className="text-xs">
                      {m.role.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
