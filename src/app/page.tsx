import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Building2, CheckSquare, MessageSquare, Ticket, CalendarDays, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: MessageSquare,
    title: "Building Discussions",
    description: "Threaded forums for building-wide conversations and announcements.",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    description: "Create and assign tasks for building maintenance and operations.",
  },
  {
    icon: Ticket,
    title: "Ticketing System",
    description: "Track maintenance requests with per-unit impact reporting.",
  },
  {
    icon: CalendarDays,
    title: "Events & Calendar",
    description: "Schedule events with RSVP, reminders, and Google/Outlook sync.",
  },
  {
    icon: Building2,
    title: "Vendor Directory",
    description: "Keep a shared directory of contractors and building contacts.",
  },
  {
    icon: FileText,
    title: "Regulations & Bylaws",
    description: "Manage and publish building rules, bylaws, and policies.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  // Redirect logged-in users to the right place
  if (userId) {
    const membership = await db.buildingMembership.findFirst({
      where: { userId },
    });
    redirect(membership ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Building2 className="w-5 h-5" />
            CoopHub
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-background">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground text-sm px-3 py-1 rounded-full">
            <Building2 className="w-3.5 h-3.5" />
            Built for housing cooperatives
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            Manage your coop building — all in one place
          </h1>
          <p className="text-xl text-muted-foreground">
            CoopHub brings your entire building community together: discussions,
            tasks, maintenance tickets, events, and regulations — organized and
            accessible for every resident.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              Create your building
            </Link>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/40 border-t border-border py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything your building needs
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-background rounded-xl border border-border p-6 space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CoopHub. All rights reserved.
      </footer>
    </div>
  );
}
