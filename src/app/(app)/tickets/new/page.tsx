"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  location: z.string().optional(),
  issueId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewTicketPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ id: string; title: string }[]>([]);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  useEffect(() => {
    fetch("/api/me/membership")
      .then((r) => r.json())
      .then(({ buildingId }) => {
        setBuildingId(buildingId);
        return fetch(`/api/buildings/${buildingId}/issues`);
      })
      .then((r) => r.json())
      .then((data) => setIssues(data));
  }, []);

  async function onSubmit(data: FormData) {
    if (!buildingId) return;
    setError(null);
    const res = await fetch(`/api/buildings/${buildingId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, issueId: data.issueId || undefined }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const ticket = await res.json();
    router.push(`/tickets/${ticket.id}`);
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link href="/tickets" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
        <ArrowLeft className="w-4 h-4" /> Tickets
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Leaking pipe in basement" {...register("title")} />
              {formState.errors.title && (
                <p className="text-xs text-destructive">{formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                rows={4}
                placeholder="Describe the issue in detail..."
                {...register("description")}
              />
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
                <Input placeholder="e.g. Lobby, Roof, Unit 4B" {...register("location")} />
              </div>
            </div>

            {issues.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Link to Issue (optional)</label>
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
              <Link href="/tickets" className={cn(buttonVariants({ variant: "outline" }))}>
                Cancel
              </Link>
              <Button type="submit" disabled={formState.isSubmitting || !buildingId}>
                {formState.isSubmitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
