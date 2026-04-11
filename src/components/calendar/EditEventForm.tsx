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
import { Plus, Trash2 } from "lucide-react";
import type { CalendarEvent, EventReminder } from "@/generated/prisma/client";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  allDay: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;
type NewReminder = { amount: string; unit: "MINUTES" | "HOURS" | "DAYS" };

function toLocalDatetime(date: Date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toLocalDate(date: Date) {
  return new Date(date).toISOString().split("T")[0];
}

export function EditEventForm({
  event,
  buildingId,
  existingReminders,
}: {
  event: CalendarEvent;
  buildingId: string;
  existingReminders: EventReminder[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [newReminders, setNewReminders] = useState<NewReminder[]>([]);
  const [deletedReminderIds, setDeletedReminderIds] = useState<string[]>([]);

  const { register, handleSubmit, formState, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      startAt: event.allDay ? toLocalDate(event.startAt) : toLocalDatetime(event.startAt),
      endAt: event.allDay ? toLocalDate(event.endAt) : toLocalDatetime(event.endAt),
      allDay: event.allDay,
    },
  });

  const allDay = watch("allDay");

  function addReminder() {
    setNewReminders((r) => [...r, { amount: "1", unit: "HOURS" }]);
  }

  function updateReminder(i: number, field: keyof NewReminder, value: string) {
    setNewReminders((r) => r.map((rem, idx) => idx === i ? { ...rem, [field]: value } : rem));
  }

  function removeNewReminder(i: number) {
    setNewReminders((r) => r.filter((_, idx) => idx !== i));
  }

  function toggleDeleteReminder(id: string) {
    setDeletedReminderIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
  }

  async function onSubmit(data: FormData) {
    setError(null);
    const toISO = (local: string) => new Date(local).toISOString();

    const res = await fetch(`/api/buildings/${buildingId}/events/${event.id}`, {
      method: "PATCH",
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

    // Delete removed reminders
    for (const remId of deletedReminderIds) {
      await fetch(`/api/buildings/${buildingId}/events/${event.id}/reminders/${remId}`, {
        method: "DELETE",
      });
    }

    // Add new reminders
    for (const rem of newReminders) {
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
    router.refresh();
  }

  const activeReminders = existingReminders.filter((r) => !deletedReminderIds.includes(r.id));

  function reminderLabel(amount: number, unit: string) {
    const u = unit === "MINUTES" ? "min" : unit === "HOURS" ? "hr" : "day";
    return `${amount} ${u}${amount !== 1 ? "s" : ""} before`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Event</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Title *</label>
            <Input {...register("title")} />
            {formState.errors.title && (
              <p className="text-xs text-destructive">{formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea rows={3} {...register("description")} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Location</label>
            <Input {...register("location")} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="allDay" {...register("allDay")} className="rounded" />
            <label htmlFor="allDay" className="text-sm font-medium">All-day event</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start *</label>
              <Input type={allDay ? "date" : "datetime-local"} {...register("startAt")} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End *</label>
              <Input type={allDay ? "date" : "datetime-local"} {...register("endAt")} />
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

            {activeReminders.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-muted-foreground">{reminderLabel(r.amount, r.unit)}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleDeleteReminder(r.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}

            {newReminders.map((rem, i) => (
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
                <Button type="button" variant="ghost" size="sm" onClick={() => removeNewReminder(i)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
