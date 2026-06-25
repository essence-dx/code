"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { useDashboardCloudLibrary } from "@/features/dashboard/hooks/use-dashboard-cloud-library";
import { useDashboardLocalLibrary } from "@/features/dashboard/hooks/use-dashboard-local-library";

export function useDashboardClientController() {
  const router = useRouter();
  const bundleInputRef = useRef<HTMLInputElement>(null);
  const project = useEditorStore((state) => state.project);
  const loadProject = useEditorStore((state) => state.loadProject);
  const openEditor = () => router.push("/editor");

  const localLibrary = useDashboardLocalLibrary({
    loadProject,
    openEditor,
  });
  const cloudLibrary = useDashboardCloudLibrary({
    currentProject: project,
    loadProject,
    refreshLocalProjects: localLibrary.refreshProjects,
    openEditor,
  });

  return {
    bundleInputRef,
    cloudLibrary,
    localLibrary,
    project,
  };
}
