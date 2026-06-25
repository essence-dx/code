import type {
  AdminAuditRow,
  AdminFileRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";
import type { RoleChangeApprovalQueue } from "@/features/admin/admin-role-change-approval";
import type { AdminWorkspaceAccessBudgetCollaborator } from "@/features/admin/admin-workspace-access-budget";

export type AdminFileBrowserDepthStatus = "ready" | "review" | "blocked";

export type AdminFileBrowserDepthPermissionMatrix = {
  id: string;
  status: AdminFileBrowserDepthStatus;
  scopeKey: string;
  teamName: string;
  projectName: string;
  scope: string;
  fileCount: number;
  ownerCount: number;
  collaboratorCount: number;
  editorCount: number;
  commenterCount: number;
  viewerCount: number;
  publicShareCount: number;
  pendingAccessRequestCount: number;
  ownerTransferQueueCount: number;
  auditEventCount: number;
  recommendation: string;
};

export type AdminFileBrowserDepthFile = {
  id: string;
  fileId: string;
  fileName: string;
  status: AdminFileBrowserDepthStatus;
  scopeKey: string;
  teamName: string;
  projectName: string;
  scope: string;
  ownerEmail: string;
  ownerVerified: boolean;
  collaboratorCount: number;
  editorCount: number;
  commenterCount: number;
  viewerCount: number;
  publicShareCount: number;
  riskyShareCount: number;
  pendingAccessRequestCount: number;
  auditEventCount: number;
  ownerTransferStatus: AdminFileBrowserDepthStatus;
  ownerTransferReason: string;
  ownerTransferCandidateEmails: string[];
  recommendation: string;
  latestAt: string | null;
};

export type AdminFileBrowserDepthOwnerTransferQueueItem = {
  id: string;
  status: AdminFileBrowserDepthStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  scopeKey: string;
  reason: string;
  candidateEmails: string[];
  auditEventIds: string[];
  command: string;
};

export type AdminFileBrowserDepthAccessRequestQueueItem = {
  id: string;
  status: AdminFileBrowserDepthStatus;
  requestId: string;
  fileId: string;
  fileName: string;
  requesterEmail: string;
  targetEmail: string;
  currentRole: string;
  requestedRole: string;
  scopeKey: string;
  riskReason: string;
  createdAt: string;
  command: string;
};

export type AdminFileBrowserDepthReport = {
  generatedAt: string;
  status: AdminFileBrowserDepthStatus;
  score: number;
  matrixCount: number;
  fileCount: number;
  readyFileCount: number;
  reviewFileCount: number;
  blockedFileCount: number;
  ownerTransferQueueCount: number;
  accessRequestQueueCount: number;
  auditBackedFileCount: number;
  draftFileCount: number;
  teamFileCount: number;
  permissionMatrices: AdminFileBrowserDepthPermissionMatrix[];
  files: AdminFileBrowserDepthFile[];
  ownerTransferQueue: AdminFileBrowserDepthOwnerTransferQueueItem[];
  accessRequestQueue: AdminFileBrowserDepthAccessRequestQueueItem[];
  commands: string[];
};

export type AdminFileBrowserDepthInput = {
  generatedAt?: string;
  users: AdminUserRow[];
  files: AdminFileRow[];
  collaborators: AdminWorkspaceAccessBudgetCollaborator[];
  shares: AdminShareRow[];
  roleChangeApprovals: Pick<
    RoleChangeApprovalQueue,
    "approvedCount" | "generatedAt" | "pendingCount" | "rejectedCount" | "requests"
  >;
  auditEvents: AdminAuditRow[];
};

export function getAdminFileBrowserDepthReport({
  auditEvents,
  collaborators,
  files,
  generatedAt = new Date().toISOString(),
  roleChangeApprovals,
  shares,
  users,
}: AdminFileBrowserDepthInput): AdminFileBrowserDepthReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const usersByEmail = new Map(
    users.map((user) => [user.email.toLowerCase(), user]),
  );
  const collaboratorsByFile = groupBy(collaborators, (row) => row.fileId);
  const sharesByFile = groupBy(
    shares.filter((share) => !share.disabledAt),
    (share) => share.fileId,
  );
  const pendingRequests = roleChangeApprovals.requests.filter(
    (request) => request.status === "pending",
  );
  const requestsByFile = groupBy(pendingRequests, (request) => request.fileId);
  const auditEventsByFile = getAuditEventsByFile(auditEvents, activeFiles);
  const fileRows = activeFiles.map((file) =>
    getFileDepthRow({
      auditEvents: auditEventsByFile.get(file.id) ?? [],
      collaborators: collaboratorsByFile.get(file.id) ?? [],
      file,
      ownerVerified:
        usersByEmail.get(file.ownerEmail.toLowerCase())?.emailVerified ?? false,
      pendingRequests: requestsByFile.get(file.id) ?? [],
      shares: sharesByFile.get(file.id) ?? [],
    }),
  );
  const ownerTransferQueue = fileRows
    .filter((file) => file.ownerTransferStatus !== "ready")
    .map(createOwnerTransferQueueItem);
  const accessRequestQueue = pendingRequests
    .map((request) =>
      createAccessRequestQueueItem({
        file: fileRows.find((row) => row.fileId === request.fileId) ?? null,
        request,
      }),
    )
    .sort(sortAccessRequests);
  const permissionMatrices = getPermissionMatrices({
    accessRequestQueue,
    files: fileRows,
    ownerTransferQueue,
  });
  const readyFileCount = fileRows.filter((file) => file.status === "ready")
    .length;
  const reviewFileCount = fileRows.filter((file) => file.status === "review")
    .length;
  const blockedFileCount = fileRows.filter((file) => file.status === "blocked")
    .length;
  const auditBackedFileCount = fileRows.filter(
    (file) => file.auditEventCount > 0,
  ).length;

  return {
    generatedAt,
    status:
      blockedFileCount > 0
        ? "blocked"
        : reviewFileCount > 0
          ? "review"
          : "ready",
    score: Math.max(0, 100 - blockedFileCount * 14 - reviewFileCount * 5),
    matrixCount: permissionMatrices.length,
    fileCount: fileRows.length,
    readyFileCount,
    reviewFileCount,
    blockedFileCount,
    ownerTransferQueueCount: ownerTransferQueue.length,
    accessRequestQueueCount: accessRequestQueue.length,
    auditBackedFileCount,
    draftFileCount: fileRows.filter((file) => file.scope === "draft").length,
    teamFileCount: fileRows.filter((file) => file.scope === "team").length,
    permissionMatrices,
    files: fileRows.sort(sortFiles),
    ownerTransferQueue: ownerTransferQueue.sort(sortOwnerTransferQueue),
    accessRequestQueue,
    commands: [
      "bun run admin:file-browser-depth-smoke",
      "Export Admin > File browser depth JSON.",
      "Export Admin > File browser depth CSV.",
      "Export Admin > File browser depth Markdown.",
      "Review Files > permission matrices before owner transfer or role approval.",
    ],
  };
}

function getFileDepthRow({
  auditEvents,
  collaborators,
  file,
  ownerVerified,
  pendingRequests,
  shares,
}: {
  auditEvents: AdminAuditRow[];
  collaborators: AdminWorkspaceAccessBudgetCollaborator[];
  file: AdminFileRow;
  ownerVerified: boolean;
  pendingRequests: RoleChangeApprovalQueue["requests"];
  shares: AdminShareRow[];
}): AdminFileBrowserDepthFile {
  const riskyShareCount = shares.filter(
    (share) => share.allowDownload || !share.expiresAt || share.allowComments,
  ).length;
  const editorCandidates = collaborators
    .filter(
      (collaborator) =>
        collaborator.role === "editor" &&
        collaborator.collaboratorEmail.toLowerCase() !==
          file.ownerEmail.toLowerCase(),
    )
    .map((collaborator) => collaborator.collaboratorEmail);
  const ownerTransferStatus = getOwnerTransferStatus({
    editorCandidateCount: editorCandidates.length,
    file,
    ownerVerified,
    riskyShareCount,
  });
  const accessStatus: AdminFileBrowserDepthStatus =
    pendingRequests.some((request) => request.requestedRole === "editor") &&
    riskyShareCount > 0
      ? "blocked"
      : pendingRequests.length > 0 || riskyShareCount > 0
        ? "review"
        : "ready";
  const status = getWorstStatus([ownerTransferStatus, accessStatus]);

  return {
    id: `file-depth-${file.id}`,
    fileId: file.id,
    fileName: file.name,
    status,
    scopeKey: getScopeKey(file),
    teamName: file.teamName,
    projectName: file.projectName,
    scope: file.scope,
    ownerEmail: file.ownerEmail,
    ownerVerified,
    collaboratorCount: file.collaboratorCount,
    editorCount: file.editorCount,
    commenterCount: file.commenterCount,
    viewerCount: file.viewerCount,
    publicShareCount: file.publicShareCount,
    riskyShareCount,
    pendingAccessRequestCount: pendingRequests.length,
    auditEventCount: auditEvents.length,
    ownerTransferStatus,
    ownerTransferReason: getOwnerTransferReason({
      editorCandidateCount: editorCandidates.length,
      file,
      ownerVerified,
      riskyShareCount,
    }),
    ownerTransferCandidateEmails: uniqueStrings(editorCandidates),
    recommendation: getFileRecommendation({
      ownerTransferStatus,
      pendingRequestCount: pendingRequests.length,
      riskyShareCount,
    }),
    latestAt: maxDate([
      file.updatedAt,
      ...auditEvents.map((event) => event.createdAt),
      ...pendingRequests.map((request) => request.createdAt),
    ]),
  };
}

function getPermissionMatrices({
  accessRequestQueue,
  files,
  ownerTransferQueue,
}: {
  accessRequestQueue: AdminFileBrowserDepthAccessRequestQueueItem[];
  files: AdminFileBrowserDepthFile[];
  ownerTransferQueue: AdminFileBrowserDepthOwnerTransferQueueItem[];
}) {
  const filesByScope = groupBy(files, (file) => file.scopeKey);

  return [...filesByScope.entries()]
    .map(([scopeKey, scopedFiles]) => {
      const first = scopedFiles[0];
      const pendingAccessRequestCount = accessRequestQueue.filter(
        (item) => item.scopeKey === scopeKey,
      ).length;
      const ownerTransferQueueCount = ownerTransferQueue.filter(
        (item) => item.scopeKey === scopeKey,
      ).length;
      const status = getWorstStatus(scopedFiles.map((file) => file.status));

      return {
        id: `permission-matrix-${slugify(scopeKey)}`,
        status,
        scopeKey,
        teamName: first?.teamName ?? "Personal",
        projectName: first?.projectName ?? "Drafts",
        scope: first?.scope ?? "private",
        fileCount: scopedFiles.length,
        ownerCount: new Set(scopedFiles.map((file) => file.ownerEmail)).size,
        collaboratorCount: sum(scopedFiles, (file) => file.collaboratorCount),
        editorCount: sum(scopedFiles, (file) => file.editorCount),
        commenterCount: sum(scopedFiles, (file) => file.commenterCount),
        viewerCount: sum(scopedFiles, (file) => file.viewerCount),
        publicShareCount: sum(scopedFiles, (file) => file.publicShareCount),
        pendingAccessRequestCount,
        ownerTransferQueueCount,
        auditEventCount: sum(scopedFiles, (file) => file.auditEventCount),
        recommendation: getMatrixRecommendation({
          ownerTransferQueueCount,
          pendingAccessRequestCount,
          publicShareCount: sum(scopedFiles, (file) => file.publicShareCount),
          status,
        }),
      } satisfies AdminFileBrowserDepthPermissionMatrix;
    })
    .sort(sortMatrices);
}

function createOwnerTransferQueueItem(
  file: AdminFileBrowserDepthFile,
): AdminFileBrowserDepthOwnerTransferQueueItem {
  return {
    id: `owner-transfer-${file.fileId}`,
    status: file.ownerTransferStatus,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    scopeKey: file.scopeKey,
    reason: file.ownerTransferReason,
    candidateEmails: file.ownerTransferCandidateEmails,
    auditEventIds: [],
    command: "Review Files > owner transfer readiness before changing ownership.",
  };
}

function createAccessRequestQueueItem({
  file,
  request,
}: {
  file: AdminFileBrowserDepthFile | null;
  request: RoleChangeApprovalQueue["requests"][number];
}): AdminFileBrowserDepthAccessRequestQueueItem {
  const riskyEditorRequest =
    request.requestedRole === "editor" && (file?.riskyShareCount ?? 0) > 0;

  return {
    id: `access-request-${request.requestId}`,
    status: riskyEditorRequest ? "blocked" : "review",
    requestId: request.requestId,
    fileId: request.fileId,
    fileName: request.fileName,
    requesterEmail: request.requesterEmail,
    targetEmail: request.targetEmail,
    currentRole: request.currentRole,
    requestedRole: request.requestedRole,
    scopeKey: file?.scopeKey ?? "Unknown / Unknown / unknown",
    riskReason: riskyEditorRequest
      ? "Editor access is requested while public or download-enabled share exposure is open."
      : "Pending access request needs reviewer decision.",
    createdAt: request.createdAt,
    command: "Review Admin > role-change approval queue.",
  };
}

function getAuditEventsByFile(auditEvents: AdminAuditRow[], files: AdminFileRow[]) {
  const fileIds = new Set(files.map((file) => file.id));
  const fileNames = new Map(files.map((file) => [file.name, file.id]));
  const eventsByFile = new Map<string, AdminAuditRow[]>();

  for (const event of auditEvents) {
    const metadataFileId = readString(event.metadata.fileId);
    const fileId =
      (metadataFileId && fileIds.has(metadataFileId) ? metadataFileId : null) ??
      (fileIds.has(event.targetId) ? event.targetId : null) ??
      fileNames.get(event.targetLabel) ??
      null;

    if (!fileId) {
      continue;
    }

    eventsByFile.set(fileId, [...(eventsByFile.get(fileId) ?? []), event]);
  }

  return eventsByFile;
}

function getOwnerTransferStatus({
  editorCandidateCount,
  file,
  ownerVerified,
  riskyShareCount,
}: {
  editorCandidateCount: number;
  file: AdminFileRow;
  ownerVerified: boolean;
  riskyShareCount: number;
}): AdminFileBrowserDepthStatus {
  if (!ownerVerified || file.brokenPrototypeCount > 0) {
    return "blocked";
  }

  if (file.scope !== "draft" && editorCandidateCount === 0) {
    return "review";
  }

  return riskyShareCount > 0 || file.openCommentCount > 0 ? "review" : "ready";
}

function getOwnerTransferReason({
  editorCandidateCount,
  file,
  ownerVerified,
  riskyShareCount,
}: {
  editorCandidateCount: number;
  file: AdminFileRow;
  ownerVerified: boolean;
  riskyShareCount: number;
}) {
  if (!ownerVerified) {
    return "Current owner email is unverified, so transfer readiness needs access review.";
  }

  if (file.brokenPrototypeCount > 0) {
    return "Broken prototype evidence should be resolved before transfer.";
  }

  if (file.scope !== "draft" && editorCandidateCount === 0) {
    return "No editor collaborator is available as an owner-transfer candidate.";
  }

  if (riskyShareCount > 0) {
    return "Public share exposure should be reviewed before transfer.";
  }

  if (file.openCommentCount > 0) {
    return "Open comments should be assigned or resolved before transfer.";
  }

  return "Owner transfer prerequisites are ready.";
}

function getFileRecommendation({
  ownerTransferStatus,
  pendingRequestCount,
  riskyShareCount,
}: {
  ownerTransferStatus: AdminFileBrowserDepthStatus;
  pendingRequestCount: number;
  riskyShareCount: number;
}) {
  if (ownerTransferStatus === "blocked") {
    return "Clear owner verification or prototype blockers before transfer.";
  }

  if (pendingRequestCount > 0) {
    return "Review pending access requests against this file's permission matrix.";
  }

  if (riskyShareCount > 0) {
    return "Tighten public share expiry, comments, or download posture.";
  }

  return "Keep this file in the normal browser rotation.";
}

function getMatrixRecommendation({
  ownerTransferQueueCount,
  pendingAccessRequestCount,
  publicShareCount,
  status,
}: {
  ownerTransferQueueCount: number;
  pendingAccessRequestCount: number;
  publicShareCount: number;
  status: AdminFileBrowserDepthStatus;
}) {
  if (status === "blocked") {
    return "Clear owner-transfer blockers before approving broader access in this scope.";
  }

  if (pendingAccessRequestCount > 0) {
    return "Decide pending access requests with this permission matrix open.";
  }

  if (ownerTransferQueueCount > 0 || publicShareCount > 0) {
    return "Review owner-transfer candidates and public links before publication.";
  }

  return "Scope permissions are ready for normal file browsing.";
}

function getScopeKey(file: Pick<AdminFileRow, "projectName" | "scope" | "teamName">) {
  return `${file.teamName || "Personal"} / ${file.projectName || "Drafts"} / ${file.scope || "private"}`;
}

function getWorstStatus(statuses: AdminFileBrowserDepthStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function maxDate(values: Array<string | null | undefined>) {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return sorted[0] ?? null;
}

function groupBy<T>(values: T[], getKey: (value: T) => string) {
  const groups = new Map<string, T[]>();

  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return groups;
}

function sum<T>(values: T[], getValue: (value: T) => number) {
  return values.reduce((total, value) => total + getValue(value), 0);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sortMatrices(
  left: AdminFileBrowserDepthPermissionMatrix,
  right: AdminFileBrowserDepthPermissionMatrix,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.fileCount - left.fileCount ||
    left.scopeKey.localeCompare(right.scopeKey)
  );
}

function sortFiles(left: AdminFileBrowserDepthFile, right: AdminFileBrowserDepthFile) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    new Date(right.latestAt ?? 0).getTime() - new Date(left.latestAt ?? 0).getTime()
  );
}

function sortOwnerTransferQueue(
  left: AdminFileBrowserDepthOwnerTransferQueueItem,
  right: AdminFileBrowserDepthOwnerTransferQueueItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.scopeKey.localeCompare(right.scopeKey)
  );
}

function sortAccessRequests(
  left: AdminFileBrowserDepthAccessRequestQueueItem,
  right: AdminFileBrowserDepthAccessRequestQueueItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function statusWeight(status: AdminFileBrowserDepthStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

export {
  getAdminFileBrowserDepthCsv,
  getAdminFileBrowserDepthJson,
  getAdminFileBrowserDepthMarkdown,
} from "@/features/admin/admin-file-browser-depth-export";
