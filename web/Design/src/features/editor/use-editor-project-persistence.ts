"use client";

import { useCallback, useState } from "react";
import type { MutableRefObject } from "react";

import { applyProjectAssetManifest } from "@/features/assets/project-asset-manifest";
import { createProjectCollaborationOperationId } from "@/features/editor/project-collaboration-sync";
import type {
  BrandColorSummary,
  BrandFontSummary,
  DesignDocument,
  ProjectDetail,
  ProjectVersionSummary,
} from "@/features/editor/types";

export type SaveState = "dirty" | "saving" | "saved" | "error";
export type TemplateSaveState = "idle" | "saving" | "saved" | "error";

type UseEditorProjectPersistenceInput = {
  projectId: string;
  initialBrandColors: BrandColorSummary[];
  initialBrandFonts: BrandFontSummary[];
  initialVersions: ProjectVersionSummary[];
  canRestoreVersions: boolean;
  document: DesignDocument;
  projectName: string;
  sharedEditShareId: string | null;
  changeRevisionRef: MutableRefObject<number>;
  captureCurrentThumbnail: () => Promise<string | undefined>;
  replacePresent: (document: DesignDocument) => void;
  markProjectSynced: (project: ProjectDetail) => void;
  setProjectName: (name: string) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setSaveState: (state: SaveState) => void;
};

export function useEditorProjectPersistence({
  projectId,
  initialBrandColors,
  initialBrandFonts,
  initialVersions,
  canRestoreVersions,
  document,
  projectName,
  sharedEditShareId,
  changeRevisionRef,
  captureCurrentThumbnail,
  replacePresent,
  markProjectSynced,
  setProjectName,
  setSelectedElementIds,
  setSaveState,
}: UseEditorProjectPersistenceInput) {
  const [templateSaveState, setTemplateSaveState] =
    useState<TemplateSaveState>("idle");
  const [brandColors, setBrandColors] = useState(initialBrandColors);
  const [brandFonts, setBrandFonts] = useState(initialBrandFonts);
  const [versions, setVersions] = useState(initialVersions);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null,
  );

  const refreshVersions = useCallback(async () => {
    if (!canRestoreVersions) return;

    const response = await fetch(`/api/projects/${projectId}/versions`);

    if (!response.ok) return;

    const body = (await response.json()) as {
      versions: ProjectVersionSummary[];
    };

    setVersions(body.versions);
  }, [canRestoreVersions, projectId]);

  const saveProject = useCallback(async () => {
    setSaveState("saving");
    const saveRevision = changeRevisionRef.current;
    const thumbnail = await captureCurrentThumbnail();
    const documentWithAssetManifest = applyProjectAssetManifest(document);
    const operationId = createProjectCollaborationOperationId({
      projectId,
      revision: saveRevision,
      kind: "manual-save",
    });

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        document: documentWithAssetManifest,
        thumbnail,
        operationId,
        operationKind: "manual-save",
        clientRevision: saveRevision,
        ...(sharedEditShareId ? { editShareId: sharedEditShareId } : {}),
      }),
    });

    if (!response.ok) {
      setSaveState("error");
      return false;
    }

    const body = (await response.json()) as {
      project: ProjectDetail;
    };

    markProjectSynced(body.project);
    setSaveState(
      saveRevision === changeRevisionRef.current ? "saved" : "dirty",
    );
    await refreshVersions();
    return true;
  }, [
    captureCurrentThumbnail,
    changeRevisionRef,
    document,
    markProjectSynced,
    projectId,
    projectName,
    refreshVersions,
    setSaveState,
    sharedEditShareId,
  ]);

  const restoreVersion = useCallback(
    async (versionId: string) => {
      setRestoringVersionId(versionId);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/versions/${versionId}/restore`,
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          setSaveState("error");
          return;
        }

        const body = (await response.json()) as {
          project: ProjectDetail;
          versions: ProjectVersionSummary[];
        };

        replacePresent(body.project.document);
        setProjectName(body.project.name);
        setVersions(body.versions);
        setSelectedElementIds([]);
        markProjectSynced(body.project);
        setSaveState("saved");
      } finally {
        setRestoringVersionId(null);
      }
    },
    [
      markProjectSynced,
      projectId,
      replacePresent,
      setProjectName,
      setSaveState,
      setSelectedElementIds,
    ],
  );

  const createBrandColor = useCallback(async (color: string) => {
    const response = await fetch("/api/brand/colors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ color }),
    });

    if (!response.ok) return;

    const body = (await response.json()) as {
      color: BrandColorSummary;
    };

    setBrandColors((current) => [
      body.color,
      ...current.filter((item) => item.id !== body.color.id),
    ]);
  }, []);

  const saveBrandFont = useCallback(
    async (font: Omit<BrandFontSummary, "id" | "createdAt" | "updatedAt">) => {
      const response = await fetch("/api/brand/fonts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(font),
      });

      if (!response.ok) return;

      const body = (await response.json()) as {
        font: BrandFontSummary;
      };

      setBrandFonts((current) => [
        body.font,
        ...current.filter((item) => item.role !== body.font.role),
      ]);
    },
    [],
  );

  const saveAsTemplate = useCallback(
    async (kind: "standard" | "brand" | "team" = "standard") => {
      setTemplateSaveState("saving");
      const thumbnail = await captureCurrentThumbnail();
      const isBrandTemplate = kind === "brand";
      const isTeamTemplate = kind === "team";

      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name:
            kind === "brand"
              ? `${projectName} brand template`
              : kind === "team"
                ? `${projectName} team template`
                : `${projectName} template`,
          width: document.width,
          height: document.height,
          document: applyProjectAssetManifest(document),
          thumbnail,
          isBrandTemplate,
          isTeamTemplate,
        }),
      });

      if (!response.ok) {
        setTemplateSaveState("error");
        return;
      }

      setTemplateSaveState("saved");
    },
    [captureCurrentThumbnail, document, projectName],
  );

  return {
    brandColors,
    brandFonts,
    versions,
    restoringVersionId,
    templateSaveState,
    saveProject,
    restoreVersion,
    createBrandColor,
    saveBrandFont,
    saveAsTemplate,
  };
}
