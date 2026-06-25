import { APP_PACKAGE_PRESETS } from "@/features/projects/app-package-export";
import { applySceneSnapshot, ensureDocumentScenes } from "@/features/editor/scene/multi-scene";
import { sceneDocumentSchema, type SceneDocument } from "@/features/editor/types";
import { getSharePermissionReviewGate } from "@/features/projects/project-review-gates";
import { createProjectTemplatePayload, projectTemplateDefinitions } from "@/features/projects/project-templates";
import { getAppPackagePath, getEmbedPath, getPublicSceneApiPath, getSharePath } from "@/features/projects/share-links";
import { resolveShareSettings, type SharePermission, type ShareSettings } from "@/features/projects/share-settings";

type DateLike = Date | string | null | undefined;

export type SceneQaSnapshotSurface = "api-payload" | "embed" | "public-viewer" | "template-launch";
export type SceneQaSnapshotStatus = "fail" | "pass" | "warn";

export interface SceneQaProjectSource {
  archivedAt: DateLike;
  id: string;
  name: string;
  publishedAt: DateLike;
  sceneData: unknown;
  shareId: string | null;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
}

interface SceneQaSnapshot {
  activeCameraId: string | null;
  activeSceneId: string;
  animationTrackCount: number;
  appPackagePathCount: number;
  objectCount: number;
  objectKindCounts: Record<string, number>;
  path: string | null;
  sceneCount: number;
  sceneName: string;
  sceneStateCount: number;
  surface: SceneQaSnapshotSurface;
  variableCount: number;
}

export interface SceneQaSnapshotComparison {
  actualSignature: string | null;
  expectedSignature: string | null;
  id: string;
  issues: string[];
  path: string | null;
  projectId?: string;
  status: SceneQaSnapshotStatus;
  surface: SceneQaSnapshotSurface;
  targetName: string;
  templateId?: string;
  updatedAt: string | null;
}

export interface SceneQaSnapshotReport {
  comparisons: SceneQaSnapshotComparison[];
  generatedAt: string;
  summary: {
    apiPayloadCount: number;
    embedCount: number;
    failedCount: number;
    passedCount: number;
    projectCount: number;
    publicViewerCount: number;
    templateCount: number;
    templateLaunchCount: number;
    totalCount: number;
    warningCount: number;
  };
}

const surfaceLabels: Record<SceneQaSnapshotSurface, string> = {
  "api-payload": "API payload",
  embed: "Embed",
  "public-viewer": "Public viewer",
  "template-launch": "Template launch",
};

const surfacePermissions: Record<Exclude<SceneQaSnapshotSurface, "template-launch">, SharePermission> = {
  "api-payload": "allowPublicApi",
  embed: "allowEmbed",
  "public-viewer": "allowView",
};

const statusRank: Record<SceneQaSnapshotStatus, number> = {
  fail: 0,
  warn: 1,
  pass: 2,
};

function toTime(value: DateLike) {
  if (!value) {
    return 0;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function toIso(value: DateLike) {
  const time = toTime(value);

  return time > 0 ? new Date(time).toISOString() : null;
}

function countObjectKinds(document: SceneDocument) {
  return document.objects.reduce<Record<string, number>>((counts, object) => {
    counts[object.kind] = (counts[object.kind] ?? 0) + 1;

    return counts;
  }, {});
}

function stableObject(value: Record<string, unknown>) {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = value[key];

      return result;
    }, {});
}

function snapshotSignature(snapshot: SceneQaSnapshot) {
  return JSON.stringify(
    stableObject({
      activeCameraId: snapshot.activeCameraId,
      activeSceneId: snapshot.activeSceneId,
      animationTrackCount: snapshot.animationTrackCount,
      objectCount: snapshot.objectCount,
      objectKindCounts: stableObject(snapshot.objectKindCounts),
      sceneCount: snapshot.sceneCount,
      sceneName: snapshot.sceneName,
      sceneStateCount: snapshot.sceneStateCount,
      variableCount: snapshot.variableCount,
    }),
  );
}

function resolveActiveSceneDocument(document: SceneDocument) {
  const normalized = ensureDocumentScenes(document);
  const scenes = normalized.scenes ?? [];
  const activeSceneId = normalized.activeSceneId ?? scenes[0]?.id ?? normalized.id;
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];

  return {
    document: activeScene ? applySceneSnapshot(normalized, activeScene) : normalized,
    scenes,
  };
}

function createSnapshot(input: {
  document: SceneDocument;
  path: string | null;
  sceneCount: number;
  surface: SceneQaSnapshotSurface;
}): SceneQaSnapshot {
  return {
    activeCameraId: input.document.activeCameraId ?? null,
    activeSceneId: input.document.activeSceneId ?? input.document.id,
    animationTrackCount: input.document.animationTracks?.length ?? 0,
    appPackagePathCount: input.surface === "api-payload" ? APP_PACKAGE_PRESETS.length : 0,
    objectCount: input.document.objects.length,
    objectKindCounts: countObjectKinds(input.document),
    path: input.path,
    sceneCount: input.sceneCount,
    sceneName: input.document.name,
    sceneStateCount: input.document.sceneStates?.length ?? 0,
    surface: input.surface,
    variableCount: input.document.variables?.length ?? 0,
  };
}

function compareSnapshots(expected: SceneQaSnapshot, actual: SceneQaSnapshot) {
  const issues: string[] = [];

  if (expected.activeSceneId !== actual.activeSceneId) {
    issues.push(`Active scene changed from ${expected.activeSceneId} to ${actual.activeSceneId}.`);
  }

  if (expected.sceneName !== actual.sceneName) {
    issues.push(`Scene name changed from ${expected.sceneName} to ${actual.sceneName}.`);
  }

  if (expected.objectCount !== actual.objectCount) {
    issues.push(`Object count changed from ${expected.objectCount} to ${actual.objectCount}.`);
  }

  if (expected.sceneCount !== actual.sceneCount) {
    issues.push(`Scene count changed from ${expected.sceneCount} to ${actual.sceneCount}.`);
  }

  if (snapshotSignature(expected) !== snapshotSignature(actual)) {
    issues.push(`${surfaceLabels[actual.surface]} snapshot signature differs from the canonical scene baseline.`);
  }

  return issues;
}

function createUnavailableComparison(input: {
  id: string;
  issue: string;
  projectId?: string;
  status: SceneQaSnapshotStatus;
  surface: SceneQaSnapshotSurface;
  targetName: string;
  updatedAt: string | null;
}) {
  return {
    actualSignature: null,
    expectedSignature: null,
    id: input.id,
    issues: [input.issue],
    path: null,
    projectId: input.projectId,
    status: input.status,
    surface: input.surface,
    targetName: input.targetName,
    updatedAt: input.updatedAt,
  } satisfies SceneQaSnapshotComparison;
}

function createProjectSurfaceComparison(input: {
  baseline: SceneQaSnapshot;
  document: SceneDocument;
  project: SceneQaProjectSource;
  sceneCount: number;
  shareId: string;
  surface: Exclude<SceneQaSnapshotSurface, "template-launch">;
}) {
  const settings = resolveShareSettings(input.project.shareSettings);
  const permission = surfacePermissions[input.surface];
  const permissionAllowed = settings[permission];
  const reviewGate = getSharePermissionReviewGate(settings, permission);
  const path =
    input.surface === "public-viewer"
      ? getSharePath(input.shareId, input.baseline.activeSceneId)
      : input.surface === "embed"
        ? getEmbedPath(input.shareId, input.baseline.activeSceneId)
        : getPublicSceneApiPath(input.shareId, input.baseline.activeSceneId);

  if (!permissionAllowed) {
    return createUnavailableComparison({
      id: `${input.project.id}:${input.surface}:disabled`,
      issue: `${surfaceLabels[input.surface]} is disabled in share settings.`,
      projectId: input.project.id,
      status: input.surface === "public-viewer" ? "fail" : "warn",
      surface: input.surface,
      targetName: input.project.name,
      updatedAt: toIso(input.project.updatedAt),
    });
  }

  if (!reviewGate.allowed) {
    return createUnavailableComparison({
      id: `${input.project.id}:${input.surface}:blocked`,
      issue: reviewGate.message,
      projectId: input.project.id,
      status: input.surface === "public-viewer" ? "fail" : "warn",
      surface: input.surface,
      targetName: input.project.name,
      updatedAt: toIso(input.project.updatedAt),
    });
  }

  const actual = createSnapshot({
    document: input.document,
    path,
    sceneCount: input.sceneCount,
    surface: input.surface,
  });
  const issues = compareSnapshots(input.baseline, actual);

  if (input.surface === "api-payload") {
    const expectedAppPaths = APP_PACKAGE_PRESETS.map((preset) => getAppPackagePath(input.shareId, preset.id, input.baseline.activeSceneId));

    if (expectedAppPaths.length !== actual.appPackagePathCount) {
      issues.push("API payload app package path count does not match package presets.");
    }
  }

  return {
    actualSignature: snapshotSignature(actual),
    expectedSignature: snapshotSignature(input.baseline),
    id: `${input.project.id}:${input.surface}:${input.baseline.activeSceneId}`,
    issues,
    path,
    projectId: input.project.id,
    status: issues.length > 0 ? "fail" : "pass",
    surface: input.surface,
    targetName: input.project.name,
    updatedAt: toIso(input.project.updatedAt),
  } satisfies SceneQaSnapshotComparison;
}

function createProjectComparisons(project: SceneQaProjectSource) {
  if (project.archivedAt || !project.publishedAt) {
    return [];
  }

  const updatedAt = toIso(project.updatedAt);

  if (!project.shareId) {
    return [
      createUnavailableComparison({
        id: `${project.id}:published-share-missing`,
        issue: "Published project is missing a share id.",
        projectId: project.id,
        status: "fail",
        surface: "public-viewer",
        targetName: project.name,
        updatedAt,
      }),
    ];
  }

  const parsed = sceneDocumentSchema.safeParse(project.sceneData);

  if (!parsed.success) {
    return (["public-viewer", "embed", "api-payload"] as const).map((surface) =>
      createUnavailableComparison({
        id: `${project.id}:${surface}:invalid-scene`,
        issue: "Scene data could not be parsed for public-surface QA.",
        projectId: project.id,
        status: "fail",
        surface,
        targetName: project.name,
        updatedAt,
      }),
    );
  }

  const activeScene = resolveActiveSceneDocument(parsed.data);
  const baseline = createSnapshot({
    document: activeScene.document,
    path: null,
    sceneCount: activeScene.scenes.length,
    surface: "public-viewer",
  });

  return (["public-viewer", "embed", "api-payload"] as const).map((surface) =>
    createProjectSurfaceComparison({
      baseline,
      document: activeScene.document,
      project,
      sceneCount: activeScene.scenes.length,
      shareId: project.shareId ?? "",
      surface,
    }),
  );
}

function createTemplateLaunchComparison(templateId: string) {
  const payload = createProjectTemplatePayload({ templateId });
  const parsed = sceneDocumentSchema.safeParse(payload.sceneData);
  const template = projectTemplateDefinitions.find((entry) => entry.id === templateId);

  if (!template || !parsed.success) {
    return createUnavailableComparison({
      id: `${templateId}:template-launch:invalid`,
      issue: "Template launch scene could not be generated.",
      status: "fail",
      surface: "template-launch",
      targetName: template?.name ?? templateId,
      updatedAt: null,
    });
  }

  const activeScene = resolveActiveSceneDocument(parsed.data);
  const snapshot = createSnapshot({
    document: activeScene.document,
    path: null,
    sceneCount: activeScene.scenes.length,
    surface: "template-launch",
  });
  const issues: string[] = [];

  if (payload.template.id !== template.id) {
    issues.push("Generated payload returned the wrong template definition.");
  }

  if (payload.template.exportPresetId !== template.exportPresetId) {
    issues.push("Generated payload returned the wrong export preset.");
  }

  if (payload.template.reviewPolicyPresetId !== template.reviewPolicyPresetId) {
    issues.push("Generated payload returned the wrong review policy preset.");
  }

  if (snapshot.objectCount <= 1) {
    issues.push("Generated template launch scene has no meaningful starter objects.");
  }

  return {
    actualSignature: snapshotSignature(snapshot),
    expectedSignature: snapshotSignature(snapshot),
    id: `${template.id}:template-launch`,
    issues,
    path: null,
    status: issues.length > 0 ? "fail" : "pass",
    surface: "template-launch",
    targetName: template.name,
    templateId: template.id,
    updatedAt: parsed.data.updatedAt,
  } satisfies SceneQaSnapshotComparison;
}

export function summarizeSceneQaSnapshotComparisons(comparisons: SceneQaSnapshotComparison[]): SceneQaSnapshotReport["summary"] {
  return {
    apiPayloadCount: comparisons.filter((comparison) => comparison.surface === "api-payload").length,
    embedCount: comparisons.filter((comparison) => comparison.surface === "embed").length,
    failedCount: comparisons.filter((comparison) => comparison.status === "fail").length,
    passedCount: comparisons.filter((comparison) => comparison.status === "pass").length,
    projectCount: new Set(comparisons.flatMap((comparison) => (comparison.projectId ? [comparison.projectId] : []))).size,
    publicViewerCount: comparisons.filter((comparison) => comparison.surface === "public-viewer").length,
    templateCount: new Set(comparisons.flatMap((comparison) => (comparison.templateId ? [comparison.templateId] : []))).size,
    templateLaunchCount: comparisons.filter((comparison) => comparison.surface === "template-launch").length,
    totalCount: comparisons.length,
    warningCount: comparisons.filter((comparison) => comparison.status === "warn").length,
  };
}

export function createSceneQaSnapshotReport(input: {
  now?: Date;
  projects: SceneQaProjectSource[];
  templateIds?: string[];
}): SceneQaSnapshotReport {
  const templateIds = input.templateIds ?? projectTemplateDefinitions.map((template) => template.id);
  const comparisons = [
    ...input.projects.flatMap(createProjectComparisons),
    ...templateIds.map(createTemplateLaunchComparison),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.surface.localeCompare(second.surface) || first.targetName.localeCompare(second.targetName));

  return {
    comparisons,
    generatedAt: (input.now ?? new Date()).toISOString(),
    summary: summarizeSceneQaSnapshotComparisons(comparisons),
  };
}
