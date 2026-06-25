"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEditorStore } from "@/features/editor/store/editor-store";
import { getProject } from "../project-api";

export function ProjectRouteLoader() {
  const searchParams = useSearchParams();
  const loadedProjectIdRef = useRef<string | null>(null);
  const loadProject = useEditorStore((state) => state.loadProject);
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    if (!projectId || loadedProjectIdRef.current === projectId) {
      return;
    }

    const routeProjectId = projectId;
    loadedProjectIdRef.current = routeProjectId;

    async function loadProjectFromRoute() {
      try {
        const response = await getProject(routeProjectId);
        loadProject(response.project.id, response.project.sceneData, response.project.updatedAt);
        toast.success(`${response.project.name} opened`);
      } catch (error) {
        loadedProjectIdRef.current = null;
        const message = error instanceof Error ? error.message : "Could not open project";
        toast.error(message === "Unauthorized" ? "Sign in to open this project" : message);
      }
    }

    void loadProjectFromRoute();
  }, [loadProject, projectId]);

  return null;
}
