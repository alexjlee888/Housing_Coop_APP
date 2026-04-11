"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function RsvpButton({
  eventId,
  buildingId,
  currentRsvp,
}: {
  eventId: string;
  buildingId: string;
  currentRsvp: boolean | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rsvp, setRsvp] = useState<boolean | null>(currentRsvp);

  async function handleRsvp(value: boolean) {
    setLoading(true);
    await fetch(`/api/buildings/${buildingId}/events/${eventId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvp: value }),
    });
    setRsvp(value);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">RSVP:</span>
      <Button
        variant={rsvp === true ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp(true)}
        disabled={loading}
        className="gap-1.5"
      >
        <Check className="w-3.5 h-3.5" /> Going
      </Button>
      <Button
        variant={rsvp === false ? "destructive" : "outline"}
        size="sm"
        onClick={() => handleRsvp(false)}
        disabled={loading}
        className="gap-1.5"
      >
        <X className="w-3.5 h-3.5" /> Can't go
      </Button>
    </div>
  );
}
