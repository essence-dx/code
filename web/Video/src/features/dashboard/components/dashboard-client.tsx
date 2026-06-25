"use client";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { DashboardLibrarySection } from "@/features/dashboard/components/dashboard-library-section";
import { DashboardOverviewSection } from "@/features/dashboard/components/dashboard-overview-section";
import { useDashboardClientController } from "@/features/dashboard/hooks/use-dashboard-client-controller";

export function DashboardClient() {
  const { bundleInputRef, cloudLibrary, localLibrary, project } = useDashboardClientController();
  const { createPresetProject, isLibraryActionPending } = localLibrary;
  const { canUseOnlineLibrary, isCloudActionPending, syncCurrentProject } = cloudLibrary;

  return (
    <DashboardPageShell>
      <DashboardOverviewSection
        project={project}
        canUseOnlineLibrary={canUseOnlineLibrary}
        isCloudActionPending={isCloudActionPending}
        isLibraryActionPending={isLibraryActionPending}
        onCreatePresetProject={createPresetProject}
        onSyncCurrentProject={syncCurrentProject}
      />
      <DashboardLibrarySection bundleInputRef={bundleInputRef} localLibrary={localLibrary} cloudLibrary={cloudLibrary} />
    </DashboardPageShell>
  );
}
