"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  allDay: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;
type Reminder = { amount: string; unit: "MINUTES" | "HOURS" | "DAYS" };

export default function NewEventPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const { register, handleSubmit, formState, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { allDay: false },
  });

  const allDay = watch("allDay");

  function addReminder() {
    setReminders((r) => [...r, { amount: "1", unit: "HOURS" }]);
  }

  function removeReminder(i: number) {
    setReminders((r) => r.filter((_, idx) => idx !== i));
  }

  function updateReminder(i: number, field: keyof Reminder, value: string) {
    setReminders((r) => r.map((rem, idx) => idx === i ? { ...rem, [field]: value } : rem));
  }

  async function onSubmit(data: FormData) {
    setError(null);
    const memberRes = await fetch("/api/me/membership");
    if (!memberRes.ok) { setError("Could not load building info."); return; }
    const { buildingId } = await memberRes.json();

    // Convert local datetime to ISO
    const toISO = (local: string) => new Date(local).toISOString();

    const res = await fetch(`/api/buildings/${buildingId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        startAt: toISO(data.startAt),
        endAt: toISO(data.endAt),
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }

    const event = await res.json();

    // Create reminders
    for (const rem of reminders) {
      const amount = parseInt(rem.amount, 10);
      if (!isNaN(amount) && amount > 0) {
        await fetch(`/api/buildings/${buildingId}/events/${event.id}/reminders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, unit: rem.unit }),
        });
      }
    }

    router.push(`/calendar/${event.id}`);
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link href="/calendar" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
        <ArrowLeft className="w-4 h-4" /> Calendar
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Annual Board Meeting" {...register("title")} />
              {formState.errors.title && (
                <p className="text-xs text-destructive">{formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea rows={3} placeholder="Optional details..." {...register("description")} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Location</label>
              <Input placeholder="e.g. Community Room, Rooftop" {...register("location")} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="allDay" {...register("allDay")} className="rounded" />
              <label htmlFor="allDay" className="text-sm font-medium">All-day event</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Start *</label>
                <Input
                  type={allDay ? "date" : "datetime-local"}
                  {...register("startAt")}
                />
                {formState.errors.startAt && (
                  <p className="text-xs text-destructive">{formState.errors.startAt.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End *</label>
                <Input
                  type={allDay ? "date" : "datetime-local"}
                  {...register("endAt")}
                />
                {formState.errors.endAt && (
                  <p className="text-xs text-destructive">{formState.errors.endAt.message}</p>
                )}
              </div>
            </div>

            {/* Reminders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Reminders</label>
                <Button type="button" variant="outline" size="sm" onClick={addReminder} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              {reminders.map((rem, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={rem.amount}
                    onChange={(e) => updateReminder(i, "amount", e.target.value)}
                  />
                  <select
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    value={rem.unit}
                    onChange={(e) => updateReminder(i, "unit", e.target.value)}
                  >
                    <option value="MINUTES">Minutes before</option>
                    <option value="HOURS">Hours before</option>
                    <option value="DAYS">Days before</option>
                  </select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeReminder(i)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/calendar" className={cn(buttonVariants({ variant: "outline" }))}>
                Cancel
              </Link>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
