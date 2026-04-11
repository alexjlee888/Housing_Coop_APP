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
import type { Ticket } from "@/generated/prisma/client";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  location: z.string().optional(),
  issueId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function EditTicketForm({
  ticket,
  buildingId,
  issues,
}: {
  ticket: Ticket;
  buildingId: string;
  issues: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      location: ticket.location ?? "",
      issueId: ticket.issueId ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch(`/api/buildings/${buildingId}/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, issueId: data.issueId || null }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.push(`/tickets/${ticket.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Ticket</CardTitle>
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
            <label className="text-sm font-medium">Description *</label>
            <Textarea rows={4} {...register("description")} />
            {formState.errors.description && (
              <p className="text-xs text-destructive">{formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Priority</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                {...register("priority")}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Location</label>
              <Input {...register("location")} />
            </div>
          </div>

          {issues.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Linked Issue</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                {...register("issueId")}
              >
                <option value="">None</option>
                {issues.map((i) => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </select>
            </div>
          )}

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
