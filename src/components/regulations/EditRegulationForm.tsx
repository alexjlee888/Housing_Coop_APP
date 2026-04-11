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
import type { Regulation } from "@/generated/prisma/client";

const CATEGORIES = ["BYLAW", "REGULATION", "POLICY", "NOTICE", "OTHER"] as const;

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().optional(),
  category: z.enum(CATEGORIES),
  isPublished: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function EditRegulationForm({
  regulation,
  buildingId,
}: {
  regulation: Regulation;
  buildingId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: regulation.title,
      body: regulation.body ?? "",
      category: regulation.category,
      isPublished: regulation.isPublished,
    },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch(
      `/api/buildings/${buildingId}/regulations/${regulation.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.push(`/regulations/${regulation.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Document</CardTitle>
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
            <label className="text-sm font-medium">Category</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              {...register("category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Body</label>
            <p className="text-xs text-muted-foreground">Saving will increment the version number.</p>
            <Textarea rows={12} {...register("body")} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublished" {...register("isPublished")} className="rounded" />
            <label htmlFor="isPublished" className="text-sm font-medium">
              Published (visible to all residents)
            </label>
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
