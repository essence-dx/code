"use client";

import type { RefObject } from "react";
import { LocalProjectLibraryCard } from "@/features/dashboard/components/local-project-library-card";
import { SignedInProjectLibraryCard } from "@/features/dashboard/components/signed-in-project-library-card";
import type { DashboardCloudLibrary } from "@/features/dashboard/hooks/use-dashboard-cloud-library";
import type { DashboardLocalLibrary } from "@/features/dashboard/hooks/use-dashboard-local-library";

type DashboardLibrarySectionProps = {
  bundleInputRef: RefObject<HTMLInputElement | null>;
  cloudLibrary: DashboardCloudLibrary;
  localLibrary: DashboardLocalLibrary;
};

export function DashboardLibrarySection({ bundleInputRef, cloudLibrary, localLibrary }: DashboardLibrarySectionProps) {
  return (
    <section className="grid gap-6" aria-label="Project libraries">
      <LocalProjectLibraryCard library={localLibrary} bundleInputRef={bundleInputRef} />
      <SignedInProjectLibraryCard library={cloudLibrary} />
    </section>
  );
}
