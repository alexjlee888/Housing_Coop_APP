"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1, "Building name is required"),
  address: z.string().optional(),
  description: z.string().optional(),
});

const joinSchema = z.object({
  joinCode: z.string().min(1, "Join code is required"),
});

type CreateForm = z.infer<typeof createSchema>;
type JoinForm = z.infer<typeof joinSchema>;

export default function OnboardingPage() {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const joinForm = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
  });

  async function handleCreate(data: CreateForm) {
    setError(null);
    const res = await fetch("/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.push("/dashboard");
  }

  async function handleJoin(data: JoinForm) {
    setError(null);
    const res = await fetch("/api/buildings/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to CoopHub</h1>
          <p className="text-muted-foreground mt-2">
            Get started by creating a new building or joining an existing one.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-3">
            {error}
          </div>
        )}

        {mode === "choose" && (
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={cn(
                "cursor-pointer border-2 transition-colors hover:border-primary",
                "border-border"
              )}
              onClick={() => setMode("create")}
            >
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-base">Create Building</CardTitle>
                <CardDescription className="text-xs">
                  Set up a new coop building and invite residents
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={cn(
                "cursor-pointer border-2 transition-colors hover:border-primary",
                "border-border"
              )}
              onClick={() => setMode("join")}
            >
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-base">Join Building</CardTitle>
                <CardDescription className="text-xs">
                  Enter a join code to join your building
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {mode === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Building</CardTitle>
              <CardDescription>
                You&apos;ll be set as the Admin. Share the join code with residents after.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={createForm.handleSubmit(handleCreate)}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-sm font-medium">Building Name *</label>
                  <Input
                    placeholder="e.g. 123 Main Street Cooperative"
                    {...createForm.register("name")}
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    placeholder="123 Main St, New York, NY 10001"
                    {...createForm.register("address")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="A brief description of your building"
                    {...createForm.register("description")}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setMode("choose")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createForm.formState.isSubmitting}
                  >
                    {createForm.formState.isSubmitting
                      ? "Creating..."
                      : "Create Building"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === "join" && (
          <Card>
            <CardHeader>
              <CardTitle>Join a Building</CardTitle>
              <CardDescription>
                Ask your building admin for the join code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={joinForm.handleSubmit(handleJoin)}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-sm font-medium">Join Code *</label>
                  <Input
                    placeholder="Paste your join code here"
                    {...joinForm.register("joinCode")}
                  />
                  {joinForm.formState.errors.joinCode && (
                    <p className="text-xs text-destructive">
                      {joinForm.formState.errors.joinCode.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setMode("choose")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={joinForm.formState.isSubmitting}
                  >
                    {joinForm.formState.isSubmitting ? "Joining..." : "Join Building"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
