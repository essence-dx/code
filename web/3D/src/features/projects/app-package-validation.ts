import type { AppPackageFile, AppPackageOptions, AppPackagePresetId } from "./app-package-export";
import type { ProjectExportAppPackageLineageManifest } from "./project-export-lineage";

export interface AppPackageSceneManifestEntry {
  id: string;
  name: string;
  objectCount: number;
  updatedAt?: string;
}

export interface AppPackageManifest {
  activeSceneId: string | null;
  embedUrl: string;
  lineage: ProjectExportAppPackageLineageManifest | null;
  sceneApiUrl: string;
  sceneName: string;
  scenes: AppPackageSceneManifestEntry[];
  schemaVersion: 1;
  shareUrl: string;
}

export interface AppPackageValidationIssue {
  code:
    | "duplicate-file"
    | "invalid-manifest"
    | "lineage-mismatch"
    | "missing-active-scene"
    | "missing-file"
    | "missing-scene-query"
    | "missing-url-reference"
    | "scene-id-duplicate"
    | "scene-mismatch";
  detail: string;
  filePath?: string;
}

export interface AppPackageValidationReport {
  issueCount: number;
  issues: AppPackageValidationIssue[];
  presetId: AppPackagePresetId;
  sceneCount: number;
  valid: boolean;
}

export const appPackageManifestPath = "public/essence-scene-package.json";

function normalizeSceneEntries(options: AppPackageOptions): AppPackageSceneManifestEntry[] {
  if (options.scenes?.length) {
    return options.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      objectCount: scene.objectCount,
      updatedAt: scene.updatedAt,
    }));
  }

  return options.activeSceneId
    ? [
        {
          id: options.activeSceneId,
          name: options.sceneName,
          objectCount: 0,
        },
      ]
    : [];
}

export function createAppPackageManifest(options: AppPackageOptions): AppPackageManifest {
  return {
    activeSceneId: options.activeSceneId ?? null,
    embedUrl: options.embedUrl,
    lineage: options.lineage ?? null,
    sceneApiUrl: options.sceneApiUrl,
    sceneName: options.sceneName,
    scenes: normalizeSceneEntries(options),
    schemaVersion: 1,
    shareUrl: options.shareUrl,
  };
}

export function createAppPackageManifestFile(options: AppPackageOptions): AppPackageFile {
  return {
    content: JSON.stringify(createAppPackageManifest(options), null, 2),
    path: appPackageManifestPath,
  };
}

function findFile(files: AppPackageFile[], path: string) {
  return files.find((file) => file.path === path);
}

function parseManifest(file: AppPackageFile | undefined, issues: AppPackageValidationIssue[]) {
  if (!file) {
    issues.push({
      code: "missing-file",
      detail: "Scene package manifest is required so exported apps can verify the selected scene.",
      filePath: appPackageManifestPath,
    });
    return null;
  }

  try {
    return JSON.parse(file.content) as Partial<AppPackageManifest>;
  } catch {
    issues.push({
      code: "invalid-manifest",
      detail: "Scene package manifest must be valid JSON.",
      filePath: appPackageManifestPath,
    });
    return null;
  }
}

function getSceneQueryValue(value: string) {
  try {
    return new URL(value).searchParams.get("scene");
  } catch {
    return null;
  }
}

function validateSceneQuery(url: string, activeSceneId: string, label: string, issues: AppPackageValidationIssue[]) {
  if (getSceneQueryValue(url) !== activeSceneId) {
    issues.push({
      code: "missing-scene-query",
      detail: `${label} must include ?scene=${activeSceneId} for multi-scene package exports.`,
    });
  }
}

function validateUrlReference(file: AppPackageFile | undefined, url: string, label: string, issues: AppPackageValidationIssue[]) {
  if (!file?.content.includes(url)) {
    issues.push({
      code: "missing-url-reference",
      detail: `${label} does not reference ${url}.`,
      filePath: file?.path,
    });
  }
}

export function validateAppPackageFiles(presetId: AppPackagePresetId, options: AppPackageOptions, files: AppPackageFile[]): AppPackageValidationReport {
  const issues: AppPackageValidationIssue[] = [];
  const seenFiles = new Set<string>();
  const sceneEntries = normalizeSceneEntries(options);
  const multiScene = sceneEntries.length > 1;

  for (const file of files) {
    if (seenFiles.has(file.path)) {
      issues.push({
        code: "duplicate-file",
        detail: `Package includes ${file.path} more than once.`,
        filePath: file.path,
      });
    }

    seenFiles.add(file.path);
  }

  for (const requiredPath of ["package.json", "README.md", "src/App.tsx"]) {
    if (!findFile(files, requiredPath)) {
      issues.push({
        code: "missing-file",
        detail: `Package is missing ${requiredPath}.`,
        filePath: requiredPath,
      });
    }
  }

  const sceneIds = new Set<string>();

  for (const scene of sceneEntries) {
    if (sceneIds.has(scene.id)) {
      issues.push({
        code: "scene-id-duplicate",
        detail: `Scene id ${scene.id} appears more than once in the package scene list.`,
      });
    }

    sceneIds.add(scene.id);
  }

  if (multiScene && (!options.activeSceneId || !sceneIds.has(options.activeSceneId))) {
    issues.push({
      code: "missing-active-scene",
      detail: "Multi-scene package exports must identify an active scene that exists in the scene list.",
    });
  }

  const manifest = parseManifest(findFile(files, appPackageManifestPath), issues);

  if (manifest) {
    if (manifest.schemaVersion !== 1 || manifest.sceneName !== options.sceneName || manifest.embedUrl !== options.embedUrl || manifest.sceneApiUrl !== options.sceneApiUrl || manifest.shareUrl !== options.shareUrl) {
      issues.push({
        code: "scene-mismatch",
        detail: "Scene package manifest does not match the export URLs or selected scene name.",
        filePath: appPackageManifestPath,
      });
    }

    if (manifest.activeSceneId !== (options.activeSceneId ?? null)) {
      issues.push({
        code: "scene-mismatch",
        detail: "Scene package manifest activeSceneId does not match the selected scene.",
        filePath: appPackageManifestPath,
      });
    }

    if ((manifest.scenes?.length ?? 0) !== sceneEntries.length) {
      issues.push({
        code: "scene-mismatch",
        detail: "Scene package manifest scene count does not match the exported scene list.",
        filePath: appPackageManifestPath,
      });
    }

    if ((manifest.lineage?.artifactId ?? null) !== (options.lineage?.artifactId ?? null)) {
      issues.push({
        code: "lineage-mismatch",
        detail: "Scene package manifest lineage does not match the export artifact lineage.",
        filePath: appPackageManifestPath,
      });
    }
  }

  if (multiScene && options.activeSceneId) {
    validateSceneQuery(options.embedUrl, options.activeSceneId, "Embed URL", issues);
    validateSceneQuery(options.sceneApiUrl, options.activeSceneId, "Scene API URL", issues);
    validateSceneQuery(options.shareUrl, options.activeSceneId, "Share URL", issues);
  }

  validateUrlReference(findFile(files, "src/App.tsx"), options.embedUrl, "React app source", issues);
  validateUrlReference(findFile(files, "src/App.tsx"), options.sceneApiUrl, "React app source", issues);
  validateUrlReference(findFile(files, "README.md"), options.shareUrl, "README", issues);

  return {
    issueCount: issues.length,
    issues,
    presetId,
    sceneCount: sceneEntries.length,
    valid: issues.length === 0,
  };
}
