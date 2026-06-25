import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-db-client-ts-b11a4f30c3f08fac.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-db-schema-ts-24b183fcc50e5ffb.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-workspace-policy-ts-1328e128ed00d73c.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-workspace-policy-data-ts-a401a257eb083d93.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-collaboration-room-state-ts-3ff3220a5bfda107.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-comment-notifications-ts-900c288da3d37028.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-features-editor-default-document-ts-af4d71354b0b6430.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-features-files-access-control-ts-26b077d1507cb8c5.mjs";
import { dxSourceModule as dep9, dxRuntimeExports as dep9Runtime } from "./src-features-files-current-user-ts-38880e1486ff6baa.mjs";
import { dxSourceModule as dep10, dxRuntimeExports as dep10Runtime } from "./src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs";
import { dxSourceModule as dep11, dxRuntimeExports as dep11Runtime } from "./src-lib-brevo-email-ts-8d89dcbf81714307.mjs";
import { dxSourceModule as dep12, dxRuntimeExports as dep12Runtime } from "./src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs";
import { dxSourceModule as dep13, dxRuntimeExports as dep13Runtime } from "./src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs";
import { dxSourceModule as dep14, dxRuntimeExports as dep14Runtime } from "./src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs";
export const dxSourceText = "\"use server\";\n\nimport { and, desc, eq, isNull } from \"drizzle-orm\";\nimport { nanoid } from \"nanoid\";\nimport { z } from \"zod\";\nimport { getDb } from \"@/db/client\";\nimport {\n  designFile,\n  designFileCollaborator,\n  designFileShare,\n  designFileVersion,\n} from \"@/db/schema\";\nimport { createStarterDocument } from \"@/features/editor/default-document\";\nimport {\n  appendCommentNotificationDeliveries,\n  getCommentNotificationEvents,\n  renderCommentNotificationEmail,\n} from \"@/features/editor/comment-notifications\";\nimport {\n  mergeCollaborationRoomSnapshots,\n  toCollaborationRoomSnapshot,\n  toDesignCollaborationRoomState,\n} from \"@/features/editor/collaboration-room-state\";\nimport { exportDocumentToSvg } from \"@/features/editor/exporters/svg-exporter\";\nimport type {\n  DesignActivityEvent,\n  DesignBranchMergeIntent,\n  DesignBranchMetadata,\n  DesignCommentNotificationDelivery,\n  DesignDocument,\n} from \"@/features/editor/types\";\nimport {\n  getFileAccessForUser,\n  requireFileAccess,\n  requireOwnedFile,\n} from \"@/features/files/access-control\";\nimport { getRequiredUser } from \"@/features/files/current-user\";\nimport {\n  canEditFile,\n  normalizeCollaboratorRole,\n  normalizeSharePermissionPreset,\n  sharePermissionPresetSchema,\n  sharePresetConfig,\n  type FileAccessRole,\n  type SharePermissionPreset,\n} from \"@/features/files/permissions\";\nimport { getWorkspacePolicySettingsFromDb } from \"@/features/admin/workspace-policy-data\";\nimport { applyWorkspaceSharePolicy } from \"@/features/admin/workspace-policy\";\nimport { sendBrevoEmail } from \"@/lib/brevo-email\";\n\nconst saveDesignFileSchema = z.object({\n  fileId: z.string().min(1),\n  name: z.string().min(1).max(120),\n  document: z.custom<DesignDocument>(),\n});\n\nconst fileIdSchema = z.object({\n  fileId: z.string().min(1),\n});\n\nconst createShareLinkSchema = fileIdSchema.extend({\n  preset: sharePermissionPresetSchema.default(\"handoff\"),\n});\n\nconst renameDesignFileSchema = fileIdSchema.extend({\n  name: z.string().trim().min(1).max(120),\n});\n\nconst designFileScopeValues = [\"private\", \"team\", \"public\"] as const;\n\nexport type DesignFileScope = (typeof designFileScopeValues)[number];\n\nconst updateDesignFileLocationSchema = fileIdSchema.extend({\n  projectName: z.string().trim().min(1).max(80),\n  scope: z.enum(designFileScopeValues),\n  teamName: z.string().trim().min(1).max(80),\n});\n\nconst createNamedVersionSchema = fileIdSchema.extend({\n  name: z.string().trim().min(1).max(120),\n  document: z.custom<DesignDocument>(),\n});\n\nconst restoreVersionSchema = z.object({\n  versionId: z.string().min(1),\n});\n\nconst designBranchMergeIntentValues = [\n  \"exploration\",\n  \"review\",\n  \"hotfix\",\n  \"release-candidate\",\n] as const satisfies readonly DesignBranchMergeIntent[];\n\nconst branchVersionSchema = restoreVersionSchema.extend({\n  branchName: z.string().trim().min(1).max(120).optional(),\n  mergeIntent: z.enum(designBranchMergeIntentValues).default(\"exploration\"),\n});\n\nconst shareIdSchema = z.object({\n  shareId: z.string().min(1),\n});\n\nconst updateShareExpirySchema = shareIdSchema.extend({\n  expiresInDays: z.number().int().positive().max(365).nullable(),\n});\n\nexport type DesignFileSummary = {\n  id: string;\n  name: string;\n  updatedAt: string;\n  lastOpenedAt: string | null;\n  trashedAt: string | null;\n  favorite: boolean;\n  accessRole: FileAccessRole;\n  scope: string;\n  teamName: string;\n  projectName: string;\n  thumbnailSvg: string;\n  layerCount: number;\n  pageCount: number;\n  commentCount: number;\n  openCommentCount: number;\n  readyForDevCount: number;\n  prototypeHotspotCount: number;\n};\n\nexport type DesignFileVersionSummary = {\n  id: string;\n  name: string;\n  document: DesignDocument;\n  createdAt: string;\n};\n\nexport type DesignFileShareSummary = {\n  id: string;\n  token: string;\n  permissionPreset: SharePermissionPreset;\n  accessLevel: string;\n  allowComments: boolean;\n  allowDownload: boolean;\n  sharePath: string;\n  createdAt: string;\n  expiresAt: string | null;\n  disabledAt: string | null;\n};\n\nexport async function getEditorBootstrap(requestedFileId?: string) {\n  const user = await getRequiredUser();\n  const db = getDb();\n\n  const ownedFiles = await db\n    .select()\n    .from(designFile)\n    .where(eq(designFile.ownerId, user.id))\n    .orderBy(desc(designFile.updatedAt))\n    .limit(80);\n  const collaborationRows = await db\n    .select({\n      id: designFile.id,\n      ownerId: designFile.ownerId,\n      name: designFile.name,\n      document: designFile.document,\n      scope: designFile.scope,\n      teamName: designFile.teamName,\n      projectName: designFile.projectName,\n      favorite: designFile.favorite,\n      lastOpenedAt: designFile.lastOpenedAt,\n      trashedAt: designFile.trashedAt,\n      createdAt: designFile.createdAt,\n      updatedAt: designFile.updatedAt,\n      role: designFileCollaborator.role,\n    })\n    .from(designFileCollaborator)\n    .innerJoin(designFile, eq(designFileCollaborator.fileId, designFile.id))\n    .where(eq(designFileCollaborator.userId, user.id))\n    .orderBy(desc(designFile.updatedAt))\n    .limit(80);\n  const files = [\n    ...ownedFiles.map((file) => ({\n      ...file,\n      accessRole: \"owner\" as const,\n    })),\n    ...collaborationRows.map((row) => ({\n      ...row,\n      accessRole: normalizeCollaboratorRole(row.role),\n    })),\n  ].sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime());\n  const activeFiles = files.filter((file) => !file.trashedAt);\n\n  if (activeFiles.length === 0) {\n    const starter = await createOwnedDesignFile(user.id, user.name);\n    const starterWithAccess = {\n      ...starter,\n      accessRole: \"owner\" as const,\n    };\n\n    return {\n      activeFile: starterWithAccess,\n      files: [toSummary(starterWithAccess), ...files.map(toSummary)],\n      versions: [],\n    };\n  }\n\n  const activeFile =\n    activeFiles.find((file) => file.id === requestedFileId) ?? activeFiles[0];\n\n  await db\n    .update(designFile)\n    .set({ lastOpenedAt: new Date() })\n    .where(eq(designFile.id, activeFile.id));\n\n  return {\n    activeFile,\n    files: files.map(toSummary),\n    versions: await listVersionsForFile(activeFile.id),\n  };\n}\n\nexport async function createDesignFile() {\n  const user = await getRequiredUser();\n  const file = await createOwnedDesignFile(user.id, user.name);\n\n  return {\n    id: file.id,\n  };\n}\n\nasync function createOwnedDesignFile(ownerId: string, ownerName: string) {\n  const db = getDb();\n  const count = await db\n    .select({ id: designFile.id })\n    .from(designFile)\n    .where(eq(designFile.ownerId, ownerId));\n\n  const fileNumber = count.length + 1;\n  const name = fileNumber === 1 ? \"Untitled design\" : `Untitled design ${fileNumber}`;\n  const now = new Date();\n  const file = {\n    id: nanoid(),\n    ownerId,\n    name,\n    document: createStarterDocument(ownerName),\n    scope: \"private\",\n    teamName: \"Personal\",\n    projectName: \"Drafts\",\n    favorite: false,\n    lastOpenedAt: now,\n    trashedAt: null,\n    createdAt: now,\n    updatedAt: now,\n  };\n\n  await db.insert(designFile).values(file);\n\n  return file;\n}\n\nfunction mergeSavedDocumentCollaborationRoom(\n  previousDocument: DesignDocument,\n  nextDocument: DesignDocument,\n): DesignDocument {\n  const previousSnapshot = toCollaborationRoomSnapshot(\n    previousDocument.collaborationRoom,\n  );\n  const nextSnapshot = toCollaborationRoomSnapshot(nextDocument.collaborationRoom);\n  const mergedSnapshot = mergeCollaborationRoomSnapshots(\n    previousSnapshot,\n    nextSnapshot,\n  );\n\n  if (\n    mergedSnapshot.chatMessages.length === 0 &&\n    mergedSnapshot.presenceEvents.length === 0\n  ) {\n    return nextDocument;\n  }\n\n  return {\n    ...nextDocument,\n    collaborationRoom: toDesignCollaborationRoomState(\n      mergedSnapshot,\n      mergedSnapshot.updatedAt ?? new Date().toISOString(),\n    ),\n  };\n}\n\nfunction toSummary(file: {\n  id: string;\n  name: string;\n  updatedAt: Date;\n  lastOpenedAt: Date | null;\n  trashedAt: Date | null;\n  favorite: boolean;\n  accessRole: FileAccessRole;\n  scope: string;\n  teamName: string;\n  projectName: string;\n  document: DesignDocument;\n}): DesignFileSummary {\n  const layers = file.document.pages.flatMap((page) => page.layers);\n  const comments = file.document.pages.flatMap((page) => page.comments ?? []);\n\n  return {\n    id: file.id,\n    name: file.name,\n    updatedAt: file.updatedAt.toISOString(),\n    lastOpenedAt: file.lastOpenedAt?.toISOString() ?? null,\n    trashedAt: file.trashedAt?.toISOString() ?? null,\n    favorite: file.favorite,\n    accessRole: file.accessRole,\n    scope: file.scope,\n    teamName: file.teamName,\n    projectName: file.projectName,\n    thumbnailSvg: exportDocumentToSvg(file.document),\n    layerCount: layers.length,\n    pageCount: file.document.pages.length,\n    commentCount: comments.length,\n    openCommentCount: comments.filter((comment) => !comment.resolved).length,\n    readyForDevCount: layers.filter((layer) => layer.readyForDev).length,\n    prototypeHotspotCount: layers.filter((layer) => layer.prototype).length,\n  };\n}\n\nexport async function getOrCreateStarterFile() {\n  const bootstrap = await getEditorBootstrap();\n\n  return bootstrap.activeFile;\n}\n\nexport async function getDesignFileById(fileId: string) {\n  const user = await getRequiredUser();\n  const access = await getFileAccessForUser(fileId, user.id);\n\n  if (!access || access.file.trashedAt) {\n    throw new Error(\"Design file not found.\");\n  }\n\n  return access.file;\n}\n\nexport async function saveDesignFile(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = saveDesignFileSchema.parse(input);\n  const access = await requireFileAccess(\n    parsed.fileId,\n    user.id,\n    canEditFile,\n    \"Editor access is required to save this file.\",\n  );\n  const nextDocument = mergeSavedDocumentCollaborationRoom(\n    access.file.document,\n    parsed.document,\n  );\n  const notificationEvents = getCommentNotificationEvents({\n    previousDocument: access.file.document,\n    nextDocument,\n    actorName: user.name || user.email,\n    actorEmail: user.email.toLowerCase(),\n    fileName: parsed.name,\n    fileUrl: getEditorFileUrl(parsed.fileId),\n  });\n\n  await getDb()\n    .update(designFile)\n    .set({\n      name: parsed.name,\n      document: nextDocument,\n      updatedAt: new Date(),\n    })\n    .where(\n      eq(designFile.id, parsed.fileId),\n    );\n\n  const deliveryRecords = await deliverCommentNotifications(notificationEvents);\n\n  if (deliveryRecords.length > 0) {\n    await getDb()\n      .update(designFile)\n      .set({\n        document: appendCommentNotificationDeliveries(\n          nextDocument,\n          deliveryRecords,\n        ),\n        updatedAt: new Date(),\n      })\n      .where(\n        eq(designFile.id, parsed.fileId),\n      );\n  }\n\n  return { ok: true };\n}\n\nexport async function renameDesignFile(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = renameDesignFileSchema.parse(input);\n  await requireOwnedFile(parsed.fileId, user.id);\n\n  await getDb()\n    .update(designFile)\n    .set({\n      name: parsed.name,\n      updatedAt: new Date(),\n    })\n    .where(\n      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),\n    );\n\n  return { ok: true };\n}\n\nexport async function updateDesignFileLocation(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = updateDesignFileLocationSchema.parse(input);\n  await requireOwnedFile(parsed.fileId, user.id);\n\n  await getDb()\n    .update(designFile)\n    .set({\n      projectName: parsed.projectName,\n      scope: parsed.scope,\n      teamName: parsed.teamName,\n      updatedAt: new Date(),\n    })\n    .where(\n      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),\n    );\n\n  return { ok: true };\n}\n\nexport async function duplicateDesignFile(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = fileIdSchema.parse(input);\n  const original = await getDesignFileById(parsed.fileId);\n  const now = new Date();\n  const copy = {\n    id: nanoid(),\n    ownerId: user.id,\n    name: `${original.name} Copy`,\n    scope: \"private\",\n    teamName: original.teamName,\n    projectName: original.projectName,\n    favorite: false,\n    lastOpenedAt: now,\n    trashedAt: null,\n    document: {\n      ...original.document,\n      updatedAt: now.toISOString(),\n    },\n    createdAt: now,\n    updatedAt: now,\n  };\n\n  await getDb().insert(designFile).values(copy);\n\n  return { id: copy.id };\n}\n\nexport async function deleteDesignFile(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = fileIdSchema.parse(input);\n  const db = getDb();\n  await requireOwnedFile(parsed.fileId, user.id);\n\n  await db\n    .update(designFile)\n    .set({\n      trashedAt: new Date(),\n      updatedAt: new Date(),\n    })\n    .where(\n      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),\n    );\n\n  const [nextFile] = await db\n    .select({ id: designFile.id })\n    .from(designFile)\n    .where(and(eq(designFile.ownerId, user.id), isNull(designFile.trashedAt)))\n    .orderBy(desc(designFile.updatedAt))\n    .limit(1);\n\n  return { nextFileId: nextFile?.id ?? null };\n}\n\nexport async function restoreDesignFile(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = fileIdSchema.parse(input);\n  const access = await getFileAccessForUser(parsed.fileId, user.id);\n\n  if (!access || access.role !== \"owner\") {\n    throw new Error(\"File owner access is required.\");\n  }\n\n  await getDb()\n    .update(designFile)\n    .set({\n      trashedAt: null,\n      updatedAt: new Date(),\n    })\n    .where(\n      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),\n    );\n\n  return { id: parsed.fileId };\n}\n\nexport async function toggleFavoriteDesignFile(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = fileIdSchema.parse(input);\n  const db = getDb();\n  await requireOwnedFile(parsed.fileId, user.id);\n  const [file] = await db\n    .select({ favorite: designFile.favorite })\n    .from(designFile)\n    .where(and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)))\n    .limit(1);\n\n  if (!file) {\n    throw new Error(\"Design file not found.\");\n  }\n\n  await db\n    .update(designFile)\n    .set({\n      favorite: !file.favorite,\n      updatedAt: new Date(),\n    })\n    .where(\n      and(eq(designFile.id, parsed.fileId), eq(designFile.ownerId, user.id)),\n    );\n\n  return { favorite: !file.favorite };\n}\n\nexport async function createNamedVersion(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = createNamedVersionSchema.parse(input);\n  const db = getDb();\n  const access = await requireFileAccess(\n    parsed.fileId,\n    user.id,\n    canEditFile,\n    \"Editor access is required to save a version.\",\n  );\n\n  await db.insert(designFileVersion).values({\n    id: nanoid(),\n    fileId: parsed.fileId,\n    ownerId: access.file.ownerId,\n    name: parsed.name,\n    document: parsed.document,\n    createdAt: new Date(),\n  });\n\n  return { ok: true };\n}\n\nexport async function createShareLink(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = createShareLinkSchema.parse(input);\n  const db = getDb();\n  await requireOwnedFile(parsed.fileId, user.id);\n  const policy = await getWorkspacePolicySettingsFromDb(db);\n  const sharePolicy = applyWorkspaceSharePolicy(parsed.preset, policy);\n\n  const [existing] = await db\n    .select()\n    .from(designFileShare)\n    .where(\n      and(\n        eq(designFileShare.fileId, parsed.fileId),\n        eq(designFileShare.ownerId, user.id),\n        eq(designFileShare.permissionPreset, parsed.preset),\n        isNull(designFileShare.disabledAt),\n      ),\n    )\n    .limit(1);\n\n  if (existing) {\n    return { token: existing.token, preset: parsed.preset };\n  }\n\n  const token = nanoid(32);\n\n  await db.insert(designFileShare).values({\n    id: nanoid(),\n    fileId: parsed.fileId,\n    ownerId: user.id,\n    token,\n    permissionPreset: parsed.preset,\n    accessLevel: sharePolicy.accessLevel,\n    allowComments: sharePolicy.allowComments,\n    allowDownload: sharePolicy.allowDownload,\n    createdAt: new Date(),\n    expiresAt: sharePolicy.expiresAt,\n    disabledAt: null,\n  });\n\n  return { token, preset: parsed.preset };\n}\n\nexport async function listDesignFileShares(\n  input: unknown,\n): Promise<DesignFileShareSummary[]> {\n  const user = await getRequiredUser();\n  const parsed = fileIdSchema.parse(input);\n  await requireOwnedFile(parsed.fileId, user.id);\n\n  const rows = await getDb()\n    .select()\n    .from(designFileShare)\n    .where(\n      and(\n        eq(designFileShare.fileId, parsed.fileId),\n        eq(designFileShare.ownerId, user.id),\n      ),\n    )\n    .orderBy(desc(designFileShare.createdAt));\n\n  return rows.map((row) => {\n    const permissionPreset = normalizeSharePermissionPreset(\n      row.permissionPreset,\n    );\n\n    return {\n      id: row.id,\n      token: row.token,\n      permissionPreset,\n      accessLevel: sharePresetConfig[permissionPreset].accessLevel,\n      allowComments: row.allowComments,\n      allowDownload: row.allowDownload,\n      sharePath: getSharePath(row.token, permissionPreset),\n      createdAt: row.createdAt.toISOString(),\n      expiresAt: row.expiresAt?.toISOString() ?? null,\n      disabledAt: row.disabledAt?.toISOString() ?? null,\n    };\n  });\n}\n\nexport async function revokeShareLink(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = shareIdSchema.parse(input);\n\n  await getDb()\n    .update(designFileShare)\n    .set({ disabledAt: new Date() })\n    .where(\n      and(\n        eq(designFileShare.id, parsed.shareId),\n        eq(designFileShare.ownerId, user.id),\n        isNull(designFileShare.disabledAt),\n      ),\n    );\n\n  return { ok: true };\n}\n\nexport async function updateShareLinkExpiry(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = updateShareExpirySchema.parse(input);\n  const expiresAt = parsed.expiresInDays\n    ? new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000)\n    : null;\n\n  await getDb()\n    .update(designFileShare)\n    .set({ expiresAt })\n    .where(\n      and(\n        eq(designFileShare.id, parsed.shareId),\n        eq(designFileShare.ownerId, user.id),\n        isNull(designFileShare.disabledAt),\n      ),\n    );\n\n  return { ok: true };\n}\n\nexport async function revokeShareLinks(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = fileIdSchema.parse(input);\n  await requireOwnedFile(parsed.fileId, user.id);\n\n  await getDb()\n    .update(designFileShare)\n    .set({ disabledAt: new Date() })\n    .where(\n      and(\n        eq(designFileShare.fileId, parsed.fileId),\n        eq(designFileShare.ownerId, user.id),\n        isNull(designFileShare.disabledAt),\n      ),\n    );\n\n  return { ok: true };\n}\n\nexport async function getSharedDesignFile(token: string) {\n  const [shared] = await getDb()\n    .select({\n      fileId: designFile.id,\n      name: designFile.name,\n      document: designFile.document,\n      permissionPreset: designFileShare.permissionPreset,\n      accessLevel: designFileShare.accessLevel,\n      allowComments: designFileShare.allowComments,\n      allowDownload: designFileShare.allowDownload,\n      expiresAt: designFileShare.expiresAt,\n    })\n    .from(designFileShare)\n    .innerJoin(designFile, eq(designFileShare.fileId, designFile.id))\n    .where(\n      and(\n        eq(designFileShare.token, token),\n        isNull(designFileShare.disabledAt),\n        isNull(designFile.trashedAt),\n      ),\n    )\n    .limit(1);\n\n  if (!shared) {\n    return null;\n  }\n\n  if (shared.expiresAt && shared.expiresAt.getTime() < Date.now()) {\n    return null;\n  }\n\n  const permissionPreset = normalizeSharePermissionPreset(\n    shared.permissionPreset,\n  );\n\n  return {\n    ...shared,\n    permissionPreset,\n    accessLevel: sharePresetConfig[permissionPreset].accessLevel,\n  };\n}\n\nexport async function restoreDesignFileVersion(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = restoreVersionSchema.parse(input);\n  const db = getDb();\n  const [version] = await db\n    .select()\n    .from(designFileVersion)\n    .where(\n      eq(designFileVersion.id, parsed.versionId),\n    )\n    .limit(1);\n\n  if (!version) {\n    throw new Error(\"Version not found.\");\n  }\n  await requireFileAccess(\n    version.fileId,\n    user.id,\n    canEditFile,\n    \"Editor access is required to restore a version.\",\n  );\n\n  await db\n    .update(designFile)\n    .set({\n      document: {\n        ...version.document,\n        updatedAt: new Date().toISOString(),\n      },\n      updatedAt: new Date(),\n    })\n    .where(\n      eq(designFile.id, version.fileId),\n    );\n\n  return { fileId: version.fileId };\n}\n\nexport async function branchDesignFileVersion(input: unknown) {\n  const user = await getRequiredUser();\n  const parsed = branchVersionSchema.parse(input);\n  const db = getDb();\n  const [version] = await db\n    .select({\n      versionId: designFileVersion.id,\n      fileId: designFileVersion.fileId,\n      versionName: designFileVersion.name,\n      document: designFileVersion.document,\n      fileName: designFile.name,\n    })\n    .from(designFileVersion)\n    .innerJoin(designFile, eq(designFile.id, designFileVersion.fileId))\n    .where(\n      and(\n        eq(designFileVersion.id, parsed.versionId),\n        isNull(designFile.trashedAt),\n      ),\n    )\n    .limit(1);\n\n  if (!version) {\n    throw new Error(\"Version not found.\");\n  }\n  await requireFileAccess(\n    version.fileId,\n    user.id,\n    () => true,\n    \"File access is required to branch a version.\",\n  );\n\n  const now = new Date();\n  const createdAt = now.toISOString();\n  const branchFileId = nanoid();\n  const branchRecordId = nanoid();\n  const restorePointVersionId = nanoid();\n  const branchName =\n    parsed.branchName?.trim() ||\n    `${version.fileName} Branch - ${version.versionName}`;\n  const restorePointName = `Branch restore point - ${version.versionName}`;\n  const metadata = {\n    id: branchRecordId,\n    branchFileId,\n    branchName,\n    status: \"active\",\n    mergeIntent: parsed.mergeIntent,\n    sourceFileId: version.fileId,\n    sourceFileName: version.fileName,\n    sourceVersionId: version.versionId,\n    sourceVersionName: version.versionName,\n    restorePointVersionId,\n    restorePointName,\n    createdByName: user.name,\n    createdByEmail: user.email.toLowerCase(),\n    createdAt,\n    updatedAt: createdAt,\n    targetFileId: version.fileId,\n    targetFileName: version.fileName,\n    mergeNotes: null,\n  } satisfies DesignBranchMetadata;\n  const branchActivity = {\n    id: nanoid(),\n    kind: \"branch\",\n    actorName: user.name,\n    actorEmail: user.email.toLowerCase(),\n    label: \"Created design branch\",\n    detail: `${getBranchMergeIntentLabel(parsed.mergeIntent)} from ${version.fileName} / ${version.versionName}`,\n    targetId: version.fileId,\n    createdAt,\n  } satisfies DesignActivityEvent;\n  const branchDocument = {\n    ...version.document,\n    branchMetadata: metadata,\n    activityEvents: [\n      branchActivity,\n      ...(version.document.activityEvents ?? []),\n    ].slice(0, 180),\n    updatedAt: createdAt,\n  } satisfies DesignDocument;\n  const branch = {\n    id: branchFileId,\n    ownerId: user.id,\n    name: branchName,\n    scope: \"private\",\n    teamName: \"Personal\",\n    projectName: \"Drafts\",\n    favorite: false,\n    lastOpenedAt: now,\n    trashedAt: null,\n    document: branchDocument,\n    createdAt: now,\n    updatedAt: now,\n  };\n\n  await db.insert(designFile).values(branch);\n  await db.insert(designFileVersion).values({\n    id: restorePointVersionId,\n    fileId: branchFileId,\n    ownerId: user.id,\n    name: restorePointName,\n    document: branchDocument,\n    createdAt: now,\n  });\n\n  return { fileId: branch.id, branchId: branchRecordId };\n}\n\nfunction getBranchMergeIntentLabel(intent: DesignBranchMergeIntent) {\n  if (intent === \"review\") {\n    return \"Review branch\";\n  }\n\n  if (intent === \"hotfix\") {\n    return \"Hotfix branch\";\n  }\n\n  if (intent === \"release-candidate\") {\n    return \"Release candidate branch\";\n  }\n\n  return \"Exploration branch\";\n}\n\nasync function deliverCommentNotifications(\n  events: ReturnType<typeof getCommentNotificationEvents>,\n) {\n  if (events.length === 0) {\n    return [];\n  }\n\n  const now = new Date().toISOString();\n  const deliveries = await Promise.allSettled(\n    events.map((event) => {\n      const email = renderCommentNotificationEmail(event);\n\n      return sendBrevoEmail({\n        to: event.recipientEmail,\n        subject: email.subject,\n        html: email.html,\n        text: email.text,\n      });\n    }),\n  );\n\n  return deliveries.map<DesignCommentNotificationDelivery>((delivery, index) => {\n    const event = events[index];\n\n    if (delivery.status === \"rejected\") {\n      console.error(\n        \"Comment notification email failed\",\n        event?.recipientEmail,\n        delivery.reason,\n      );\n    }\n\n    return {\n      id: nanoid(),\n      eventId: event.id,\n      kind: event.kind,\n      recipientEmail: event.recipientEmail,\n      actorName: event.actorName,\n      fileName: event.fileName,\n      pageName: event.pageName,\n      commentId: event.commentId,\n      replyId: event.replyId,\n      status: delivery.status === \"fulfilled\" ? \"sent\" : \"failed\",\n      reason:\n        delivery.status === \"rejected\"\n          ? getDeliveryFailureReason(delivery.reason)\n          : undefined,\n      createdAt: now,\n      deliveredAt:\n        delivery.status === \"fulfilled\" ? new Date().toISOString() : undefined,\n    };\n  });\n}\n\nfunction getDeliveryFailureReason(reason: unknown) {\n  if (reason instanceof Error) {\n    return reason.message;\n  }\n\n  return typeof reason === \"string\" ? reason : \"Delivery failed.\";\n}\n\nfunction getEditorFileUrl(fileId: string) {\n  const configuredUrl =\n    getNormalizedURL(process.env.NEXT_PUBLIC_APP_URL) ??\n    getNormalizedURL(\n      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,\n    ) ??\n    \"\";\n\n  return configuredUrl ? `${configuredUrl}/?file=${fileId}` : `/?file=${fileId}`;\n}\n\nfunction getNormalizedURL(value: string | undefined) {\n  return (\n    value?.replace(/[\\uFEFF\\u200B-\\u200F\\u2060]/g, \"\").trim().replace(/\\/+$/, \"\") ||\n    undefined\n  );\n}\n\nfunction getSharePath(token: string, preset: SharePermissionPreset) {\n  return preset === \"prototype\" ? `/share/${token}/prototype` : `/share/${token}`;\n}\n\nasync function listVersionsForFile(fileId: string) {\n  const versions = await getDb()\n    .select({\n      id: designFileVersion.id,\n      name: designFileVersion.name,\n      document: designFileVersion.document,\n      createdAt: designFileVersion.createdAt,\n    })\n    .from(designFileVersion)\n    .where(\n      eq(designFileVersion.fileId, fileId),\n    )\n    .orderBy(desc(designFileVersion.createdAt))\n    .limit(20);\n\n  return versions.map((version) => ({\n    id: version.id,\n    name: version.name,\n    document: version.document,\n    createdAt: version.createdAt.toISOString(),\n  }));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/files/actions.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-files-actions-ts-61b6d2d04803c056.mjs",
  "kind": "ts",
  "hash": "61b6d2d04803c056",
  "dependencies": [
    {
      "specifier": "@/db/client",
      "resolved_path": "src/db/client.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-db-client-ts-b11a4f30c3f08fac.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/db/schema",
      "resolved_path": "src/db/schema.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-db-schema-ts-24b183fcc50e5ffb.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/workspace-policy",
      "resolved_path": "src/features/admin/workspace-policy.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-admin-workspace-policy-ts-1328e128ed00d73c.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/workspace-policy-data",
      "resolved_path": "src/features/admin/workspace-policy-data.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-admin-workspace-policy-data-ts-a401a257eb083d93.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/collaboration-room-state",
      "resolved_path": "src/features/editor/collaboration-room-state.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-collaboration-room-state-ts-3ff3220a5bfda107.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/comment-notifications",
      "resolved_path": "src/features/editor/comment-notifications.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-comment-notifications-ts-900c288da3d37028.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/default-document",
      "resolved_path": "src/features/editor/default-document.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-default-document-ts-af4d71354b0b6430.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/exporters/svg-exporter",
      "resolved_path": "src/features/editor/exporters/svg-exporter.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/access-control",
      "resolved_path": "src/features/files/access-control.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-files-access-control-ts-26b077d1507cb8c5.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/current-user",
      "resolved_path": "src/features/files/current-user.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-files-current-user-ts-38880e1486ff6baa.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/permissions",
      "resolved_path": "src/features/files/permissions.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/lib/brevo-email",
      "resolved_path": "src/lib/brevo-email.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-brevo-email-ts-8d89dcbf81714307.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "drizzle-orm",
      "resolved_path": "src/lib/forge/db/drizzle-orm.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "nanoid",
      "resolved_path": "src/lib/forge/utils/nanoid.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "zod",
      "resolved_path": "src/lib/forge/utils/zod.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/files/actions.ts",
    "source_kind": "ts",
    "parser_backend": "oxc-parser",
    "diagnostics": 0,
    "compatibility_reference": {
      "upstream_crates": [
        "turbopack-ecmascript"
      ],
      "reference_only": true,
      "runtime_build_adoption": false,
      "public_runtime_dependency": false,
      "vendor_root": "vendor/next-rust",
      "vendor_commit": "f3f56ecec2f3f8cefa0f0a1323ea406740251d5c",
      "next_transform_references": [
        "next-custom-transforms::track_dynamic_imports",
        "next-custom-transforms::react_server_components"
      ],
      "copied_code": false
    },
    "output_model": {
      "contract": "dx.www.moduleGraph",
      "compiler_owns_output": true,
      "public_architecture": "DX-owned source graph analysis"
    },
    "runtime_boundaries": {
      "next_runtime_required": false,
      "react_runtime_required": false,
      "rsc_required": false,
      "node_modules_required": false
    },
    "directives": [
      {
        "value": "use server",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [
      {
        "specifier": "drizzle-orm",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "nanoid",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "zod",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/db/client",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/db/schema",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/default-document",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/comment-notifications",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/collaboration-room-state",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/exporters/svg-exporter",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/files/access-control",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/files/current-user",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/files/permissions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/workspace-policy-data",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/workspace-policy",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/brevo-email",
        "side_effect_only": false,
        "type_only": false
      }
    ],
    "dynamic_imports": [],
    "unresolved_dynamic_imports": [],
    "unsupported_dynamic_imports": [],
    "dynamic_import_analysis": {
      "status": "none-observed",
      "static_count": 0,
      "unresolved_count": 0,
      "unsupported_count": 0,
      "boundary": "source-owned dynamic import analysis; static specifiers become evidence, expressions remain unresolved, and unsupported call forms stay as adapter-boundary receipts"
    },
    "export_names": [],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: false,
  transformKind: "metadata-only",
  exportNames: []
});
export const dxRuntimeExports = Object.freeze({});
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9, dep10, dep11, dep12, dep13, dep14]);
export default dxSourceModule;
