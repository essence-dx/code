import { ensureDocumentScenes } from "@/features/editor/scene/multi-scene";
import { sceneDocumentSchema, type SceneDocument } from "@/features/editor/types";
import { APP_PACKAGE_PRESETS, type AppPackagePresetId } from "@/features/projects/app-package-export";
import { getProjectReviewGate } from "@/features/projects/project-review-gates";
import { getAppPackagePath, getEmbedPath, getPublicSceneApiPath, getSharePath } from "@/features/projects/share-links";
import { hasSharePermission, resolveShareSettings, type ShareSettings } from "@/features/projects/share-settings";

type DateLike = Date | string | null | undefined;

export type ProjectExportLineageArtifactKind = "api-payload" | "app-package" | "compliance-report" | "embed" | "public-link";
export type ProjectExportLineageArtifactStatus = "available" | "blocked" | "draft";

export interface ProjectExportLineageProject {
  id: string;
  name: string;
  publishedAt: DateLike;
  shareId: string | null;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
}

export interface ProjectExportLineageVersionSource {
  createdAt: DateLike;
  id: string;
  name: string;
  objectCount?: number | null;
}

export interface ProjectExportLineageVersion {
  createdAt: string | null;
  id: string;
  name: string;
  objectCount: number | null;
}

export interface ProjectExportLineageArtifact {
  blockedReason: string | null;
  id: string;
  kind: ProjectExportLineageArtifactKind;
  label: string;
  path: string | null;
  presetId?: AppPackagePresetId;
  public: boolean;
  requiresAuth: boolean;
  sourceVersionId: string;
  status: ProjectExportLineageArtifactStatus;
  url: string | null;
}

export interface ProjectExportLineageReport {
  activeSceneId: string | null;
  artifacts: ProjectExportLineageArtifact[];
  generatedAt: string;
  project: {
    id: string;
    name: string;
    published: boolean;
    shareId: string | null;
  };
  sourceVersion: ProjectExportLineageVersion;
  summary: {
    appPackageCount: number;
    availableCount: number;
    blockedCount: number;
    draftCount: number;
    publicArtifactCount: number;
    totalCount: number;
  };
}

export interface ProjectExportAppPackageLineageManifest {
  artifactId: string;
  artifactPath: string | null;
  generatedAt: string;
  presetId: AppPackagePresetId;
  projectId: string;
  shareId: string | null;
  sourceVersion: ProjectExportLineageVersion;
  upstreamArtifactIds: string[];
}

export interface ProjectExportLineageInput {
  activeSceneId?: string | null;
  generatedAt?: string;
  origin?: string | null;
  project: ProjectExportLineageProject;
  sceneData: SceneDocument | unknown | null;
  versions?: ProjectExportLineageVersionSource[];
}

function toDate(value: DateLike) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: DateLike) {
  return toDate(value)?.toISOString() ?? null;
}

function toTime(value: DateLike) {
  return toDate(value)?.getTime() ?? 0;
}

function normalizeOrigin(origin?: string | null) {
  const trimmed = origin?.trim().replace(/\/+$/, "");

  return trimmed || null;
}

function absoluteUrl(origin: string | null, path: string | null) {
  return origin && path ? `${origin}${path}` : null;
}

function parseSceneData(sceneData: ProjectExportLineageInput["sceneData"]) {
  const parsed = sceneDocumentSchema.safeParse(sceneData);

  return parsed.success ? ensureDocumentScenes(parsed.data) : null;
}

function sceneObjectCount(sceneData: SceneDocument | null) {
  if (!sceneData) {
    return null;
  }

  return sceneData.scenes?.length ? sceneData.scenes.reduce((count, scene) => count + scene.objects.length, 0) : sceneData.objects.length;
}

function activeSceneId(sceneData: SceneDocument | null, requestedSceneId?: string | null) {
  if (requestedSceneId) {
    return requestedSceneId;
  }

  return sceneData?.activeSceneId ?? sceneData?.scenes?.[0]?.id ?? sceneData?.id ?? null;
}

function latestVersion(input: ProjectExportLineageInput, sceneData: SceneDocument | null): ProjectExportLineageVersion {
  const version = [...(input.versions ?? [])].sort((first, second) => toTime(second.createdAt) - toTime(first.createdAt))[0];

  if (version) {
    return {
      createdAt: toIso(version.createdAt),
      id: version.id,
      name: version.name,
      objectCount: version.objectCount ?? null,
    };
  }

  return {
    createdAt: toIso(input.project.updatedAt),
    id: `live:${input.project.id}`,
    name: "Current saved scene",
    objectCount: sceneObjectCount(sceneData),
  };
}

function summarizeArtifacts(artifacts: ProjectExportLineageArtifact[]): ProjectExportLineageReport["summary"] {
  return {
    appPackageCount: artifacts.filter((artifact) => artifact.kind === "app-package").length,
    availableCount: artifacts.filter((artifact) => artifact.status === "available").length,
    blockedCount: artifacts.filter((artifact) => artifact.status === "blocked").length,
    draftCount: artifacts.filter((artifact) => artifact.status === "draft").length,
    publicArtifactCount: artifacts.filter((artifact) => artifact.public).length,
    totalCount: artifacts.length,
  };
}

function publishedStatus(input: {
  allowed: boolean;
  blockedReason: string;
  path: string | null;
  published: boolean;
  shareId: string | null;
}): { blockedReason: string | null; status: ProjectExportLineageArtifactStatus } {
  if (!input.published || !input.shareId || !input.path) {
    return {
      blockedReason: "Publish the scene before this public artifact is available.",
      status: "draft",
    };
  }

  if (!input.allowed) {
    return {
      blockedReason: input.blockedReason,
      status: "blocked",
    };
  }

  return {
    blockedReason: null,
    status: "available",
  };
}

function createArtifact(input: Omit<ProjectExportLineageArtifact, "id" | "sourceVersionId" | "url"> & {
  origin: string | null;
  sourceVersionId: string;
}): ProjectExportLineageArtifact {
  return {
    ...input,
    id: `${input.kind}:${input.presetId ?? "default"}:${input.sourceVersionId}`,
    sourceVersionId: input.sourceVersionId,
    url: absoluteUrl(input.origin, input.path),
  };
}

export function createProjectExportLineageReport(input: ProjectExportLineageInput): ProjectExportLineageReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const origin = normalizeOrigin(input.origin);
  const sceneData = parseSceneData(input.sceneData);
  const selectedSceneId = activeSceneId(sceneData, input.activeSceneId);
  const settings = resolveShareSettings(input.project.shareSettings);
  const sourceVersion = latestVersion(input, sceneData);
  const published = Boolean(input.project.publishedAt && input.project.shareId);
  const sharePath = input.project.shareId ? getSharePath(input.project.shareId, selectedSceneId) : null;
  const embedPath = input.project.shareId ? getEmbedPath(input.project.shareId, selectedSceneId) : null;
  const apiPath = input.project.shareId ? getPublicSceneApiPath(input.project.shareId, selectedSceneId) : null;
  const publicGate = getProjectReviewGate(settings, "publicLink");
  const embedGate = getProjectReviewGate(settings, "embed");
  const appPackageGate = getProjectReviewGate(settings, "appPackage");
  const publicLinkStatus = publishedStatus({
    allowed: hasSharePermission(settings, "allowView") && publicGate.allowed,
    blockedReason: publicGate.message,
    path: sharePath,
    published,
    shareId: input.project.shareId,
  });
  const embedStatus = publishedStatus({
    allowed: hasSharePermission(settings, "allowEmbed") && embedGate.allowed,
    blockedReason: embedGate.message,
    path: embedPath,
    published,
    shareId: input.project.shareId,
  });
  const apiStatus = publishedStatus({
    allowed: hasSharePermission(settings, "allowPublicApi") && embedGate.allowed,
    blockedReason: embedGate.message,
    path: apiPath,
    published,
    shareId: input.project.shareId,
  });
  const appPackageStatus = publishedStatus({
    allowed: hasSharePermission(settings, "allowViewerDownload") && appPackageGate.allowed,
    blockedReason: appPackageGate.message,
    path: input.project.shareId ? getAppPackagePath(input.project.shareId, "web", selectedSceneId) : null,
    published,
    shareId: input.project.shareId,
  });
  const artifacts: ProjectExportLineageArtifact[] = [
    createArtifact({
      blockedReason: null,
      kind: "compliance-report",
      label: "Compliance report",
      origin,
      path: `/api/projects/${encodeURIComponent(input.project.id)}/compliance?download=1`,
      public: false,
      requiresAuth: true,
      sourceVersionId: sourceVersion.id,
      status: "available",
    }),
    createArtifact({
      blockedReason: publicLinkStatus.blockedReason,
      kind: "public-link",
      label: "Public link",
      origin,
      path: sharePath,
      public: true,
      requiresAuth: false,
      sourceVersionId: sourceVersion.id,
      status: publicLinkStatus.status,
    }),
    createArtifact({
      blockedReason: embedStatus.blockedReason,
      kind: "embed",
      label: "Embed",
      origin,
      path: embedPath,
      public: true,
      requiresAuth: false,
      sourceVersionId: sourceVersion.id,
      status: embedStatus.status,
    }),
    createArtifact({
      blockedReason: apiStatus.blockedReason,
      kind: "api-payload",
      label: "API payload",
      origin,
      path: apiPath,
      public: true,
      requiresAuth: false,
      sourceVersionId: sourceVersion.id,
      status: apiStatus.status,
    }),
    ...APP_PACKAGE_PRESETS.map((preset) =>
      createArtifact({
        blockedReason: appPackageStatus.blockedReason,
        kind: "app-package",
        label: preset.label,
        origin,
        path: input.project.shareId ? getAppPackagePath(input.project.shareId, preset.id, selectedSceneId) : null,
        presetId: preset.id,
        public: true,
        requiresAuth: false,
        sourceVersionId: sourceVersion.id,
        status: appPackageStatus.status,
      }),
    ),
  ];

  return {
    activeSceneId: selectedSceneId,
    artifacts,
    generatedAt,
    project: {
      id: input.project.id,
      name: input.project.name,
      published,
      shareId: input.project.shareId,
    },
    sourceVersion,
    summary: summarizeArtifacts(artifacts),
  };
}

export function createAppPackageLineageManifest(report: ProjectExportLineageReport, presetId: AppPackagePresetId): ProjectExportAppPackageLineageManifest {
  const artifact = report.artifacts.find((candidate) => candidate.kind === "app-package" && candidate.presetId === presetId);

  return {
    artifactId: artifact?.id ?? `app-package:${presetId}:${report.sourceVersion.id}`,
    artifactPath: artifact?.path ?? null,
    generatedAt: report.generatedAt,
    presetId,
    projectId: report.project.id,
    shareId: report.project.shareId,
    sourceVersion: report.sourceVersion,
    upstreamArtifactIds: report.artifacts.filter((candidate) => candidate.kind !== "app-package").map((candidate) => candidate.id),
  };
}
