import type { DesignDocument } from "@/features/editor/types";

export const DESKTOP_DESIGN_FILE_VERSION = 1;

export type DesktopDesignFile = {
  version: typeof DESKTOP_DESIGN_FILE_VERSION;
  projectId: string;
  projectName: string;
  exportedAt: string;
  document: DesignDocument;
};

export type DesktopDesignFileResult = {
  filePath: string;
  file: DesktopDesignFile;
};

export type DesktopRecentDesignFile = {
  projectId: string;
  projectName: string;
  filePath: string;
  updatedAt: string;
};

export type OfflineAssetCacheRequest = {
  cacheKey: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  sourcePageId: string | null;
  sourceElementId: string | null;
};

export type OfflineAssetCacheEntry = Omit<
  OfflineAssetCacheRequest,
  "dataUrl"
> & {
  sizeBytes: number;
  filePath: string;
};

type CreateDesktopDesignFileInput = {
  projectId: string;
  projectName: string;
  document: DesignDocument;
  exportedAt?: string;
};

export function isTauriRuntime() {
  if (typeof window === "undefined") return false;

  return Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__,
  );
}

export function createDesktopDesignFile({
  projectId,
  projectName,
  document,
  exportedAt = new Date().toISOString(),
}: CreateDesktopDesignFileInput): DesktopDesignFile {
  return {
    version: DESKTOP_DESIGN_FILE_VERSION,
    projectId,
    projectName,
    exportedAt,
    document,
  };
}

export function getSuggestedDesktopDesignFileName(projectName: string) {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${slug || "untitled-design"}.essence-design.json`;
}

export function normalizeRecentDesignFiles(input: unknown) {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const recentFiles: DesktopRecentDesignFile[] = [];

  for (const item of input) {
    if (!isRecentDesignFile(item) || seen.has(item.filePath)) continue;

    seen.add(item.filePath);
    recentFiles.push(item);
  }

  return recentFiles;
}

export async function saveDesktopDesignFile({
  filePath,
  file,
}: {
  filePath: string;
  file: DesktopDesignFile;
}) {
  return invokeDesktopBridge<DesktopDesignFileResult>("save_design_file", {
    request: { filePath, file },
  });
}

export async function openDesktopDesignFile(filePath: string) {
  return invokeDesktopBridge<DesktopDesignFileResult>("open_design_file", {
    request: { filePath },
  });
}

export async function listRecentDesktopDesignFiles() {
  const recentFiles = await invokeDesktopBridge<unknown>(
    "list_recent_design_files",
  );

  return normalizeRecentDesignFiles(recentFiles);
}

export async function removeRecentDesktopDesignFile(filePath: string) {
  const recentFiles = await invokeDesktopBridge<unknown>(
    "remove_recent_design_file",
    {
      request: { filePath },
    },
  );

  return normalizeRecentDesignFiles(recentFiles);
}

export async function cacheOfflineDesktopAssets(
  assets: OfflineAssetCacheRequest[],
) {
  return invokeDesktopBridge<OfflineAssetCacheEntry[]>("cache_offline_assets", {
    request: { assets },
  });
}

async function invokeDesktopBridge<T>(
  command: string,
  args?: Record<string, unknown>,
) {
  if (!isTauriRuntime()) {
    throw new Error("Desktop bridge is unavailable in this runtime.");
  }

  const { invoke } = await import("@tauri-apps/api/core");

  return invoke<T>(command, args);
}

function isRecentDesignFile(value: unknown): value is DesktopRecentDesignFile {
  if (!isRecord(value)) return false;

  return (
    typeof value.projectId === "string" &&
    typeof value.projectName === "string" &&
    typeof value.filePath === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
