"use client";

import { z } from "zod";
import type { ProjectReviewSummary } from "@/lib/editor/project-review-summary";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import type { LocalProjectRecord } from "@/lib/projects/local-project-record";
import { mediaAssetSchema, projectSchema, type SyncedProjectPayload } from "@/lib/projects/project-sync-schema";
import { ProjectSyncConflictError, type ProjectSyncConflictDetails, type ProjectSyncConflictPolicy } from "@/lib/projects/project-sync-conflicts";
import {
  syncedProjectAuditEventSchema,
  syncedProjectVersionSummarySchema,
  type SyncedProjectAuditEvent,
  type SyncedProjectVersionSummary,
} from "@/lib/projects/project-version-contracts";
import { assertClientApiRuntime, clientApiUrl } from "@/lib/runtime/client-api";

const syncedProjectSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  aspectRatio: z.string(),
  duration: z.number(),
  layerCount: z.number(),
  mediaCount: z.number(),
  reviewSummary: z
    .object({
      status: z.enum(["clean", "notes", "needs-review", "changes-requested", "approved"]),
      needsReview: z.number().finite().int().min(0),
      changesRequested: z.number().finite().int().min(0),
      approved: z.number().finite().int().min(0),
      withNotes: z.number().finite().int().min(0),
    })
    .optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

const listCloudProjectsResponseSchema = z.object({
  ok: z.literal(true),
  projects: z.array(syncedProjectSummarySchema),
});

const saveCloudProjectResponseSchema = z.object({
  ok: z.literal(true),
  project: z.object({ id: z.string(), updatedAt: z.string() }),
});

const projectSyncConflictResponseSchema = z.object({
  ok: z.literal(false),
  code: z.literal("project_conflict"),
  reason: z.string(),
  conflict: z.object({
    code: z.literal("project_conflict"),
    baseUpdatedAt: z.string().optional(),
    remoteUpdatedAt: z.string(),
    localUpdatedAt: z.string(),
  }),
});

const loadCloudProjectResponseSchema = z.object({
  ok: z.literal(true),
  project: z.object({
    project: projectSchema,
    mediaAssets: z.array(mediaAssetSchema),
  }),
});

const deleteCloudProjectResponseSchema = z.object({ ok: z.literal(true) });

const listCloudProjectVersionsResponseSchema = z.object({
  ok: z.literal(true),
  versions: z.array(syncedProjectVersionSummarySchema),
  auditEvents: z.array(syncedProjectAuditEventSchema),
});

const restoreCloudProjectVersionResponseSchema = z.object({
  ok: z.literal(true),
  project: z.object({ id: z.string(), updatedAt: z.string() }),
});

type ProjectSyncResponse<T extends z.ZodType> = z.infer<T>;
export type SyncedProjectSummary = z.infer<typeof syncedProjectSummarySchema>;
export type SyncedProjectReviewSummary = ProjectReviewSummary;
export type { SyncedProjectAuditEvent, SyncedProjectVersionSummary };

export async function listCloudProjects() {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl("/api/projects"), { cache: "no-store", credentials: "include" });
  return (await readProjectResponse(response, listCloudProjectsResponseSchema)).projects;
}

export async function saveCloudProject(project: EditorProject, mediaAssets: MediaAsset[], sync?: ProjectSyncConflictPolicy) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl("/api/projects"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      project,
      mediaAssets: mediaAssets.map((asset) => ({ ...asset, objectUrl: undefined })),
      sync,
    }),
  });
  return (await readProjectResponse(response, saveCloudProjectResponseSchema)).project;
}

export async function loadCloudProject(id: string) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/projects/${id}`), { cache: "no-store", credentials: "include" });
  return (await readProjectResponse(response, loadCloudProjectResponseSchema)).project satisfies SyncedProjectPayload;
}

export async function deleteCloudProject(id: string) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/projects/${id}`), { method: "DELETE", credentials: "include" });
  await readProjectResponse(response, deleteCloudProjectResponseSchema);
}

export async function listCloudProjectVersions(id: string) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/projects/${id}/versions`), { cache: "no-store", credentials: "include" });
  return readProjectResponse(response, listCloudProjectVersionsResponseSchema);
}

export async function restoreCloudProjectVersion(id: string, versionId: string) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/projects/${id}/versions`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ versionId }),
  });
  return (await readProjectResponse(response, restoreCloudProjectVersionResponseSchema)).project;
}

export function cloudSummaryToLocalRecord(summary: SyncedProjectSummary): LocalProjectRecord {
  return {
    id: summary.id,
    title: summary.title,
    aspectRatio: summary.aspectRatio,
    duration: summary.duration,
    layerCount: summary.layerCount,
    mediaCount: summary.mediaCount,
    updatedAt: summary.updatedAt,
    createdAt: summary.createdAt,
    project: {
      formatVersion: 1,
      id: summary.id,
      title: summary.title,
      aspectRatio: summary.aspectRatio,
      width: 1920,
      height: 1080,
      duration: summary.duration,
      fps: 30,
      background: "#0a0a0a",
      layers: [],
      updatedAt: summary.updatedAt,
    },
    mediaAssets: [],
  };
}

async function readProjectResponse<T extends z.ZodType>(response: Response, schema: T): Promise<ProjectSyncResponse<T>> {
  const data = await readResponseJson(response);
  if (!response.ok || !isOk(data)) {
    const conflict = parseProjectSyncConflict(data);
    if (conflict) throw new ProjectSyncConflictError(conflict);
    throw new Error(projectSyncFailureReason(data));
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Project sync returned invalid data.");
  }

  return parsed.data;
}

function parseProjectSyncConflict(data: unknown): ProjectSyncConflictDetails | null {
  const parsed = projectSyncConflictResponseSchema.safeParse(data);
  return parsed.success ? parsed.data.conflict : null;
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function projectSyncFailureReason(data: unknown) {
  const reason = isError(data) ? data.reason : "Project sync failed.";
  return reason;
}

function isOk(value: unknown): value is { ok: true } {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true;
}

function isError(value: unknown): value is { reason: string } {
  return typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string";
}
