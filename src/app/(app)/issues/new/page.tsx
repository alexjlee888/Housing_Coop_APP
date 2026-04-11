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

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
});

type FormData = z.infer<typeof schema>;

export default function NewIssuePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const memberRes = await fetch("/api/me/membership");
    if (!memberRes.ok) { setError("Could not load building info."); return; }
    const { buildingId } = await memberRes.json();

    const res = await fetch(`/api/buildings/${buildingId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }

    const issue = await res.json();
    router.push(`/issues/${issue.id}`);
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link href="/issues" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
        <ArrowLeft className="w-4 h-4" /> Issues
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Report Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Recurring elevator failures" {...register("title")} />
              {formState.errors.title && (
                <p className="text-xs text-destructive">{formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                rows={5}
                placeholder="Describe the issue and its impact on the building..."
                {...register("description")}
              />
              {formState.errors.description && (
                <p className="text-xs text-destructive">{formState.errors.description.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/issues" className={cn(buttonVariants({ variant: "outline" }))}>
                Cancel
              </Link>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Submitting..." : "Report Issue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
