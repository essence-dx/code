export type AdminRollbackReadinessStatus = "ready" | "review" | "blocked";

export type AdminRollbackReadinessCategory =
  | "versions"
  | "shares"
  | "database"
  | "deployment";

export type AdminRollbackReadinessRow = {
  id: string;
  status: AdminRollbackReadinessStatus;
  category: AdminRollbackReadinessCategory;
  label: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
};

export type AdminRollbackVersionRow = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  versionName: string;
  createdAt: string;
};

export type AdminRollbackFileStateRow = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  trashedAt: string | null;
  versionCount: number;
  latestVersionAt: string | null;
};

export type AdminRollbackShareRow = {
  fileName: string;
  ownerEmail: string;
  accessLevel: string;
  allowComments: boolean;
  allowDownload: boolean;
  createdAt: string;
  expiresAt: string | null;
  disabledAt: string | null;
};

export type AdminRollbackAuditRow = {
  action: string;
  targetLabel: string;
  createdAt: string;
};

export type AdminRollbackDatabaseSummary = {
  databaseKind: "remote-libsql" | "local-sqlite" | "unknown";
  configured: boolean;
  authTokenRequired: boolean;
  authTokenConfigured: boolean;
  users: number;
  sessions: number;
  accounts: number;
  activeFiles: number;
  activeShares: number;
  versions: number;
};

export type AdminRollbackReadinessReport = {
  generatedAt: string;
  status: AdminRollbackReadinessStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  versionAnchorCount: number;
  filesWithoutVersions: number;
  staleShareCount: number;
  elevatedShareCount: number;
  shareAuditEventCount: number;
  deploymentLinkCount: number;
  database: AdminRollbackDatabaseSummary;
  deploymentUrls: string[];
  latestVersions: AdminRollbackVersionRow[];
  rows: AdminRollbackReadinessRow[];
};

export type AdminRollbackReadinessInput = {
  files: AdminRollbackFileStateRow[];
  versions: AdminRollbackVersionRow[];
  shares: AdminRollbackShareRow[];
  auditEvents: AdminRollbackAuditRow[];
  database: AdminRollbackDatabaseSummary;
  deploymentUrls: string[];
  generatedAt?: string;
  now?: number;
};

export function getAdminRollbackReadinessReport({
  files,
  versions,
  shares,
  auditEvents,
  database,
  deploymentUrls,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
}: AdminRollbackReadinessInput): AdminRollbackReadinessReport {
  const rows: AdminRollbackReadinessRow[] = [];
  const activeFiles = files.filter((file) => !file.trashedAt);
  const filesWithoutVersions = activeFiles.filter(
    (file) => file.versionCount === 0,
  );
  const staleShares = shares.filter(
    (share) =>
      !share.disabledAt &&
      Boolean(share.expiresAt && new Date(share.expiresAt).getTime() <= now),
  );
  const elevatedShares = shares.filter(
    (share) =>
      !share.disabledAt &&
      !Boolean(share.expiresAt && new Date(share.expiresAt).getTime() <= now) &&
      (share.allowDownload ||
        share.allowComments ||
        share.accessLevel === "review" ||
        !share.expiresAt),
  );
  const shareAuditEvents = auditEvents.filter((event) =>
    event.action.startsWith("share."),
  );

  rows.push(getDatabaseRow(database));
  rows.push(
    getVersionRow({
      activeFileCount: activeFiles.length,
      versionAnchorCount: versions.length,
      filesWithoutVersions,
    }),
  );
  rows.push(
    getShareExposureRow({
      staleShares,
      elevatedShares,
    }),
  );
  rows.push(
    getShareAuditRow({
      activeShareCount: database.activeShares,
      shareAuditEvents,
    }),
  );
  rows.push(getDeploymentRow(deploymentUrls));

  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminRollbackReadinessStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const score = Math.max(0, 100 - blockedCount * 24 - reviewCount * 8);

  return {
    generatedAt,
    status,
    score,
    readyCount,
    reviewCount,
    blockedCount,
    versionAnchorCount: versions.length,
    filesWithoutVersions: filesWithoutVersions.length,
    staleShareCount: staleShares.length,
    elevatedShareCount: elevatedShares.length,
    shareAuditEventCount: shareAuditEvents.length,
    deploymentLinkCount: deploymentUrls.length,
    database,
    deploymentUrls,
    latestVersions: versions.slice(0, 12),
    rows,
  };
}

function getDatabaseRow(
  database: AdminRollbackDatabaseSummary,
): AdminRollbackReadinessRow {
  if (!database.configured) {
    return {
      id: "database-unconfigured",
      status: "blocked",
      category: "database",
      label: "Database state",
      detail: "Turso database URL is not configured for release recovery.",
      recommendation:
        "Configure TURSO_DATABASE_URL before relying on admin rollback exports.",
      count: 0,
      target: null,
    };
  }

  if (database.authTokenRequired && !database.authTokenConfigured) {
    return {
      id: "database-token-missing",
      status: "blocked",
      category: "database",
      label: "Database auth token",
      detail: "Remote libSQL database is configured but its auth token is missing.",
      recommendation:
        "Set TURSO_AUTH_TOKEN in production before approving rollback readiness.",
      count: 0,
      target: database.databaseKind,
    };
  }

  return {
    id: "database-state-ready",
    status: "ready",
    category: "database",
    label: "Database state",
    detail: `${database.users} users, ${database.activeFiles} active files, ${database.activeShares} active shares, and ${database.versions} versions are visible to the rollback report.`,
    recommendation:
      "Export this report with the release approval snapshot so database state has a review anchor.",
    count: database.activeFiles,
    target: database.databaseKind,
  };
}

function getVersionRow({
  activeFileCount,
  versionAnchorCount,
  filesWithoutVersions,
}: {
  activeFileCount: number;
  versionAnchorCount: number;
  filesWithoutVersions: AdminRollbackFileStateRow[];
}): AdminRollbackReadinessRow {
  if (activeFileCount > 0 && versionAnchorCount === 0) {
    return {
      id: "version-anchors-missing",
      status: "blocked",
      category: "versions",
      label: "Version restore anchors",
      detail: "No named design-file versions are available for restore.",
      recommendation:
        "Save named versions for important files before production release.",
      count: 0,
      target: null,
    };
  }

  if (filesWithoutVersions.length > 0) {
    return {
      id: "files-without-versions",
      status: "review",
      category: "versions",
      label: "Files without versions",
      detail: `${filesWithoutVersions.length} active files do not have a named version restore point.`,
      recommendation:
        "Create named versions for active release-critical files or document why they are excluded.",
      count: filesWithoutVersions.length,
      target: filesWithoutVersions[0]?.fileName ?? null,
    };
  }

  return {
    id: "version-anchors-ready",
    status: "ready",
    category: "versions",
    label: "Version restore anchors",
    detail: `${versionAnchorCount} recent named versions are available for restore review.`,
    recommendation:
      "Keep version exports paired with release approvals for design rollback traceability.",
    count: versionAnchorCount,
    target: null,
  };
}

function getShareExposureRow({
  staleShares,
  elevatedShares,
}: {
  staleShares: AdminRollbackShareRow[];
  elevatedShares: AdminRollbackShareRow[];
}): AdminRollbackReadinessRow {
  if (staleShares.length > 0) {
    return {
      id: "stale-shares-block-rollback",
      status: "blocked",
      category: "shares",
      label: "Stale public shares",
      detail: `${staleShares.length} active share links are already expired and need cleanup before release.`,
      recommendation:
        "Disable expired links or refresh expiry windows before exporting rollback readiness.",
      count: staleShares.length,
      target: staleShares[0]?.fileName ?? null,
    };
  }

  if (elevatedShares.length > 0) {
    return {
      id: "elevated-share-review",
      status: "review",
      category: "shares",
      label: "Elevated public shares",
      detail: `${elevatedShares.length} live shares allow downloads, comments, review access, or no expiry.`,
      recommendation:
        "Review elevated share links and decide which links should be disabled during rollback.",
      count: elevatedShares.length,
      target: elevatedShares[0]?.fileName ?? null,
    };
  }

  return {
    id: "share-exposure-ready",
    status: "ready",
    category: "shares",
    label: "Public share exposure",
    detail: "No stale or elevated active public shares were found.",
    recommendation:
      "Continue exporting share state with release rollback evidence.",
    count: 0,
    target: null,
  };
}

function getShareAuditRow({
  activeShareCount,
  shareAuditEvents,
}: {
  activeShareCount: number;
  shareAuditEvents: AdminRollbackAuditRow[];
}): AdminRollbackReadinessRow {
  if (activeShareCount > 0 && shareAuditEvents.length === 0) {
    return {
      id: "share-audit-missing",
      status: "review",
      category: "shares",
      label: "Share rollback audit",
      detail: "Active shares exist, but no share disable/restore audit events are loaded.",
      recommendation:
        "Exercise share disable/restore controls before release so rollback ownership is proven.",
      count: 0,
      target: null,
    };
  }

  return {
    id: "share-audit-ready",
    status: "ready",
    category: "shares",
    label: "Share rollback audit",
    detail: `${shareAuditEvents.length} share change audit events are available for rollback review.`,
    recommendation:
      "Use the audit log with this report to verify public link rollback actions.",
    count: shareAuditEvents.length,
    target: shareAuditEvents[0]?.targetLabel ?? null,
  };
}

function getDeploymentRow(
  deploymentUrls: string[],
): AdminRollbackReadinessRow {
  if (deploymentUrls.length === 0) {
    return {
      id: "deployment-link-missing",
      status: "review",
      category: "deployment",
      label: "Vercel deployment link",
      detail: "No production deployment URL is configured in the runtime environment.",
      recommendation:
        "Set VERCEL_PROJECT_PRODUCTION_URL, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, or VERCEL_URL so rollback exports include the current deployment target.",
      count: 0,
      target: null,
    };
  }

  return {
    id: "deployment-link-ready",
    status: "ready",
    category: "deployment",
    label: "Vercel deployment link",
    detail: `${deploymentUrls.length} deployment link is available for release rollback evidence.`,
    recommendation:
      "Pair the deployment link with a release approval snapshot and smoke artifact exports.",
    count: deploymentUrls.length,
    target: deploymentUrls[0] ?? null,
  };
}
