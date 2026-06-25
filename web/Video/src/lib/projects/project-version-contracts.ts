import { z } from "zod";

export const syncedProjectVersionSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  label: z.string(),
  action: z.enum(["sync", "restore"]),
  layerCount: z.number().finite().int().min(0),
  mediaCount: z.number().finite().int().min(0),
  duration: z.number().finite().min(0),
  createdAt: z.string(),
});

export const syncedProjectAuditEventSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  action: z.enum(["sync", "restore", "delete"]),
  detail: z.string(),
  createdAt: z.string(),
});

export const restoreSyncedProjectVersionInputSchema = z.object({
  versionId: z.string().trim().min(1).max(180),
});

export type SyncedProjectVersionSummary = z.infer<typeof syncedProjectVersionSummarySchema>;
export type SyncedProjectAuditEvent = z.infer<typeof syncedProjectAuditEventSchema>;
export type RestoreSyncedProjectVersionInput = z.infer<typeof restoreSyncedProjectVersionInputSchema>;
