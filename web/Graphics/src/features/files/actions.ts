// "use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import {
  designFile,
  designFileCollaborator,
  designFileShare,
  designFileVersion,
} from "@/db/schema";
import { createStarterDocument } from "@/features/editor/default-document";
import {
  appendCommentNotificationDeliveries,
  getCommentNotificationEvents,
  renderCommentNotificationEmail,
} from "@/features/editor/comment-notifications";
import {
  mergeCollaborationRoomSnapshots,
  toCollaborationRoomSnapshot,
  toDesignCollaborationRoomState,
} from "@/features/editor/collaboration-room-state";
import { exportDocumentToSvg } from "@/features/editor/exporters/svg-exporter";
import type {
  DesignActivityEvent,
  DesignBranchMergeIntent,
  DesignBranchMetadata,
  DesignCommentNotificationDelivery,
  DesignDocument,
} from "@/features/editor/types";
import {
  getFileAccessForUser,
  requireFileAccess,
  requireOwnedFile,
} from "@/features/files/access-control";
import { getRequiredUser } from "@/features/files/current-user";
import {
  canEditFile,
  normalizeCollaboratorRole,
  normalizeSharePermissionPreset,
  sharePermissionPresetSchema,
  sharePresetConfig,
  type FileAccessRole,
  type SharePermissionPreset,
} from "@/features/files/permissions";
import { getWorkspacePolicySettingsFromDb } from "@/features/admin/workspace-policy-data";
import { applyWorkspaceSharePolicy } from "@/features/admin/workspace-policy";
import { sendBrevoEmail } from "@/lib/brevo-email";

const saveDesignFileSchema = z.object({
  fileId: z.string().min(1),
  name: z.string().min(1).max(120),
  document: z.custom<DesignDocument>(),
});

const fileIdSchema = z.object({
  fileId: z.string().min(1),
});

const createShareLinkSchema = fileIdSchema.extend({
  preset: sharePermissionPresetSchema.default("handoff"),
});

const renameDesignFileSchema = fileIdSchema.extend({
  name: z.string().trim().min(1).max(120),
});

const designFileScopeValues = ["private", "team", "public"] as const;

export type DesignFileScope = (typeof designFileScopeValues)[number];

const updateDesignFileLocationSchema = fileIdSchema.extend({
  projectName: z.string().trim().min(1).max(80),
  scope: z.enum(designFileScopeValues),
  teamName: z.string().trim().min(1).max(80),
});

const createNamedVersionSchema = fileIdSchema.extend({
  name: z.string().trim().min(1).max(120),
  document: z.custom<DesignDocument>(),
});

const restoreVersionSchema = z.object({
  versionId: z.string().min(1),
});

const designBranchMergeIntentValues = [
  "exploration",
  "review",
  "hotfix",
  "release-candidate",
] as const satisfies readonly DesignBranchMergeIntent[];

const branchVersionSchema = restoreVersionSchema.extend({
  branchName: z.string().trim().min(1).max(120).optional(),
  mergeIntent: z.enum(designBranchMergeIntentValues).default("exploration"),
});

const shareIdSchema = z.object({
  shareId: z.string().min(1),
});

const updateShareExpirySchema = shareIdSchema.extend({
  expiresInDays: z.number().int().positive().max(365).nullable(),
});

export type DesignFileSummary = {
  id: string;
  name: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  trashedAt: string | null;
  favorite: boolean;
  accessRole: FileAccessRole;
  scope: string;
  teamName: string;
  projectName: string;
  thumbnailSvg: string;
  layerCount: number;
  pageCount: number;
  commentCount: number;
  openCommentCount: number;
  readyForDevCount: number;
  prototypeHotspotCount: number;
};

export type DesignFileVersionSummary = {
  id: string;
  name: string;
  document: DesignDocument;
  createdAt: string;
};

export type DesignFileShareSummary = {
  id: string;
  token: string;
  permissionPreset: SharePermissionPreset;
  accessLevel: string;
  allowComments: boolean;
  allowDownload: boolean;
  sharePath: string;
  createdAt: string;
  expiresAt: string | null;
  disabledAt: string | null;
};

export async function getEditorBootstrap(requestedFileId?: string) {
  const user = await getRequiredUser();
  const db = getDb();

  const ownedFiles = await db
    .select()
    .from(designFile)
    .where(eq(designFile.ownerId, user.id))
    .orderBy(desc(designFile.updatedAt))
    .limit(80);
  const collaborationRows = await db
    .select({
      id: designFile.id,
      ownerId: designFile.ownerId,
      name: designFile.name,
      document: designFile.document,
      scope: designFile.scope,
      teamName: designFile.teamName,
      projectName: designFile.projectName,
      favorite: designFile.favorite,
      lastOpenedAt: designFile.lastOpenedAt,
      trashedAt: designFile.trashedAt,
      createdAt: designFile.createdAt,
      updatedAt: designFile.updatedAt,
      role: designFileCollaborator.role,
    })
    .from(designFileCollaborator)
    .innerJoin(designFile, eq(designFileCollaborator.fileId, designFile.id))
    .where(eq(designFileCollaborator.userId, user.id))
    .orderBy(desc(designFile.updatedAt))
    .limit(80);
  const files = [
    ...ownedFiles.map((file) => ({
      ...file,
      accessRole: "owner" as const,
    })),
    ...collaborationRows.map((row) => ({
      ...row,
      accessRole: normalizeCollaboratorRole(row.role),
    })),
  ].sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime());
  const activeFiles = files.filter((file) => !file.trashedAt);

  if (activeFiles.length === 0) {
    const starter = await createOwnedDesignFile(user.id, user.name);
    const starterWithAccess = {
      ...starter,
      accessRole: "owner" as const,
    };

    return {
      activeFile: starterWithAccess,
      files: [toSummary(starterWithAccess), ...files.map(toSummary)],
      versions: [],
    };
  }

  const activeFile =
    activeFiles.find((file) => file.id === requestedFileId) ?? activeFiles[0];

  await db
    .update(designFile)
    .set({ lastOpenedAt: new Date() })
    .where(eq(designFile.id, activeFile.id));

  return {
    activeFile,
    files: files.map(toSummary),
    versions: await listVersionsForFile(activeFile.id),
  };
}

export async function createDesignFile() {
  const user = await getRequiredUser();
  const file = await createOwnedDesignFile(user.id, user.name);

  return {
    id: file.id,
  };
}

async function createOwnedDesignFile(ownerId: string, ownerName: string) {
  const db = getDb();
  const count = await db
    .select({ id: designFile.id })
    .from(designFile)
    .where(eq(designFile.ownerId, ownerId));

  const fileNumber = count.length + 1;
  const name = fileNumber === 1 ? "Untitled design" : `Untitled design ${fileNumber}`;
  const now = new Date();
  const file = {
    id: nanoid(),
    ownerId,
    name,
    document: createStarterDocument(ownerName),
    scope: "private",
    teamName: "Personal",
    projectName: "Drafts",
    favorite: false,
    lastOpenedAt: now,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(designFile).values(file);

  return file;
}

function mergeSavedDocumentCollaborationRoom(
  previousDocument: DesignDocument,
  nextDocument: DesignDocument,
): DesignDocument {
  const previousSnapshot = toCollaborationRoomSnapshot(
    previousDocument.collaborationRoom,
  );
  const nextSnapshot = toCollaborationRoomSnapshot(nextDocument.collaborationRoom);
  const mergedSnapshot = mergeCollaborationRoomSnapshots(
    previousSnapshot,
    nextSnapshot,
  );

  if (
    mergedSnapshot.chatMessages.length === 0 &&
    mergedSnapshot.presenceEvents.length === 0
  ) {
    return nextDocument;
  }

  return {
    ...nextDocument,
    collaborationRoom: toDesignCollaborationRoomState(
      mergedSnapshot,
      mergedSnapshot.updatedAt ?? new Date().toISOString(),
    ),
  };
}

function toSummary(file: {
  id: string;
  name: string;
  updatedAt: Date;
  lastOpenedAt: Date | null;
  trashedAt: Date | null;
  favorite: boolean;
  accessRole: FileAccessRole;
  scope: string;
  teamName: string;
  projectName: string;
  document: DesignDocument;
}): DesignFileSummary {
  const layers = file.document.pages.flatMap((page) => page.layers);
  const comments = file.document.pages.flatMap((page) => page.comments ?? []);

  return {
    id: file.id,
    name: file.name,
    updatedAt: file.updatedAt.toISOString(),
    lastOpenedAt: file.lastOpenedAt?.toISOString() ?? null,
    trashedAt: file.trashedAt?.toISOString() ?? null,
    favorite: file.favorite,
    accessRole: file.accessRole,
    scope: file.scope,
    teamName: file.teamName,
    projectName: file.projectName,
    thumbnailSvg: exportDocumentToSvg(file.document),
    layerCount: layers.length,
    pageCount: file.document.pages.length,
    commentCount: comments.length,
    openCommentCount: comments.filter((comment) => !comment.resolved).length,
    readyForDevCount: layers.filter((layer) => layer.readyForDev).length,
    prototypeHotspotCount: layers.filter((layer) => layer.prototype).length,
  };
}

export async function getOrCreateStarterFile() {
  const bootstrap = await getEditorBootstrap();

  return bootstrap.activeFile;
}

export async function getDesignFileById(fileId: string) {
  const user = await getRequiredUser();
  const access = await getFileAccessForUser(fileId, user.id);

  if (!access || access.file.trashedAt) {
    throw new Error("Design file not found.");
  }

  return access.file;
}

export async function saveDesignFile(input: unknown) {
  const user = await getRequiredUser();
  const parsed = saveDesignFileSchema.parse(input);
  const access = await requireFileAccess(
    parsed.fileId,
    user.id,
    canEditFile,
    "Editor access is required to save this file.",
  );
  const nextDocument = mergeSavedDocumentCollaborationRoom(
    access.file.document,
    parsed.document,
  );
  const notificationEvents = getCommentNotificationEvents({
    previousDocument: access.file.document,
    nextDocument,
    actorName: user.name || user.email,
    actorEmail: user.email.toLowerCase(),
    fileName: parsed.name,
    fileUrl: getEditorFileUrl(parsed.fileId),
  });

  await getDb()
    .update(designFile)
    .set({
      name: parsed.name,
      document: nextDocument,
      updatedAt: new Date(),
    })
    .where(
      eq(designFile.id, parsed.fileId),
    );

  const deliveryRecords = await deliverCommentNotifications(notificationEvents);

  if (deliveryRecords.length > 0) {
    await getDb()
      .update(designFile)
      .set({
        document: appendCommentNotificationDeliveries(
          nextDocument,
          deliveryRecords,
        ),
        updatedAt: new Date(),
      })
      .where(
        eq(designFile.id, parsed.fileId),
      );
  }

  return { ok: true };
}

export async function renameDesignFile(input: unknown) {
  const user = await getRequiredUser();
  const parsed = renameDesignFileSchema.parse(input);
  await requireOwnedFile(parsed.fileId, user.id);

  await getDb()
    .update(designFile)
    .set({
      name: parsed.name,
      updatedAt: new Date(),
    })
    .where(
      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),
    );

  return { ok: true };
}

export async function updateDesignFileLocation(input: unknown) {
  const user = await getRequiredUser();
  const parsed = updateDesignFileLocationSchema.parse(input);
  await requireOwnedFile(parsed.fileId, user.id);

  await getDb()
    .update(designFile)
    .set({
      projectName: parsed.projectName,
      scope: parsed.scope,
      teamName: parsed.teamName,
      updatedAt: new Date(),
    })
    .where(
      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),
    );

  return { ok: true };
}

export async function duplicateDesignFile(input: unknown) {
  const user = await getRequiredUser();
  const parsed = fileIdSchema.parse(input);
  const original = await getDesignFileById(parsed.fileId);
  const now = new Date();
  const copy = {
    id: nanoid(),
    ownerId: user.id,
    name: `${original.name} Copy`,
    scope: "private",
    teamName: original.teamName,
    projectName: original.projectName,
    favorite: false,
    lastOpenedAt: now,
    trashedAt: null,
    document: {
      ...original.document,
      updatedAt: now.toISOString(),
    },
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(designFile).values(copy);

  return { id: copy.id };
}

export async function deleteDesignFile(input: unknown) {
  const user = await getRequiredUser();
  const parsed = fileIdSchema.parse(input);
  const db = getDb();
  await requireOwnedFile(parsed.fileId, user.id);

  await db
    .update(designFile)
    .set({
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),
    );

  const [nextFile] = await db
    .select({ id: designFile.id })
    .from(designFile)
    .where(and(eq(designFile.ownerId, user.id), isNull(designFile.trashedAt)))
    .orderBy(desc(designFile.updatedAt))
    .limit(1);

  return { nextFileId: nextFile?.id ?? null };
}

export async function restoreDesignFile(input: unknown) {
  const user = await getRequiredUser();
  const parsed = fileIdSchema.parse(input);
  const access = await getFileAccessForUser(parsed.fileId, user.id);

  if (!access || access.role !== "owner") {
    throw new Error("File owner access is required.");
  }

  await getDb()
    .update(designFile)
    .set({
      trashedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),
    );

  return { id: parsed.fileId };
}

export async function toggleFavoriteDesignFile(input: unknown) {
  const user = await getRequiredUser();
  const parsed = fileIdSchema.parse(input);
  const db = getDb();
  await requireOwnedFile(parsed.fileId, user.id);
  const [file] = await db
    .select({ favorite: designFile.favorite })
    .from(designFile)
    .where(and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)))
    .limit(1);

  if (!file) {
    throw new Error("Design file not found.");
  }

  await db
    .update(designFile)
    .set({
      favorite: !file.favorite,
      updatedAt: new Date(),
    })
    .where(
      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),
    );

  return { favorite: !file.favorite };
}

export async function createNamedVersion(input: unknown) {
  const user = await getRequiredUser();
  const parsed = createNamedVersionSchema.parse(input);
  const db = getDb();
  const access = await requireFileAccess(
    parsed.fileId,
    user.id,
    canEditFile,
    "Editor access is required to save a version.",
  );

  await db.insert(designFileVersion).values({
    id: nanoid(),
    fileId: parsed.fileId,
    ownerId: access.file.ownerId,
    name: parsed.name,
    document: parsed.document,
    createdAt: new Date(),
  });

  return { ok: true };
}

export async function createShareLink(input: unknown) {
  const user = await getRequiredUser();
  const parsed = createShareLinkSchema.parse(input);
  const db = getDb();
  await requireOwnedFile(parsed.fileId, user.id);
  const policy = await getWorkspacePolicySettingsFromDb(db);
  const sharePolicy = applyWorkspaceSharePolicy(parsed.preset, policy);

  const [existing] = await db
    .select()
    .from(designFileShare)
    .where(
      and(
        eq(designFileShare.fileId, parsed.fileId),
        eq(designFileShare.ownerId, user.id),
        eq(designFileShare.permissionPreset, parsed.preset),
        isNull(designFileShare.disabledAt),
      ),
    )
    .limit(1);

  if (existing) {
    return { token: existing.token, preset: parsed.preset };
  }

  const token = nanoid(32);

  await db.insert(designFileShare).values({
    id: nanoid(),
    fileId: parsed.fileId,
    ownerId: user.id,
    token,
    permissionPreset: parsed.preset,
    accessLevel: sharePolicy.accessLevel,
    allowComments: sharePolicy.allowComments,
    allowDownload: sharePolicy.allowDownload,
    createdAt: new Date(),
    expiresAt: sharePolicy.expiresAt,
    disabledAt: null,
  });

  return { token, preset: parsed.preset };
}

export async function listDesignFileShares(
  input: unknown,
): Promise<DesignFileShareSummary[]> {
  const user = await getRequiredUser();
  const parsed = fileIdSchema.parse(input);
  await requireOwnedFile(parsed.fileId, user.id);

  const rows = await getDb()
    .select()
    .from(designFileShare)
    .where(
      and(
        eq(designFileShare.fileId, parsed.fileId),
        eq(designFileShare.ownerId, user.id),
      ),
    )
    .orderBy(desc(designFileShare.createdAt));

  return rows.map((row) => {
    const permissionPreset = normalizeSharePermissionPreset(
      row.permissionPreset,
    );

    return {
      id: row.id,
      token: row.token,
      permissionPreset,
      accessLevel: sharePresetConfig[permissionPreset].accessLevel,
      allowComments: row.allowComments,
      allowDownload: row.allowDownload,
      sharePath: getSharePath(row.token, permissionPreset),
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      disabledAt: row.disabledAt?.toISOString() ?? null,
    };
  });
}

export async function revokeShareLink(input: unknown) {
  const user = await getRequiredUser();
  const parsed = shareIdSchema.parse(input);

  await getDb()
    .update(designFileShare)
    .set({ disabledAt: new Date() })
    .where(
      and(
        eq(designFileShare.id, parsed.shareId),
        eq(designFileShare.ownerId, user.id),
        isNull(designFileShare.disabledAt),
      ),
    );

  return { ok: true };
}

export async function updateShareLinkExpiry(input: unknown) {
  const user = await getRequiredUser();
  const parsed = updateShareExpirySchema.parse(input);
  const expiresAt = parsed.expiresInDays
    ? new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await getDb()
    .update(designFileShare)
    .set({ expiresAt })
    .where(
      and(
        eq(designFileShare.id, parsed.shareId),
        eq(designFileShare.ownerId, user.id),
        isNull(designFileShare.disabledAt),
      ),
    );

  return { ok: true };
}

export async function revokeShareLinks(input: unknown) {
  const user = await getRequiredUser();
  const parsed = fileIdSchema.parse(input);
  await requireOwnedFile(parsed.fileId, user.id);

  await getDb()
    .update(designFileShare)
    .set({ disabledAt: new Date() })
    .where(
      and(
        eq(designFileShare.fileId, parsed.fileId),
        eq(designFileShare.ownerId, user.id),
        isNull(designFileShare.disabledAt),
      ),
    );

  return { ok: true };
}

export async function getSharedDesignFile(token: string) {
  const [shared] = await getDb()
    .select({
      fileId: designFile.id,
      name: designFile.name,
      document: designFile.document,
      permissionPreset: designFileShare.permissionPreset,
      accessLevel: designFileShare.accessLevel,
      allowComments: designFileShare.allowComments,
      allowDownload: designFileShare.allowDownload,
      expiresAt: designFileShare.expiresAt,
    })
    .from(designFileShare)
    .innerJoin(designFile, eq(designFileShare.fileId, designFile.id))
    .where(
      and(
        eq(designFileShare.token, token),
        isNull(designFileShare.disabledAt),
        isNull(designFile.trashedAt),
      ),
    )
    .limit(1);

  if (!shared) {
    return null;
  }

  if (shared.expiresAt && shared.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const permissionPreset = normalizeSharePermissionPreset(
    shared.permissionPreset,
  );

  return {
    ...shared,
    permissionPreset,
    accessLevel: sharePresetConfig[permissionPreset].accessLevel,
  };
}

export async function restoreDesignFileVersion(input: unknown) {
  const user = await getRequiredUser();
  const parsed = restoreVersionSchema.parse(input);
  const db = getDb();
  const [version] = await db
    .select()
    .from(designFileVersion)
    .where(
      eq(designFileVersion.id, parsed.versionId),
    )
    .limit(1);

  if (!version) {
    throw new Error("Version not found.");
  }
  await requireFileAccess(
    version.fileId,
    user.id,
    canEditFile,
    "Editor access is required to restore a version.",
  );

  await db
    .update(designFile)
    .set({
      document: {
        ...version.document,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(
      eq(designFile.id, version.fileId),
    );

  return { fileId: version.fileId };
}

export async function branchDesignFileVersion(input: unknown) {
  const user = await getRequiredUser();
  const parsed = branchVersionSchema.parse(input);
  const db = getDb();
  const [version] = await db
    .select({
      versionId: designFileVersion.id,
      fileId: designFileVersion.fileId,
      versionName: designFileVersion.name,
      document: designFileVersion.document,
      fileName: designFile.name,
    })
    .from(designFileVersion)
    .innerJoin(designFile, eq(designFile.id, designFileVersion.fileId))
    .where(
      and(
        eq(designFileVersion.id, parsed.versionId),
        isNull(designFile.trashedAt),
      ),
    )
    .limit(1);

  if (!version) {
    throw new Error("Version not found.");
  }
  await requireFileAccess(
    version.fileId,
    user.id,
    () => true,
    "File access is required to branch a version.",
  );

  const now = new Date();
  const createdAt = now.toISOString();
  const branchFileId = nanoid();
  const branchRecordId = nanoid();
  const restorePointVersionId = nanoid();
  const branchName =
    parsed.branchName?.trim() ||
    `${version.fileName} Branch - ${version.versionName}`;
  const restorePointName = `Branch restore point - ${version.versionName}`;
  const metadata = {
    id: branchRecordId,
    branchFileId,
    branchName,
    status: "active",
    mergeIntent: parsed.mergeIntent,
    sourceFileId: version.fileId,
    sourceFileName: version.fileName,
    sourceVersionId: version.versionId,
    sourceVersionName: version.versionName,
    restorePointVersionId,
    restorePointName,
    createdByName: user.name,
    createdByEmail: user.email.toLowerCase(),
    createdAt,
    updatedAt: createdAt,
    targetFileId: version.fileId,
    targetFileName: version.fileName,
    mergeNotes: null,
  } satisfies DesignBranchMetadata;
  const branchActivity = {
    id: nanoid(),
    kind: "branch",
    actorName: user.name,
    actorEmail: user.email.toLowerCase(),
    label: "Created design branch",
    detail: `${getBranchMergeIntentLabel(parsed.mergeIntent)} from ${version.fileName} / ${version.versionName}`,
    targetId: version.fileId,
    createdAt,
  } satisfies DesignActivityEvent;
  const branchDocument = {
    ...version.document,
    branchMetadata: metadata,
    activityEvents: [
      branchActivity,
      ...(version.document.activityEvents ?? []),
    ].slice(0, 180),
    updatedAt: createdAt,
  } satisfies DesignDocument;
  const branch = {
    id: branchFileId,
    ownerId: user.id,
    name: branchName,
    scope: "private",
    teamName: "Personal",
    projectName: "Drafts",
    favorite: false,
    lastOpenedAt: now,
    trashedAt: null,
    document: branchDocument,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(designFile).values(branch);
  await db.insert(designFileVersion).values({
    id: restorePointVersionId,
    fileId: branchFileId,
    ownerId: user.id,
    name: restorePointName,
    document: branchDocument,
    createdAt: now,
  });

  return { fileId: branch.id, branchId: branchRecordId };
}

function getBranchMergeIntentLabel(intent: DesignBranchMergeIntent) {
  if (intent === "review") {
    return "Review branch";
  }

  if (intent === "hotfix") {
    return "Hotfix branch";
  }

  if (intent === "release-candidate") {
    return "Release candidate branch";
  }

  return "Exploration branch";
}

async function deliverCommentNotifications(
  events: ReturnType<typeof getCommentNotificationEvents>,
) {
  if (events.length === 0) {
    return [];
  }

  const now = new Date().toISOString();
  const deliveries = await Promise.allSettled(
    events.map((event) => {
      const email = renderCommentNotificationEmail(event);

      return sendBrevoEmail({
        to: event.recipientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    }),
  );

  return deliveries.map<DesignCommentNotificationDelivery>((delivery, index) => {
    const event = events[index];

    if (delivery.status === "rejected") {
      console.error(
        "Comment notification email failed",
        event?.recipientEmail,
        delivery.reason,
      );
    }

    return {
      id: nanoid(),
      eventId: event.id,
      kind: event.kind,
      recipientEmail: event.recipientEmail,
      actorName: event.actorName,
      fileName: event.fileName,
      pageName: event.pageName,
      commentId: event.commentId,
      replyId: event.replyId,
      status: delivery.status === "fulfilled" ? "sent" : "failed",
      reason:
        delivery.status === "rejected"
          ? getDeliveryFailureReason(delivery.reason)
          : undefined,
      createdAt: now,
      deliveredAt:
        delivery.status === "fulfilled" ? new Date().toISOString() : undefined,
    };
  });
}

function getDeliveryFailureReason(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message;
  }

  return typeof reason === "string" ? reason : "Delivery failed.";
}

function getEditorFileUrl(fileId: string) {
  const configuredUrl =
    getNormalizedURL(process.env.NEXT_PUBLIC_APP_URL) ??
    getNormalizedURL(
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ) ??
    "";

  return configuredUrl ? `${configuredUrl}/?file=${fileId}` : `/?file=${fileId}`;
}

function getNormalizedURL(value: string | undefined) {
  return (
    value?.replace(/[\uFEFF\u200B-\u200F\u2060]/g, "").trim().replace(/\/+$/, "") ||
    undefined
  );
}

function getSharePath(token: string, preset: SharePermissionPreset) {
  return preset === "prototype" ? `/share/${token}/prototype` : `/share/${token}`;
}

async function listVersionsForFile(fileId: string) {
  const versions = await getDb()
    .select({
      id: designFileVersion.id,
      name: designFileVersion.name,
      document: designFileVersion.document,
      createdAt: designFileVersion.createdAt,
    })
    .from(designFileVersion)
    .where(
      eq(designFileVersion.fileId, fileId),
    )
    .orderBy(desc(designFileVersion.createdAt))
    .limit(20);

  return versions.map((version) => ({
    id: version.id,
    name: version.name,
    document: version.document,
    createdAt: version.createdAt.toISOString(),
  }));
}

