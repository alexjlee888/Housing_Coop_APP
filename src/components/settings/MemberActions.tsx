"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { MemberRole } from "@/generated/prisma/client";

const ROLES: MemberRole[] = ["RESIDENT", "BOARD_MEMBER", "ADMIN"];
const ROLE_LABEL: Record<MemberRole, string> = {
  RESIDENT: "Resident",
  BOARD_MEMBER: "Board Member",
  ADMIN: "Admin",
};

export function MemberActions({
  buildingId,
  targetUserId,
  currentRole,
}: {
  buildingId: string;
  targetUserId: string;
  currentRole: MemberRole;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value as MemberRole;
    setLoading(true);
    await fetch(`/api/buildings/${buildingId}/members/${targetUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setLoading(false);
    router.refresh();
  }

  async function handleRemove() {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setLoading(true);
    await fetch(`/api/buildings/${buildingId}/members/${targetUserId}`, {
      method: "DELETE",
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
        value={currentRole}
        onChange={handleRoleChange}
        disabled={loading}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
      <Button
        variant={confirmRemove ? "destructive" : "ghost"}
        size="sm"
        onClick={handleRemove}
        disabled={loading}
        className="h-7 px-2"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
      {confirmRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmRemove(false)}
          className="h-7 px-2 text-xs"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
