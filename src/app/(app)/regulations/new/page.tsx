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
import { ArrowLeft } from "lucide-react";

const CATEGORIES = ["BYLAW", "REGULATION", "POLICY", "NOTICE", "OTHER"] as const;

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().optional(),
  category: z.enum(CATEGORIES),
  isPublished: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function NewRegulationPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "OTHER", isPublished: false },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const memberRes = await fetch("/api/me/membership");
    if (!memberRes.ok) { setError("Could not load building info."); return; }
    const { buildingId } = await memberRes.json();

    const res = await fetch(`/api/buildings/${buildingId}/regulations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }

    const regulation = await res.json();
    router.push(`/regulations/${regulation.id}`);
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link href="/regulations" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
        <ArrowLeft className="w-4 h-4" /> Regulations
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Building Rules & Regulations 2024" {...register("title")} />
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
              <p className="text-xs text-muted-foreground">Supports markdown. You can also attach PDF files after creating.</p>
              <Textarea
                rows={10}
                placeholder="# Title&#10;&#10;Write the document content here..."
                {...register("body")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPublished" {...register("isPublished")} className="rounded" />
              <label htmlFor="isPublished" className="text-sm font-medium">
                Publish immediately (visible to all residents)
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/regulations" className={cn(buttonVariants({ variant: "outline" }))}>
                Cancel
              </Link>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Creating..." : "Create Document"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
