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
  body: z.string().min(1, "Body is required"),
});

type FormData = z.infer<typeof schema>;

export default function NewDiscussionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    // Get buildingId from the app — we fetch it via API
    const memberRes = await fetch("/api/me/membership");
    if (!memberRes.ok) { setError("Could not load building info."); return; }
    const { buildingId } = await memberRes.json();

    const res = await fetch(`/api/buildings/${buildingId}/discussions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }

    const discussion = await res.json();
    router.push(`/discussions/${discussion.id}`);
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link href="/discussions" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 -ml-2")}>
        <ArrowLeft className="w-4 h-4" /> Discussions
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Discussion Thread</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="What would you like to discuss?" {...register("title")} />
              {formState.errors.title && (
                <p className="text-xs text-destructive">{formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Body *</label>
              <Textarea
                placeholder="Share more details..."
                rows={6}
                {...register("body")}
              />
              {formState.errors.body && (
                <p className="text-xs text-destructive">{formState.errors.body.message}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Link href="/discussions" className={cn(buttonVariants({ variant: "outline" }))}>
                Cancel
              </Link>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Posting..." : "Post Thread"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
