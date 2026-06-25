"use client";

import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import { sanitizeMediaAssets } from "@/lib/projects/project-sync-schema";
import { projectBundleFilename, saveRenderedBlob } from "@/lib/render/export-output";

export function createProjectBundleBlob(project: EditorProject, mediaAssets: MediaAsset[]) {
  return new Blob([JSON.stringify({ project, mediaAssets: sanitizeMediaAssets(mediaAssets) }, null, 2)], {
    type: "application/json",
  });
}

export async function saveProjectBundle(project: EditorProject, mediaAssets: MediaAsset[]) {
  return saveRenderedBlob(createProjectBundleBlob(project, mediaAssets), projectBundleFilename(project.title), "json");
}
