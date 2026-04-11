"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IssueStatus } from "@/generated/prisma/client";

const STATUSES: IssueStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];
const STATUS_LABEL: Record<IssueStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

export function IssueStatusUpdater({
  issueId,
  buildingId,
  currentStatus,
}: {
  issueId: string;
  buildingId: string;
  currentStatus: IssueStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as IssueStatus;
    setLoading(true);
    await fetch(`/api/buildings/${buildingId}/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
      value={currentStatus}
      onChange={handleChange}
      disabled={loading}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}
