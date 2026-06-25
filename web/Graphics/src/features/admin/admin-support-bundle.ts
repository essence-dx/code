import type {
  AdminAuditRow,
  AdminDashboardData,
  AdminFileRow,
  AdminNotificationDeliveryRow,
  AdminSessionRiskRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";
import type {
  AdminRollbackReadinessReport,
  AdminRollbackReadinessStatus,
  AdminRollbackVersionRow,
} from "@/features/admin/admin-rollback-readiness";
import {
  getDefaultRetentionPrivacySettings,
  maskEmail,
  redactMetadata,
  type RetentionPrivacySettings,
} from "@/features/admin/admin-retention-privacy";
import {
  getAdminSupportBundleRelatedEntities,
  getScopedSupportAuditEvents,
  getScopedSupportFiles,
  getScopedSupportNotifications,
  getScopedSupportRollbackVersions,
  getScopedSupportSessions,
  getScopedSupportShares,
  getScopedSupportUsers,
} from "@/features/admin/admin-support-bundle-filters";

export const adminSupportBundleScopes = [
  "workspace",
  "user",
  "file",
  "share",
] as const;

export type AdminSupportBundleScope =
  (typeof adminSupportBundleScopes)[number];

export type AdminSupportBundleFinding = {
  id: string;
  label: string;
  status: "ready" | "review" | "blocked";
  value: string;
  detail: string;
};

export type AdminSupportBundle = {
  generatedAt: string;
  requestedBy: string;
  scope: AdminSupportBundleScope;
  target: {
    id: string | null;
    label: string;
    type: AdminSupportBundleScope;
  };
  status: "ready" | "review" | "blocked";
  score: number;
  summary: {
    users: number;
    files: number;
    shares: number;
    sessions: number;
    auditEvents: number;
    notificationDeliveries: number;
    failedNotifications: number;
    rollbackRows: number;
    rollbackVersions: number;
  };
  privacy: {
    mode: RetentionPrivacySettings["supportBundlePrivacyMode"];
    retentionDays: number;
    emailsRedacted: boolean;
    networkDetailsIncluded: boolean;
    notificationReasonsIncluded: boolean;
    auditMetadataIncluded: boolean;
  };
  findings: AdminSupportBundleFinding[];
  users: AdminUserRow[];
  files: AdminFileRow[];
  shares: AdminShareRow[];
  sessions: AdminSessionRiskRow[];
  auditEvents: AdminAuditRow[];
  notificationDeliveries: AdminNotificationDeliveryRow[];
  rollbackEvidence: {
    generatedAt: string;
    status: AdminRollbackReadinessStatus;
    score: number;
    database: AdminRollbackReadinessReport["database"];
    deploymentUrls: string[];
    rows: AdminRollbackReadinessReport["rows"];
    latestVersions: AdminRollbackVersionRow[];
  };
};

type AdminSupportBundleInput = {
  auditEvents: AdminAuditRow[];
  files: AdminFileRow[];
  generatedAt?: string;
  notificationDeliveries: AdminNotificationDeliveryRow[];
  requestedBy: string;
  rollbackReadiness: AdminRollbackReadinessReport;
  scope: AdminSupportBundleScope;
  settings?: RetentionPrivacySettings;
  selectedFileId?: string;
  selectedShareId?: string;
  selectedUserId?: string;
  sessions: AdminSessionRiskRow[];
  shares: AdminShareRow[];
  users: AdminUserRow[];
};

export function createAdminSupportBundleFromDashboard({
  data,
  generatedAt,
  scope,
  selectedFileId,
  selectedShareId,
  selectedUserId,
}: {
  data: AdminDashboardData;
  generatedAt?: string;
  scope: AdminSupportBundleScope;
  selectedFileId?: string;
  selectedShareId?: string;
  selectedUserId?: string;
}) {
  return createAdminSupportBundle({
    auditEvents: data.auditEvents,
    files: data.files,
    generatedAt,
    notificationDeliveries: data.notificationDeliveries,
    requestedBy: data.currentUser.email,
    rollbackReadiness: data.rollbackReadiness,
    scope,
    settings: data.retentionPrivacy.settings,
    selectedFileId,
    selectedShareId,
    selectedUserId,
    sessions: data.sessions,
    shares: data.shares,
    users: data.users,
  });
}

export function createAdminSupportBundle({
  auditEvents,
  files,
  generatedAt = new Date().toISOString(),
  notificationDeliveries,
  requestedBy,
  rollbackReadiness,
  scope,
  settings = getDefaultRetentionPrivacySettings(),
  selectedFileId,
  selectedShareId,
  selectedUserId,
  sessions,
  shares,
  users,
}: AdminSupportBundleInput): AdminSupportBundle {
  const selectedUser = users.find((row) => row.id === selectedUserId) ?? null;
  const selectedFile = files.find((row) => row.id === selectedFileId) ?? null;
  const selectedShare = shares.find((row) => row.id === selectedShareId) ?? null;
  const related = getAdminSupportBundleRelatedEntities({
    files,
    scope,
    selectedFile,
    selectedShare,
    selectedUser,
    shares,
    users,
  });
  const scopedUsers = getScopedSupportUsers(users, related, scope);
  const scopedFiles = getScopedSupportFiles(files, related, scope);
  const scopedShares = getScopedSupportShares(shares, related, scope);
  const scopedSessions = getScopedSupportSessions(sessions, related, scope);
  const scopedNotifications = getScopedSupportNotifications(
    notificationDeliveries,
    related,
    scope,
  );
  const scopedAuditEvents = getScopedSupportAuditEvents(
    auditEvents,
    related,
    scope,
  );
  const rollbackVersions = getScopedSupportRollbackVersions(
    rollbackReadiness.latestVersions,
    related,
    scope,
  );
  const scopedData = applySupportBundlePrivacy({
    auditEvents: scopedAuditEvents,
    files: scopedFiles,
    notificationDeliveries: scopedNotifications,
    sessions: scopedSessions,
    settings,
    shares: scopedShares,
    users: scopedUsers,
  });
  const failedNotifications = scopedNotifications.filter(
    (row) => row.status === "failed",
  ).length;
  const findings = getSupportBundleFindings({
    auditEvents: scopedAuditEvents,
    failedNotifications,
    missingTarget: getMissingTarget(scope, selectedUser, selectedFile, selectedShare),
    rollbackReadiness,
    scope,
    sessions: scopedSessions,
    shares: scopedShares,
  });

  return {
    generatedAt,
    requestedBy,
    scope,
    target: getSupportBundleTarget({
      scope,
      selectedFile,
      selectedShare,
      selectedUser,
    }),
    status: getBundleStatus(findings),
    score: getBundleScore(findings),
    summary: {
      users: scopedUsers.length,
      files: scopedFiles.length,
      shares: scopedShares.length,
      sessions: scopedSessions.length,
      auditEvents: scopedAuditEvents.length,
      notificationDeliveries: scopedNotifications.length,
      failedNotifications,
      rollbackRows: rollbackReadiness.rows.length,
      rollbackVersions: rollbackVersions.length,
    },
    privacy: {
      mode: settings.supportBundlePrivacyMode,
      retentionDays: settings.supportBundleRetentionDays,
      emailsRedacted: settings.supportBundlePrivacyMode !== "diagnostic",
      networkDetailsIncluded: settings.includeSupportBundleNetworkDetails,
      notificationReasonsIncluded:
        settings.includeSupportBundleNotificationReasons,
      auditMetadataIncluded: settings.includeSupportBundleAuditMetadata,
    },
    findings,
    users: scopedData.users,
    files: scopedData.files,
    shares: scopedData.shares,
    sessions: scopedData.sessions,
    auditEvents: scopedData.auditEvents,
    notificationDeliveries: scopedData.notificationDeliveries,
    rollbackEvidence: {
      generatedAt: rollbackReadiness.generatedAt,
      status: rollbackReadiness.status,
      score: rollbackReadiness.score,
      database: rollbackReadiness.database,
      deploymentUrls: rollbackReadiness.deploymentUrls,
      rows: rollbackReadiness.rows,
      latestVersions: rollbackVersions,
    },
  };
}

function applySupportBundlePrivacy({
  auditEvents,
  files,
  notificationDeliveries,
  sessions,
  settings,
  shares,
  users,
}: {
  auditEvents: AdminAuditRow[];
  files: AdminFileRow[];
  notificationDeliveries: AdminNotificationDeliveryRow[];
  sessions: AdminSessionRiskRow[];
  settings: RetentionPrivacySettings;
  shares: AdminShareRow[];
  users: AdminUserRow[];
}) {
  const redactEmails = settings.supportBundlePrivacyMode !== "diagnostic";
  const minimal = settings.supportBundlePrivacyMode === "minimal";

  return {
    users: users.map((user) => ({
      ...user,
      email: redactEmails ? maskEmail(user.email) : user.email,
    })),
    files: files.map((file) => ({
      ...file,
      ownerEmail: redactEmails ? maskEmail(file.ownerEmail) : file.ownerEmail,
    })),
    shares: shares.map((share) => ({
      ...share,
      ownerEmail: redactEmails ? maskEmail(share.ownerEmail) : share.ownerEmail,
      token: redactEmails ? "[redacted-token]" : share.token,
      sharePath: redactEmails ? "/share/[redacted]" : share.sharePath,
    })),
    sessions: sessions.map((session) => ({
      ...session,
      userEmail: redactEmails ? maskEmail(session.userEmail) : session.userEmail,
      ipAddress: settings.includeSupportBundleNetworkDetails
        ? session.ipAddress
        : null,
      userAgent: settings.includeSupportBundleNetworkDetails
        ? session.userAgent
        : null,
    })),
    notificationDeliveries: notificationDeliveries.map((delivery) => ({
      ...delivery,
      ownerEmail: redactEmails
        ? maskEmail(delivery.ownerEmail)
        : delivery.ownerEmail,
      recipientEmail: redactEmails
        ? maskEmail(delivery.recipientEmail)
        : delivery.recipientEmail,
      reason:
        settings.includeSupportBundleNotificationReasons && !minimal
          ? delivery.reason
          : null,
    })),
    auditEvents: auditEvents.map((event) => ({
      ...event,
      actorEmail: redactEmails ? maskEmail(event.actorEmail) : event.actorEmail,
      metadata:
        settings.includeSupportBundleAuditMetadata && !minimal
          ? redactMetadata(event.metadata)
          : {},
    })),
  };
}

function getSupportBundleTarget({
  scope,
  selectedFile,
  selectedShare,
  selectedUser,
}: {
  scope: AdminSupportBundleScope;
  selectedFile: AdminFileRow | null;
  selectedShare: AdminShareRow | null;
  selectedUser: AdminUserRow | null;
}): AdminSupportBundle["target"] {
  if (scope === "user") {
    return {
      id: selectedUser?.id ?? null,
      label: selectedUser?.email ?? "Missing selected user",
      type: "user",
    };
  }

  if (scope === "file") {
    return {
      id: selectedFile?.id ?? null,
      label: selectedFile?.name ?? "Missing selected file",
      type: "file",
    };
  }

  if (scope === "share") {
    return {
      id: selectedShare?.id ?? null,
      label: selectedShare
        ? `${selectedShare.fileName} / ${selectedShare.permissionPreset}`
        : "Missing selected share",
      type: "share",
    };
  }

  return { id: null, label: "Full workspace", type: "workspace" };
}

function getSupportBundleFindings({
  auditEvents,
  failedNotifications,
  missingTarget,
  rollbackReadiness,
  scope,
  sessions,
  shares,
}: {
  auditEvents: AdminAuditRow[];
  failedNotifications: number;
  missingTarget: string | null;
  rollbackReadiness: AdminRollbackReadinessReport;
  scope: AdminSupportBundleScope;
  sessions: AdminSessionRiskRow[];
  shares: AdminShareRow[];
}): AdminSupportBundleFinding[] {
  const now = Date.now();
  const expiredSessions = sessions.filter(
    (row) => new Date(row.expiresAt).getTime() <= now,
  ).length;
  const liveDownloadShares = shares.filter(
    (row) =>
      !row.disabledAt &&
      (!row.expiresAt || new Date(row.expiresAt).getTime() > now) &&
      row.allowDownload,
  ).length;
  const expiredShares = shares.filter(
    (row) =>
      !row.disabledAt &&
      row.expiresAt &&
      new Date(row.expiresAt).getTime() <= now,
  ).length;
  const findings: AdminSupportBundleFinding[] = [];

  if (missingTarget) {
    findings.push({
      id: "missing-target",
      label: "Selected target",
      status: "blocked",
      value: "Not found",
      detail: missingTarget,
    });
  }

  return findings.concat([
    getAuditFinding(scope, auditEvents.length),
    getNotificationFinding(failedNotifications),
    getSessionFinding(expiredSessions),
    getShareFinding(liveDownloadShares, expiredShares),
    {
      id: "rollback-evidence",
      label: "Rollback evidence",
      status: rollbackReadiness.status,
      value: `${rollbackReadiness.score}/100`,
      detail:
        "The bundle includes current rollback readiness rows, database state, deployment links, and recent version anchors.",
    },
  ]);
}

function getAuditFinding(
  scope: AdminSupportBundleScope,
  auditEventCount: number,
): AdminSupportBundleFinding {
  return {
    id: "audit-evidence",
    label: "Audit evidence",
    status: scope !== "workspace" && auditEventCount === 0 ? "review" : "ready",
    value: `${auditEventCount} events`,
    detail:
      auditEventCount > 0
        ? "Relevant administrator actions are included in this support bundle."
        : "No matching audit events were found for the selected scope.",
  };
}

function getNotificationFinding(
  failedNotifications: number,
): AdminSupportBundleFinding {
  return {
    id: "notification-delivery",
    label: "Notification delivery",
    status: failedNotifications > 0 ? "review" : "ready",
    value: `${failedNotifications} failed`,
    detail:
      failedNotifications > 0
        ? "Failed comment notification deliveries are included for diagnosis."
        : "No failed notification deliveries matched this bundle scope.",
  };
}

function getSessionFinding(expiredSessions: number): AdminSupportBundleFinding {
  return {
    id: "session-risk",
    label: "Session risk",
    status: expiredSessions > 0 ? "blocked" : "ready",
    value: `${expiredSessions} expired`,
    detail:
      expiredSessions > 0
        ? "Expired sessions are included so support can review sign-in hygiene."
        : "No expired sessions matched this bundle scope.",
  };
}

function getShareFinding(
  liveDownloadShares: number,
  expiredShares: number,
): AdminSupportBundleFinding {
  return {
    id: "share-exposure",
    label: "Public share exposure",
    status:
      expiredShares > 0 ? "blocked" : liveDownloadShares > 0 ? "review" : "ready",
    value: `${liveDownloadShares} downloads / ${expiredShares} expired`,
    detail:
      liveDownloadShares > 0 || expiredShares > 0
        ? "Public link exposure is included for support and rollback review."
        : "No risky public share exposure matched this bundle scope.",
  };
}

function getMissingTarget(
  scope: AdminSupportBundleScope,
  selectedUser: AdminUserRow | null,
  selectedFile: AdminFileRow | null,
  selectedShare: AdminShareRow | null,
) {
  if (scope === "user" && !selectedUser) {
    return "Choose an existing user before exporting a user-scoped support bundle.";
  }

  if (scope === "file" && !selectedFile) {
    return "Choose an existing file before exporting a file-scoped support bundle.";
  }

  if (scope === "share" && !selectedShare) {
    return "Choose an existing share link before exporting a share-scoped support bundle.";
  }

  return null;
}

function getBundleStatus(findings: AdminSupportBundleFinding[]) {
  if (findings.some((finding) => finding.status === "blocked")) {
    return "blocked";
  }

  if (findings.some((finding) => finding.status === "review")) {
    return "review";
  }

  return "ready";
}

function getBundleScore(findings: AdminSupportBundleFinding[]) {
  return Math.max(
    0,
    100 -
      findings.filter((finding) => finding.status === "blocked").length * 22 -
      findings.filter((finding) => finding.status === "review").length * 7,
  );
}
