import type { DesignDocument } from "@/features/editor/types";
import {
  getExportFileEntries,
  type ExportSettings,
} from "@/features/editor/exporters/export-settings";
import type { ImportDiagnosticReport } from "@/features/editor/importers/import-diagnostics";

export const exportManifestType = "essence.export-manifest";

export type ExportManifest = {
  type: typeof exportManifestType;
  version: 1;
  exportedAt: string;
  fileName: string;
  exportName: string;
  settings: ExportSettings;
  document: {
    scope: ExportSettings["scope"];
    pageCount: number;
    layerCount: number;
    commentCount: number;
    selectedLayerCount: number;
    activePageId: string;
  };
  files: ReturnType<typeof getExportFileEntries>;
};

export function createExportManifest({
  document,
  exportName,
  fileName,
  selectedLayerIds,
  settings,
}: {
  document: DesignDocument;
  exportName: string;
  fileName: string;
  selectedLayerIds: string[];
  settings: ExportSettings;
}): ExportManifest {
  const pages = document.pages;
  const layers = pages.flatMap((page) => page.layers);
  const comments = pages.flatMap((page) => page.comments ?? []);

  return {
    type: exportManifestType,
    version: 1,
    exportedAt: new Date().toISOString(),
    fileName,
    exportName,
    settings,
    document: {
      scope: settings.scope,
      pageCount: pages.length,
      layerCount: layers.length,
      commentCount: comments.length,
      selectedLayerCount: selectedLayerIds.length,
      activePageId: document.activePageId,
    },
    files: getExportFileEntries(exportName, settings),
  };
}

export function getExportManifestImportDiagnostic(
  value: string,
  fileName: string,
): ImportDiagnosticReport | null {
  const parsed = parseJson(value);

  if (!isRecord(parsed) || parsed.type !== exportManifestType) {
    return null;
  }

  const issues: string[] = [];
  const files = Array.isArray(parsed.files) ? parsed.files : [];

  if (parsed.version !== 1) {
    issues.push("Unsupported export manifest version. Expected version 1.");
  }

  if (!isRecord(parsed.settings)) {
    issues.push("Manifest is missing export settings.");
  }

  if (files.length === 0) {
    issues.push("Manifest does not list any exported files.");
  }

  if (!isRecord(parsed.document)) {
    issues.push("Manifest is missing document counts.");
  }

  return {
    title:
      issues.length > 0
        ? "Export manifest needs review"
        : "Export manifest validated",
    fileName,
    detectedKind: "json",
    issues:
      issues.length > 0
        ? issues
        : [
            `Manifest records ${files.length} exported file${
              files.length === 1 ? "" : "s"
            } for ${String(parsed.exportName ?? "this batch")}.`,
          ],
    hints: [
      "Use this manifest to verify a completed export batch.",
      "Import the source design JSON from the batch when you want to restore editable layers.",
    ],
  };
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
