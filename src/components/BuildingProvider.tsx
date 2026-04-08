"use client";

import { createContext, useContext } from "react";
import type { Building, BuildingMembership, Unit, MemberRole } from "@/generated/prisma/client";

export type MembershipWithBuilding = BuildingMembership & {
  building: Building;
  unit: Unit | null;
};

const BuildingContext = createContext<MembershipWithBuilding | null>(null);

export function BuildingProvider({
  membership,
  children,
}: {
  membership: MembershipWithBuilding;
  children: React.ReactNode;
}) {
  return (
    <BuildingContext.Provider value={membership}>
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuilding(): MembershipWithBuilding {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error("useBuilding must be used inside BuildingProvider");
  return ctx;
}

export function useRole(): MemberRole {
  return useBuilding().role;
}

export function useIsAdmin(): boolean {
  return useBuilding().role === "ADMIN";
}

export function useIsBoardOrAdmin(): boolean {
  const role = useBuilding().role;
  return role === "BOARD_MEMBER" || role === "ADMIN";
}
