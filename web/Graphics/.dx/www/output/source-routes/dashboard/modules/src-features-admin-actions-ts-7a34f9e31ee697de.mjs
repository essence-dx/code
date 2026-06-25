import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-db-client-ts-b11a4f30c3f08fac.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-db-schema-ts-24b183fcc50e5ffb.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-admin-collaboration-event-ingestion-ts-a3476d0e7dee628d.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-collaboration-handoff-actions-ts-f80c7a02c2111ee1.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-collaboration-handoff-operations-ts-d37dbb12df577dc4.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-admin-admin-notification-digest-subscriptions-ts-8b02b8ed3a24e9ab.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-features-admin-admin-permissions-ts-495c7e44a1e970ef.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-features-admin-admin-release-approval-snapshots-ts-9a144c718762b608.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-features-admin-admin-retention-privacy-ts-ba9ee2978fb1a8ec.mjs";
import { dxSourceModule as dep9, dxRuntimeExports as dep9Runtime } from "./src-features-admin-admin-scoped-publication-approvals-ts-e84e6bfd0340fbe9.mjs";
import { dxSourceModule as dep10, dxRuntimeExports as dep10Runtime } from "./src-features-admin-workspace-policy-ts-1328e128ed00d73c.mjs";
import { dxSourceModule as dep11, dxRuntimeExports as dep11Runtime } from "./src-features-editor-collaboration-room-state-ts-3ff3220a5bfda107.mjs";
import { dxSourceModule as dep12, dxRuntimeExports as dep12Runtime } from "./src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs";
import { dxSourceModule as dep13, dxRuntimeExports as dep13Runtime } from "./src-lib-auth-ts-de3814526e1d4ec2.mjs";
import { dxSourceModule as dep14, dxRuntimeExports as dep14Runtime } from "./src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs";
import { dxSourceModule as dep15, dxRuntimeExports as dep15Runtime } from "./src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs";
import { dxSourceModule as dep16, dxRuntimeExports as dep16Runtime } from "./src-lib-www-cache-ts-6cfaa52cf0643257.mjs";
import { dxSourceModule as dep17, dxRuntimeExports as dep17Runtime } from "./src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs";
export const dxSourceText = "\"use server\";\n\nimport { eq } from \"drizzle-orm\";\nimport { headers } from \"next/headers\";\nimport { revalidatePath } from \"next/cache\";\nimport { nanoid } from \"nanoid\";\nimport { z } from \"zod\";\nimport { getDb } from \"@/db/client\";\nimport {\n  adminAuditEvent,\n  designFile,\n  designFileShare,\n  session,\n  user,\n  type AdminAuditMetadata,\n} from \"@/db/schema\";\nimport { auth } from \"@/lib/auth\";\nimport { isAdminEmail } from \"@/features/admin/admin-permissions\";\nimport {\n  COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION,\n  COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION,\n  COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION,\n  COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION,\n  createCollaborationHandoffActionMetadata,\n  type CollaborationHandoffQueue,\n} from \"@/features/admin/admin-collaboration-handoff-actions\";\nimport {\n  getAdminCollaborationHandoffOperationsReport,\n  type AdminCollaborationHandoffFile,\n  type AdminCollaborationHandoffRoom,\n} from \"@/features/admin/admin-collaboration-handoff-operations\";\nimport {\n  COLLABORATION_EVENT_PURGE_ACTION,\n  createCollaborationEventPurgeMetadata,\n  getCollaborationRoomReplayEventCount,\n  shouldPurgeCollaborationRoomReplay,\n} from \"@/features/admin/admin-collaboration-event-ingestion\";\nimport {\n  SCOPED_PUBLICATION_APPROVAL_ACTION,\n  createScopedPublicationApprovalMetadata,\n} from \"@/features/admin/admin-scoped-publication-approvals\";\nimport {\n  createReleaseApprovalSnapshotMetadata,\n  parseSmokeArtifacts,\n  RELEASE_APPROVAL_ACTION,\n} from \"@/features/admin/admin-release-approval-snapshots\";\nimport {\n  WORKSPACE_POLICY_ACTION,\n  createWorkspacePolicyMetadata,\n  normalizeWorkspacePolicySettings,\n  workspacePolicyInviteModes,\n  workspacePolicySessionModes,\n} from \"@/features/admin/workspace-policy\";\nimport {\n  ADMIN_NOTIFICATION_DIGEST_SUBSCRIPTIONS_ACTION,\n  adminNotificationDigestChannels,\n  adminNotificationDigestFrequencies,\n  adminNotificationDigestSeverities,\n  createAdminNotificationDigestSubscriptionMetadata,\n  normalizeAdminNotificationDigestSubscriptionSettings,\n} from \"@/features/admin/admin-notification-digest-subscriptions\";\nimport {\n  RETENTION_PRIVACY_ACTION,\n  createRetentionPrivacyMetadata,\n  normalizeRetentionPrivacySettings,\n  retentionPrivacyModes,\n} from \"@/features/admin/admin-retention-privacy\";\nimport { toDesignCollaborationRoomState } from \"@/features/editor/collaboration-room-state\";\nimport type { DesignDocument } from \"@/features/editor/types\";\nimport { collaboratorRoles } from \"@/features/files/permissions\";\n\nconst userActionSchema = z.object({\n  userId: z.string().min(1),\n});\n\nconst shareActionSchema = z.object({\n  shareId: z.string().min(1),\n});\n\nconst releaseApprovalSnapshotSchema = z.object({\n  releaseLabel: z.string().trim().max(120).optional(),\n  commitSha: z.string().trim().min(4).max(80),\n  deploymentUrl: z.string().trim().url().max(500),\n  smokeArtifactsText: z.string().trim().min(1).max(3000),\n  rollbackNotes: z.string().trim().min(10).max(3000),\n  preflightStatus: z.enum([\"ready\", \"review\", \"blocked\"]),\n  preflightScore: z.number().int().min(0).max(100),\n  incidentStatus: z.enum([\"ready\", \"review\", \"blocked\"]),\n  incidentScore: z.number().int().min(0).max(100),\n});\n\nconst workspacePolicySchema = z.object({\n  defaultShareExpiryDays: z.number().int().min(0).max(365),\n  allowPublicDownloads: z.boolean(),\n  allowPublicComments: z.boolean(),\n  inviteMode: z.enum(workspacePolicyInviteModes),\n  maxInviteRole: z.enum(collaboratorRoles),\n  sessionMode: z.enum(workspacePolicySessionModes),\n  staleSessionDays: z.number().int().min(1).max(365),\n});\n\nconst adminNotificationDigestSubscriptionsSchema = z.object({\n  recipients: z.array(z.string().trim().email().max(254)).max(20),\n  frequency: z.enum(adminNotificationDigestFrequencies),\n  channel: z.enum(adminNotificationDigestChannels),\n  minimumSeverity: z.enum(adminNotificationDigestSeverities),\n  includeResolved: z.boolean(),\n  topics: z.object({\n    \"failed-auth\": z.boolean(),\n    \"email-delivery\": z.boolean(),\n    \"deploy-smoke\": z.boolean(),\n    rollback: z.boolean(),\n    \"risky-shares\": z.boolean(),\n  }),\n});\n\nconst retentionPrivacySchema = z.object({\n  auditLogRetentionDays: z.number().int().min(7).max(730),\n  collaborationPresenceRetentionDays: z.number().int().min(1).max(365),\n  notificationDeliveryRetentionDays: z.number().int().min(7).max(365),\n  supportBundleRetentionDays: z.number().int().min(1).max(90),\n  supportBundlePrivacyMode: z.enum(retentionPrivacyModes),\n  includeSupportBundleNetworkDetails: z.boolean(),\n  includeSupportBundleNotificationReasons: z.boolean(),\n  includeSupportBundleAuditMetadata: z.boolean(),\n});\n\nconst collaborationHandoffRoomActionSchema = z.object({\n  fileId: z.string().min(1),\n  note: z.string().trim().max(500).optional(),\n});\n\nconst collaborationHandoffAssignOwnerSchema =\n  collaborationHandoffRoomActionSchema.extend({\n    ownerName: z.string().trim().max(120).optional(),\n    ownerEmail: z.string().trim().email().max(254).optional(),\n  });\n\nconst collaborationHandoffResolveQueueSchema =\n  collaborationHandoffRoomActionSchema.extend({\n    queue: z.enum([\"mentions\", \"escalations\"]),\n  });\n\nconst collaborationEventPurgeSchema = z.object({\n  retentionDays: z.number().int().min(1).max(365),\n  note: z.string().trim().max(500).optional(),\n});\n\nconst scopedPublicationApprovalSchema = z.object({\n  scopeKey: z.string().trim().min(1).max(180),\n  teamName: z.string().trim().min(1).max(120),\n  projectName: z.string().trim().min(1).max(120),\n  decision: z.enum([\"approved\", \"changes-requested\"]),\n  note: z.string().trim().max(1000).optional(),\n  channelCount: z.number().int().min(0).max(500),\n  blockerCount: z.number().int().min(0).max(500),\n  evidenceDiffCount: z.number().int().min(0).max(500),\n  rollbackAnchorCount: z.number().int().min(0).max(500),\n  slaDueAt: z.string().datetime().nullable().optional(),\n});\n\nexport async function verifyAdminUser(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = userActionSchema.parse(input);\n  const db = getDb();\n  const [targetUser] = await db\n    .select({\n      id: user.id,\n      email: user.email,\n      name: user.name,\n      emailVerified: user.emailVerified,\n    })\n    .from(user)\n    .where(eq(user.id, parsed.userId))\n    .limit(1);\n\n  if (!targetUser) {\n    throw new Error(\"User not found.\");\n  }\n\n  await db\n    .update(user)\n    .set({\n      emailVerified: true,\n      updatedAt: new Date(),\n    })\n    .where(eq(user.id, parsed.userId));\n  await recordAdminAudit(db, adminUser, {\n    action: \"user.verify\",\n    targetType: \"user\",\n    targetId: targetUser.id,\n    targetLabel: targetUser.email,\n    metadata: {\n      name: targetUser.name,\n      wasVerified: targetUser.emailVerified,\n    },\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function revokeAdminUserSessions(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = userActionSchema.parse(input);\n  const db = getDb();\n\n  if (parsed.userId === adminUser.id) {\n    throw new Error(\"Use sign out for your current admin session.\");\n  }\n\n  const [targetUser] = await db\n    .select({\n      id: user.id,\n      email: user.email,\n      name: user.name,\n    })\n    .from(user)\n    .where(eq(user.id, parsed.userId))\n    .limit(1);\n\n  if (!targetUser) {\n    throw new Error(\"User not found.\");\n  }\n\n  const deletedSessions = await db\n    .delete(session)\n    .where(eq(session.userId, parsed.userId))\n    .returning({ id: session.id });\n  await recordAdminAudit(db, adminUser, {\n    action: \"session.revoke\",\n    targetType: \"user\",\n    targetId: targetUser.id,\n    targetLabel: targetUser.email,\n    metadata: {\n      name: targetUser.name,\n      sessionCount: deletedSessions.length,\n    },\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function disableAdminShare(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = shareActionSchema.parse(input);\n  const db = getDb();\n  const [share] = await db\n    .select({\n      id: designFileShare.id,\n      token: designFileShare.token,\n      permissionPreset: designFileShare.permissionPreset,\n      fileName: designFile.name,\n    })\n    .from(designFileShare)\n    .innerJoin(designFile, eq(designFileShare.fileId, designFile.id))\n    .where(eq(designFileShare.id, parsed.shareId))\n    .limit(1);\n\n  if (!share) {\n    throw new Error(\"Share link not found.\");\n  }\n\n  await db\n    .update(designFileShare)\n    .set({ disabledAt: new Date() })\n    .where(eq(designFileShare.id, parsed.shareId));\n  await recordAdminAudit(db, adminUser, {\n    action: \"share.disable\",\n    targetType: \"share\",\n    targetId: share.id,\n    targetLabel: share.fileName,\n    metadata: {\n      token: share.token,\n      preset: share.permissionPreset,\n    },\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function restoreAdminShare(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = shareActionSchema.parse(input);\n  const db = getDb();\n  const [share] = await db\n    .select({\n      id: designFileShare.id,\n      token: designFileShare.token,\n      permissionPreset: designFileShare.permissionPreset,\n      fileName: designFile.name,\n    })\n    .from(designFileShare)\n    .innerJoin(designFile, eq(designFileShare.fileId, designFile.id))\n    .where(eq(designFileShare.id, parsed.shareId))\n    .limit(1);\n\n  if (!share) {\n    throw new Error(\"Share link not found.\");\n  }\n\n  await db\n    .update(designFileShare)\n    .set({ disabledAt: null })\n    .where(eq(designFileShare.id, parsed.shareId));\n  await recordAdminAudit(db, adminUser, {\n    action: \"share.restore\",\n    targetType: \"share\",\n    targetId: share.id,\n    targetLabel: share.fileName,\n    metadata: {\n      token: share.token,\n      preset: share.permissionPreset,\n    },\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function createAdminReleaseApprovalSnapshot(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = releaseApprovalSnapshotSchema.parse(input);\n  const smokeArtifacts = parseSmokeArtifacts(parsed.smokeArtifactsText);\n\n  if (smokeArtifacts.length === 0) {\n    throw new Error(\"At least one smoke artifact is required.\");\n  }\n\n  const snapshotId = nanoid();\n  const releaseLabel =\n    parsed.releaseLabel ||\n    `Release ${parsed.commitSha.slice(0, 8)} approval`;\n  const db = getDb();\n\n  await recordAdminAudit(db, adminUser, {\n    action: RELEASE_APPROVAL_ACTION,\n    targetType: \"release\",\n    targetId: snapshotId,\n    targetLabel: releaseLabel,\n    metadata: createReleaseApprovalSnapshotMetadata({\n      snapshotId,\n      releaseLabel,\n      reviewerEmail: adminUser.email,\n      reviewerName: adminUser.name,\n      commitSha: parsed.commitSha,\n      deploymentUrl: parsed.deploymentUrl,\n      smokeArtifacts,\n      rollbackNotes: parsed.rollbackNotes,\n      preflightStatus: parsed.preflightStatus,\n      preflightScore: parsed.preflightScore,\n      incidentStatus: parsed.incidentStatus,\n      incidentScore: parsed.incidentScore,\n    }),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true, snapshotId };\n}\n\nexport async function updateAdminWorkspacePolicy(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = workspacePolicySchema.parse(input);\n  const settings = normalizeWorkspacePolicySettings({\n    ...parsed,\n    updatedAt: new Date().toISOString(),\n    updatedBy: adminUser.email,\n  });\n  const db = getDb();\n\n  await recordAdminAudit(db, adminUser, {\n    action: WORKSPACE_POLICY_ACTION,\n    targetType: \"workspace_policy\",\n    targetId: \"global\",\n    targetLabel: \"Workspace governance policy\",\n    metadata: createWorkspacePolicyMetadata(settings),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function updateAdminNotificationDigestSubscriptions(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = adminNotificationDigestSubscriptionsSchema.parse(input);\n  const settings = normalizeAdminNotificationDigestSubscriptionSettings({\n    recipients: parsed.recipients,\n    frequency: parsed.frequency,\n    channel: parsed.channel,\n    minimumSeverity: parsed.minimumSeverity,\n    includeResolved: parsed.includeResolved,\n    topicFailedAuth: parsed.topics[\"failed-auth\"],\n    topicEmailDelivery: parsed.topics[\"email-delivery\"],\n    topicDeploySmoke: parsed.topics[\"deploy-smoke\"],\n    topicRollback: parsed.topics.rollback,\n    topicRiskyShares: parsed.topics[\"risky-shares\"],\n    updatedAt: new Date().toISOString(),\n    updatedBy: adminUser.email,\n  });\n  const db = getDb();\n\n  await recordAdminAudit(db, adminUser, {\n    action: ADMIN_NOTIFICATION_DIGEST_SUBSCRIPTIONS_ACTION,\n    targetType: \"admin_notification_digest\",\n    targetId: \"global\",\n    targetLabel: \"Admin notification digest subscriptions\",\n    metadata: createAdminNotificationDigestSubscriptionMetadata(settings),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function updateAdminRetentionPrivacy(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = retentionPrivacySchema.parse(input);\n  const settings = normalizeRetentionPrivacySettings({\n    ...parsed,\n    updatedAt: new Date().toISOString(),\n    updatedBy: adminUser.email,\n  });\n  const db = getDb();\n\n  await recordAdminAudit(db, adminUser, {\n    action: RETENTION_PRIVACY_ACTION,\n    targetType: \"retention_privacy\",\n    targetId: \"global\",\n    targetLabel: \"Retention and privacy controls\",\n    metadata: createRetentionPrivacyMetadata(settings),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function assignCollaborationHandoffOwner(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = collaborationHandoffAssignOwnerSchema.parse(input);\n  const db = getDb();\n  const file = await getAdminHandoffDesignFile(db, parsed.fileId);\n  const room = getAdminHandoffRoom(file);\n  const ownerEmail = parsed.ownerEmail || file.ownerEmail;\n  const ownerName = parsed.ownerName || ownerEmail.split(\"@\")[0] || ownerEmail;\n\n  await recordAdminAudit(db, adminUser, {\n    action: COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION,\n    targetType: \"design_file\",\n    targetId: file.fileId,\n    targetLabel: file.fileName,\n    metadata: createCollaborationHandoffActionMetadata({\n      actionKind: COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION,\n      actorEmail: adminUser.email,\n      createdAt: new Date().toISOString(),\n      fileId: file.fileId,\n      fileName: file.fileName,\n      roomId: room.id,\n      ownerEmail,\n      ownerName,\n      note: parsed.note ?? `Assigned handoff owner to ${ownerEmail}.`,\n      ...getRoomActionMetrics(room),\n    }),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function archiveCollaborationHandoffEvidence(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = collaborationHandoffRoomActionSchema.parse(input);\n  const db = getDb();\n  const file = await getAdminHandoffDesignFile(db, parsed.fileId);\n  const room = getAdminHandoffRoom(file);\n\n  await recordAdminAudit(db, adminUser, {\n    action: COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION,\n    targetType: \"design_file\",\n    targetId: file.fileId,\n    targetLabel: file.fileName,\n    metadata: createCollaborationHandoffActionMetadata({\n      actionKind: COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION,\n      actorEmail: adminUser.email,\n      createdAt: new Date().toISOString(),\n      fileId: file.fileId,\n      fileName: file.fileName,\n      roomId: room.id,\n      note:\n        parsed.note ??\n        \"Archived room handoff evidence for release operations review.\",\n      ...getRoomActionMetrics(room),\n    }),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function clearCollaborationHandoffStaleSnapshot(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = collaborationHandoffRoomActionSchema.parse(input);\n  const db = getDb();\n  const file = await getAdminHandoffDesignFile(db, parsed.fileId);\n  const room = getAdminHandoffRoom(file);\n  const now = new Date();\n  const nowIso = now.toISOString();\n  const document = appendAdminHandoffActivity(\n    {\n      ...file.document,\n      collaborationRoom: toDesignCollaborationRoomState(\n        { chatMessages: [], presenceEvents: [] },\n        nowIso,\n      ),\n      updatedAt: nowIso,\n    },\n    adminUser,\n    {\n      label: \"Cleared stale collaboration snapshot\",\n      detail:\n        parsed.note ??\n        \"Admin cleared the stale room replay after archiving handoff evidence.\",\n      targetId: file.fileId,\n      createdAt: nowIso,\n    },\n  );\n\n  await db\n    .update(designFile)\n    .set({ document, updatedAt: now })\n    .where(eq(designFile.id, file.fileId));\n  await recordAdminAudit(db, adminUser, {\n    action: COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION,\n    targetType: \"design_file\",\n    targetId: file.fileId,\n    targetLabel: file.fileName,\n    metadata: createCollaborationHandoffActionMetadata({\n      actionKind: COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION,\n      actorEmail: adminUser.email,\n      createdAt: nowIso,\n      fileId: file.fileId,\n      fileName: file.fileName,\n      roomId: room.id,\n      note:\n        parsed.note ??\n        \"Cleared stale room replay after preserving the action in the audit log.\",\n      ...getRoomActionMetrics(room),\n    }),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nexport async function resolveCollaborationHandoffQueue(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = collaborationHandoffResolveQueueSchema.parse(input);\n  const db = getDb();\n  const file = await getAdminHandoffDesignFile(db, parsed.fileId);\n  const room = getAdminHandoffRoom(file);\n  const now = new Date();\n  const nowIso = now.toISOString();\n  let resolvedCommentCount = 0;\n\n  if (parsed.queue === \"mentions\") {\n    const result = resolveMentionComments(file.document, adminUser, nowIso);\n    resolvedCommentCount = result.resolvedCommentCount;\n\n    if (resolvedCommentCount > 0) {\n      await db\n        .update(designFile)\n        .set({\n          document: appendAdminHandoffActivity(result.document, adminUser, {\n            label: \"Resolved collaboration mention queue\",\n            detail:\n              parsed.note ??\n              `${resolvedCommentCount} mention comment thread${resolvedCommentCount === 1 ? \"\" : \"s\"} resolved for handoff.`,\n            targetId: file.fileId,\n            createdAt: nowIso,\n          }),\n          updatedAt: now,\n        })\n        .where(eq(designFile.id, file.fileId));\n    }\n  }\n\n  await recordAdminAudit(db, adminUser, {\n    action: COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION,\n    targetType: \"design_file\",\n    targetId: file.fileId,\n    targetLabel: file.fileName,\n    metadata: createCollaborationHandoffActionMetadata({\n      actionKind: COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION,\n      actorEmail: adminUser.email,\n      createdAt: nowIso,\n      fileId: file.fileId,\n      fileName: file.fileName,\n      roomId: room.id,\n      queue: parsed.queue,\n      resolvedCommentCount,\n      note: getQueueResolutionNote(parsed.queue, resolvedCommentCount, parsed.note),\n      ...getRoomActionMetrics(room),\n    }),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true, resolvedCommentCount };\n}\n\nexport async function purgeCollaborationEventReplay(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = collaborationEventPurgeSchema.parse(input);\n  const db = getDb();\n  const now = new Date();\n  const nowIso = now.toISOString();\n  const cutoffAt = new Date(\n    now.getTime() - parsed.retentionDays * 24 * 60 * 60 * 1000,\n  ).toISOString();\n  const rows = await db\n    .select({\n      id: designFile.id,\n      name: designFile.name,\n      document: designFile.document,\n      trashedAt: designFile.trashedAt,\n      ownerEmail: user.email,\n    })\n    .from(designFile)\n    .innerJoin(user, eq(designFile.ownerId, user.id))\n    .limit(200);\n  let purgedFileCount = 0;\n  let purgedChatMessageCount = 0;\n  let purgedPresenceEventCount = 0;\n\n  for (const row of rows) {\n    if (row.trashedAt) {\n      continue;\n    }\n\n    if (\n      !shouldPurgeCollaborationRoomReplay({\n        document: row.document,\n        now: now.getTime(),\n        retentionDays: parsed.retentionDays,\n      })\n    ) {\n      continue;\n    }\n\n    const replayCounts = getCollaborationRoomReplayEventCount(row.document);\n    const document = appendAdminHandoffActivity(\n      {\n        ...row.document,\n        collaborationRoom: toDesignCollaborationRoomState(\n          { chatMessages: [], presenceEvents: [] },\n          nowIso,\n        ),\n        updatedAt: nowIso,\n      },\n      adminUser,\n      {\n        label: \"Purged stale collaboration replay payload\",\n        detail:\n          parsed.note ??\n          `Cleared collaboration replay payload older than ${parsed.retentionDays} days after preserving admin audit evidence.`,\n        targetId: row.id,\n        createdAt: nowIso,\n      },\n    );\n\n    await db\n      .update(designFile)\n      .set({\n        document,\n        updatedAt: now,\n      })\n      .where(eq(designFile.id, row.id));\n\n    purgedFileCount += 1;\n    purgedChatMessageCount += replayCounts.chatMessageCount;\n    purgedPresenceEventCount += replayCounts.presenceEventCount;\n  }\n\n  await recordAdminAudit(db, adminUser, {\n    action: COLLABORATION_EVENT_PURGE_ACTION,\n    targetType: \"collaboration_event_ingestion\",\n    targetId: \"workspace\",\n    targetLabel: \"Workspace collaboration replay retention\",\n    metadata: createCollaborationEventPurgeMetadata({\n      actionKind: COLLABORATION_EVENT_PURGE_ACTION,\n      actorEmail: adminUser.email,\n      createdAt: nowIso,\n      cutoffAt,\n      retentionDays: parsed.retentionDays,\n      scannedFileCount: rows.length,\n      purgedFileCount,\n      purgedChatMessageCount,\n      purgedPresenceEventCount,\n      note:\n        parsed.note ??\n        `Purged ${purgedFileCount} stale collaboration replay payload${purgedFileCount === 1 ? \"\" : \"s\"}.`,\n    }),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true, purgedFileCount };\n}\n\nexport async function saveScopedPublicationApproval(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = scopedPublicationApprovalSchema.parse(input);\n  const db = getDb();\n  const createdAt = new Date().toISOString();\n\n  await recordAdminAudit(db, adminUser, {\n    action: SCOPED_PUBLICATION_APPROVAL_ACTION,\n    targetType: \"publication_scope\",\n    targetId: parsed.scopeKey,\n    targetLabel: `${parsed.teamName} / ${parsed.projectName}`,\n    metadata: createScopedPublicationApprovalMetadata({\n      blockerCount: parsed.blockerCount,\n      channelCount: parsed.channelCount,\n      createdAt,\n      decision: parsed.decision,\n      evidenceDiffCount: parsed.evidenceDiffCount,\n      note:\n        parsed.note ||\n        (parsed.decision === \"approved\"\n          ? \"Scoped publication evidence approved.\"\n          : \"Scoped publication changes requested.\"),\n      projectName: parsed.projectName,\n      reviewerEmail: adminUser.email,\n      reviewerName: adminUser.name,\n      rollbackAnchorCount: parsed.rollbackAnchorCount,\n      scopeKey: parsed.scopeKey,\n      slaDueAt: parsed.slaDueAt ?? null,\n      teamName: parsed.teamName,\n    }),\n  });\n\n  revalidatePath(\"/dashboard\");\n  return { ok: true };\n}\n\nasync function getRequiredAdminUser() {\n  const sessionData = await auth.api.getSession({\n    headers: await headers(),\n  });\n\n  if (!sessionData) {\n    throw new Error(\"Authentication is required.\");\n  }\n\n  if (!isAdminEmail(sessionData.user.email)) {\n    throw new Error(\"Administrator access is required.\");\n  }\n\n  return sessionData.user;\n}\n\nasync function getAdminHandoffDesignFile(\n  db: ReturnType<typeof getDb>,\n  fileId: string,\n): Promise<AdminCollaborationHandoffFile> {\n  const [file] = await db\n    .select({\n      id: designFile.id,\n      name: designFile.name,\n      document: designFile.document,\n      updatedAt: designFile.updatedAt,\n      trashedAt: designFile.trashedAt,\n      ownerEmail: user.email,\n    })\n    .from(designFile)\n    .innerJoin(user, eq(designFile.ownerId, user.id))\n    .where(eq(designFile.id, fileId))\n    .limit(1);\n\n  if (!file) {\n    throw new Error(\"Design file not found.\");\n  }\n\n  return {\n    fileId: file.id,\n    fileName: file.name,\n    ownerEmail: file.ownerEmail,\n    document: file.document,\n    updatedAt: file.updatedAt.toISOString(),\n    trashedAt: file.trashedAt?.toISOString() ?? null,\n  };\n}\n\nfunction getAdminHandoffRoom(\n  file: AdminCollaborationHandoffFile,\n): AdminCollaborationHandoffRoom {\n  const report = getAdminCollaborationHandoffOperationsReport({\n    files: [file],\n  });\n  const room = report.rooms[0];\n\n  if (!room) {\n    throw new Error(\"Active collaboration room not found.\");\n  }\n\n  return room;\n}\n\nfunction getRoomActionMetrics(room: AdminCollaborationHandoffRoom) {\n  return {\n    chatMessageCount: room.chatMessageCount,\n    escalationCount: room.rawEscalationCount,\n    latestAt: room.latestAt,\n    presenceEventCount: room.presenceEventCount,\n    roomAgeMinutes: room.roomAgeMinutes,\n    roomCaptured: room.roomCaptured,\n    roomScore: room.syncReplay.score,\n    roomStatus: room.status,\n    unresolvedMentionCount: room.rawUnresolvedMentionCount,\n  };\n}\n\nfunction appendAdminHandoffActivity(\n  document: DesignDocument,\n  actor: { name: string; email: string },\n  event: {\n    label: string;\n    detail: string;\n    targetId: string;\n    createdAt: string;\n  },\n): DesignDocument {\n  return {\n    ...document,\n    updatedAt: event.createdAt,\n    activityEvents: [\n      ...(document.activityEvents ?? []).slice(-99),\n      {\n        id: nanoid(),\n        kind: \"extension\",\n        actorName: actor.name,\n        actorEmail: actor.email,\n        label: event.label,\n        detail: event.detail,\n        targetId: event.targetId,\n        createdAt: event.createdAt,\n      },\n    ],\n  };\n}\n\nfunction resolveMentionComments(\n  document: DesignDocument,\n  actor: { name: string; email: string },\n  createdAt: string,\n) {\n  let resolvedCommentCount = 0;\n  const pages = document.pages.map((page) => ({\n    ...page,\n    comments: page.comments?.map((comment) => {\n      const hasMentions =\n        (comment.mentions?.length ?? 0) > 0 ||\n        (comment.replies ?? []).some((reply) => (reply.mentions?.length ?? 0) > 0);\n\n      if (comment.resolved || !hasMentions) {\n        return comment;\n      }\n\n      resolvedCommentCount += 1;\n\n      return {\n        ...comment,\n        resolved: true,\n        updatedAt: createdAt,\n        resolutionHistory: [\n          ...(comment.resolutionHistory ?? []),\n          {\n            id: nanoid(),\n            status: \"resolved\" as const,\n            actorName: actor.name,\n            actorEmail: actor.email,\n            createdAt,\n          },\n        ],\n      };\n    }),\n  }));\n\n  return {\n    document: {\n      ...document,\n      pages,\n      updatedAt: createdAt,\n    },\n    resolvedCommentCount,\n  };\n}\n\nfunction getQueueResolutionNote(\n  queue: CollaborationHandoffQueue,\n  resolvedCommentCount: number,\n  note?: string,\n) {\n  if (note) {\n    return note;\n  }\n\n  if (queue === \"mentions\") {\n    return resolvedCommentCount > 0\n      ? `Resolved ${resolvedCommentCount} mention comment thread${resolvedCommentCount === 1 ? \"\" : \"s\"} and cleared chat mention handoff review.`\n      : \"Marked chat mention handoff review as resolved.\";\n  }\n\n  return \"Marked escalation signals as reviewed for release handoff.\";\n}\n\nasync function recordAdminAudit(\n  db: ReturnType<typeof getDb>,\n  actor: { id: string; email: string },\n  event: {\n    action: string;\n    targetType: string;\n    targetId: string;\n    targetLabel: string;\n    metadata?: AdminAuditMetadata;\n  },\n) {\n  await db.insert(adminAuditEvent).values({\n    id: nanoid(),\n    actorId: actor.id,\n    actorEmail: actor.email,\n    action: event.action,\n    targetType: event.targetType,\n    targetId: event.targetId,\n    targetLabel: event.targetLabel,\n    metadata: event.metadata ?? {},\n    createdAt: new Date(),\n  });\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/actions.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-actions-ts-7a34f9e31ee697de.mjs",
  "kind": "ts",
  "hash": "7a34f9e31ee697de",
  "dependencies": [
    {
      "specifier": "@/db/client",
      "resolved_path": "src/db/client.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-db-client-ts-b11a4f30c3f08fac.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/db/schema",
      "resolved_path": "src/db/schema.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-db-schema-ts-24b183fcc50e5ffb.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-collaboration-event-ingestion",
      "resolved_path": "src/features/admin/admin-collaboration-event-ingestion.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-event-ingestion-ts-a3476d0e7dee628d.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-actions",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-actions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-actions-ts-f80c7a02c2111ee1.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-operations",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-operations.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-ts-d37dbb12df577dc4.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-notification-digest-subscriptions",
      "resolved_path": "src/features/admin/admin-notification-digest-subscriptions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-notification-digest-subscriptions-ts-8b02b8ed3a24e9ab.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-permissions",
      "resolved_path": "src/features/admin/admin-permissions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-permissions-ts-495c7e44a1e970ef.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-release-approval-snapshots",
      "resolved_path": "src/features/admin/admin-release-approval-snapshots.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-approval-snapshots-ts-9a144c718762b608.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-retention-privacy",
      "resolved_path": "src/features/admin/admin-retention-privacy.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-retention-privacy-ts-ba9ee2978fb1a8ec.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-scoped-publication-approvals",
      "resolved_path": "src/features/admin/admin-scoped-publication-approvals.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-scoped-publication-approvals-ts-e84e6bfd0340fbe9.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/workspace-policy",
      "resolved_path": "src/features/admin/workspace-policy.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-workspace-policy-ts-1328e128ed00d73c.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/collaboration-room-state",
      "resolved_path": "src/features/editor/collaboration-room-state.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-collaboration-room-state-ts-3ff3220a5bfda107.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/permissions",
      "resolved_path": "src/features/files/permissions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/lib/auth",
      "resolved_path": "src/lib/auth.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-auth-ts-de3814526e1d4ec2.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "drizzle-orm",
      "resolved_path": "src/lib/forge/db/drizzle-orm.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "nanoid",
      "resolved_path": "src/lib/forge/utils/nanoid.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/cache",
      "resolved_path": "src/lib/www/cache.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-www-cache-ts-6cfaa52cf0643257.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/headers",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
      "node_modules_required": false
    },
    {
      "specifier": "zod",
      "resolved_path": "src/lib/forge/utils/zod.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs",
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
    "source_path": "src/features/admin/actions.ts",
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
        "specifier": "next/headers",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "next/cache",
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
        "specifier": "@/lib/auth",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-permissions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-event-ingestion",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-scoped-publication-approvals",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/workspace-policy",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-notification-digest-subscriptions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-retention-privacy",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/collaboration-room-state",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/files/permissions",
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9, dep10, dep11, dep12, dep13, dep14, dep15, dep16, dep17]);
export default dxSourceModule;
