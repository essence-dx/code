"use client";

import { AiWorkspaceCard } from "@/features/dashboard/components/ai-workspace-card";
import { CurrentProjectCard } from "@/features/dashboard/components/current-project-card";
import type { EditorProject } from "@/lib/editor/types";

type DashboardOverviewSectionProps = {
  project: EditorProject;
  canUseOnlineLibrary: boolean;
  isCloudActionPending: boolean;
  isLibraryActionPending: boolean;
  onCreatePresetProject: (title: string, aspectRatio: string) => Promise<void>;
  onSyncCurrentProject: () => Promise<void>;
};

export function DashboardOverviewSection({
  project,
  canUseOnlineLibrary,
  isCloudActionPending,
  isLibraryActionPending,
  onCreatePresetProject,
  onSyncCurrentProject,
}: DashboardOverviewSectionProps) {
  return (
    <section className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]" aria-label="Project overview">
      <CurrentProjectCard
        project={project}
        canUseOnlineLibrary={canUseOnlineLibrary}
        isCloudActionPending={isCloudActionPending}
        isLibraryActionPending={isLibraryActionPending}
        onCreatePresetProject={onCreatePresetProject}
        onSyncCurrentProject={onSyncCurrentProject}
      />
      <AiWorkspaceCard />
    </section>
  );
}
