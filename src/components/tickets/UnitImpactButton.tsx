"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";

export function UnitImpactButton({
  ticketId,
  buildingId,
  alreadyReported,
  hasUnit,
}: {
  ticketId: string;
  buildingId: string;
  alreadyReported: boolean;
  hasUnit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(alreadyReported);

  async function handleToggle() {
    if (!hasUnit) return;
    setLoading(true);
    const method = reported ? "DELETE" : "POST";
    await fetch(`/api/buildings/${buildingId}/tickets/${ticketId}/impact`, { method });
    setReported(!reported);
    setLoading(false);
    router.refresh();
  }

  if (!hasUnit) {
    return (
      <p className="text-xs text-muted-foreground">
        Assign yourself to a unit to report impact.
      </p>
    );
  }

  return (
    <Button
      variant={reported ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
    >
      {reported ? (
        <>
          <CheckCircle className="w-4 h-4" /> My unit is affected
        </>
      ) : (
        <>
          <Circle className="w-4 h-4" /> Mark my unit as affected
        </>
      )}
    </Button>
  );
}
