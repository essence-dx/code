import { z } from "zod";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import { mediaAssetSchema, projectSchema, sanitizeMediaAssets, syncedProjectPayloadSchema } from "@/lib/projects/project-sync-schema";

export interface LocalProjectRecord {
  id: string;
  title: string;
  aspectRatio: string;
  duration: number;
  layerCount: number;
  mediaCount: number;
  updatedAt: string;
  createdAt: string;
  project: EditorProject;
  mediaAssets: MediaAsset[];
}

export interface LocalProjectSnapshotRecord {
  id: string;
  projectId: string;
  label: string;
  title: string;
  duration: number;
  layerCount: number;
  mediaCount: number;
  createdAt: string;
  project: EditorProject;
  mediaAssets: MediaAsset[];
}

export interface LocalProjectTrashRecord {
  id: string;
  title: string;
  aspectRatio: string;
  duration: number;
  layerCount: number;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  project: EditorProject;
  mediaAssets: MediaAsset[];
}

const localProjectRecordSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(160),
  aspectRatio: z.string().min(1).max(16),
  duration: z.number().finite().min(0).max(7200),
  layerCount: z.number().finite().int().min(0).max(1000),
  mediaCount: z.number().finite().int().min(0).max(1000),
  updatedAt: z.string().min(1).max(80),
  createdAt: z.string().min(1).max(80),
  project: projectSchema,
  mediaAssets: z.array(mediaAssetSchema),
}) satisfies z.ZodType<LocalProjectRecord>;

const localProjectSnapshotRecordSchema = z.object({
  id: z.string().min(1).max(200),
  projectId: z.string().min(1).max(160),
  label: z.string().min(1).max(160),
  title: z.string().min(1).max(160),
  duration: z.number().finite().min(0).max(7200),
  layerCount: z.number().finite().int().min(0).max(1000),
  mediaCount: z.number().finite().int().min(0).max(1000),
  createdAt: z.string().min(1).max(80),
  project: projectSchema,
  mediaAssets: z.array(mediaAssetSchema),
}) satisfies z.ZodType<LocalProjectSnapshotRecord>;

const localProjectTrashRecordSchema = localProjectRecordSchema.extend({
  deletedAt: z.string().min(1).max(80),
}) satisfies z.ZodType<LocalProjectTrashRecord>;

export function createLocalProjectRecord({
  project,
  mediaAssets,
  createdAt,
  updatedAt,
}: {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  createdAt: string;
  updatedAt: string;
}) {
  const payload = syncedProjectPayloadSchema.parse({
    project: { ...project, updatedAt },
    mediaAssets: sanitizeMediaAssets(mediaAssets),
  });

  return localProjectRecordSchema.parse({
    id: payload.project.id,
    title: payload.project.title,
    aspectRatio: payload.project.aspectRatio,
    duration: payload.project.duration,
    layerCount: payload.project.layers.length,
    mediaCount: payload.mediaAssets.length,
    createdAt,
    updatedAt,
    project: payload.project,
    mediaAssets: payload.mediaAssets,
  });
}

export function createLocalProjectSnapshotRecord({
  project,
  mediaAssets,
  label,
  createdAt,
}: {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  label?: string;
  createdAt: string;
}) {
  const payload = syncedProjectPayloadSchema.parse({
    project: { ...project, updatedAt: createdAt },
    mediaAssets: sanitizeMediaAssets(mediaAssets),
  });

  return localProjectSnapshotRecordSchema.parse({
    id: `snapshot_${crypto.randomUUID()}`,
    projectId: payload.project.id,
    label: label?.trim() || "Manual checkpoint",
    title: payload.project.title,
    duration: payload.project.duration,
    layerCount: payload.project.layers.length,
    mediaCount: payload.mediaAssets.length,
    createdAt,
    project: payload.project,
    mediaAssets: payload.mediaAssets,
  });
}

export function createLocalProjectTrashRecord(record: LocalProjectRecord, deletedAt: string) {
  return localProjectTrashRecordSchema.parse({
    ...record,
    deletedAt,
  });
}

export function parseLocalProjectRecord(value: unknown) {
  const parsed = localProjectRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseLocalProjectSnapshotRecord(value: unknown) {
  const parsed = localProjectSnapshotRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseLocalProjectTrashRecord(value: unknown) {
  const parsed = localProjectTrashRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
