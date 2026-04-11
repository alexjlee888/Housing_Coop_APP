"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RegenerateJoinCode({
  buildingId,
  currentCode,
}: {
  buildingId: string;
  currentCode: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(currentCode);
  const [confirming, setConfirming] = useState(false);

  async function handleRegenerate() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    setConfirming(false);
    const res = await fetch(`/api/buildings/${buildingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateJoinCode: true }),
    });
    if (res.ok) {
      const building = await res.json();
      setCode(building.joinCode);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono tracking-wider">
          {code}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copy
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant={confirming ? "destructive" : "outline"}
          size="sm"
          onClick={handleRegenerate}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {confirming ? "Click again to confirm" : "Regenerate Code"}
        </Button>
        {confirming && (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        )}
      </div>
      {confirming && (
        <p className="text-xs text-destructive">
          Warning: The old code will stop working immediately.
        </p>
      )}
    </div>
  );
}
