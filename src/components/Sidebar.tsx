"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBuilding, useIsBoardOrAdmin } from "@/components/BuildingProvider";
import { cn } from "@/lib/utils";
import {
  Building2,
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  BookOpen,
  Ticket,
  AlertTriangle,
  CalendarDays,
  FileText,
  Settings,
  Users,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discussions", label: "Discussions", icon: MessageSquare },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/directory", label: "Directory", icon: BookOpen },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/regulations", label: "Regulations", icon: FileText },
];

const adminItems = [
  { href: "/settings/members", label: "Members", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { building } = useBuilding();
  const isBoardOrAdmin = useIsBoardOrAdmin();

  return (
    <aside className="flex flex-col w-64 border-r border-border bg-sidebar shrink-0 h-screen sticky top-0">
      {/* Building name */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{building.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {building.address ?? "Coop Building"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {isBoardOrAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-border px-4 py-3 flex items-center gap-3">
        <UserButton />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">My Account</p>
        </div>
      </div>
    </aside>
  );
}
