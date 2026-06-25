import type { AdminFileBrowserDepthReport } from "@/features/admin/admin-file-browser-depth";

export function getAdminFileBrowserDepthJson(report: AdminFileBrowserDepthReport) {
  return JSON.stringify(report, null, 2);
}

export function getAdminFileBrowserDepthCsv(report: AdminFileBrowserDepthReport) {
  return [
    [
      "section",
      "id",
      "status",
      "scope_key",
      "file_name",
      "owner",
      "detail",
      "recommendation",
    ].join(","),
    ...report.permissionMatrices.map((matrix) =>
      [
        "matrix",
        matrix.id,
        matrix.status,
        matrix.scopeKey,
        "",
        `${matrix.ownerCount} owners`,
        `${matrix.fileCount} files, ${matrix.editorCount} editors, ${matrix.pendingAccessRequestCount} access requests`,
        matrix.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    ...report.files.map((file) =>
      [
        "file",
        file.fileId,
        file.status,
        file.scopeKey,
        file.fileName,
        file.ownerEmail,
        `${file.collaboratorCount} collaborators, ${file.riskyShareCount} risky shares, ${file.auditEventCount} audit events`,
        file.recommendation,
      ]
        .map((value) => escapeCsvCell(redactShareTokens(String(value))))
        .join(","),
    ),
    ...report.accessRequestQueue.map((request) =>
      [
        "access_request",
        request.requestId,
        request.status,
        request.scopeKey,
        request.fileName,
        request.targetEmail,
        `${request.currentRole} to ${request.requestedRole}`,
        request.riskReason,
      ]
        .map((value) => escapeCsvCell(redactShareTokens(String(value))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminFileBrowserDepthMarkdown(
  report: AdminFileBrowserDepthReport,
) {
  return [
    "# File Browser Depth",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Files: ${report.readyFileCount} ready, ${report.reviewFileCount} review, ${report.blockedFileCount} blocked`,
    `Permission matrices: ${report.matrixCount}`,
    `Owner transfer queue: ${report.ownerTransferQueueCount}`,
    `Access request queue: ${report.accessRequestQueueCount}`,
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${redactShareTokens(command)}\``),
    "",
    "## Permission Matrices",
    "",
    ...report.permissionMatrices.flatMap((matrix) => [
      `### ${matrix.scopeKey}`,
      "",
      `- Status: ${matrix.status}`,
      `- Files: ${matrix.fileCount}`,
      `- Owners: ${matrix.ownerCount}`,
      `- Collaborators: ${matrix.collaboratorCount}`,
      `- Editors: ${matrix.editorCount}`,
      `- Pending access requests: ${matrix.pendingAccessRequestCount}`,
      `- Audit events: ${matrix.auditEventCount}`,
      `- Recommendation: ${matrix.recommendation}`,
      "",
    ]),
    "## Owner Transfer Queue",
    "",
    ...report.ownerTransferQueue.map((item) =>
      [
        `- [${item.status}] ${item.fileName}`,
        `  - Scope: ${item.scopeKey}`,
        `  - Owner: ${item.ownerEmail}`,
        `  - Reason: ${item.reason}`,
        `  - Candidates: ${item.candidateEmails.join(", ") || "none"}`,
      ].join("\n"),
    ),
    "",
    "## Access Request Queue",
    "",
    ...report.accessRequestQueue.map((item) =>
      [
        `- [${item.status}] ${item.fileName}`,
        `  - Request: ${item.requestId}`,
        `  - Target: ${item.targetEmail}`,
        `  - Role: ${item.currentRole} to ${item.requestedRole}`,
        `  - Risk: ${item.riskReason}`,
      ].join("\n"),
    ),
  ]
    .map(redactShareTokens)
    .join("\n");
}

function redactShareTokens(value: string) {
  return value
    .replace(/\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\b/gi, "[redacted-token]")
    .replace(/\/share\/[A-Za-z0-9_-]+/g, "/share/[redacted-token]");
}

function escapeCsvCell(value: string | number | boolean) {
  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}
