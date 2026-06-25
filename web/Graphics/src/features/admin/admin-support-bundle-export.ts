import type { AdminSupportBundle } from "@/features/admin/admin-support-bundle";

export function getAdminSupportBundleJson(bundle: AdminSupportBundle) {
  return JSON.stringify(bundle, null, 2);
}

export function getAdminSupportBundleCsv(bundle: AdminSupportBundle) {
  return [
    ["section", "id", "label", "status", "detail"].join(","),
    ...bundle.findings.map((finding) =>
      [
        "finding",
        finding.id,
        finding.label,
        finding.status,
        `${finding.value} - ${finding.detail}`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    [
      "privacy",
      bundle.privacy.mode,
      "support bundle privacy",
      bundle.privacy.emailsRedacted ? "redacted" : "diagnostic",
      `retention ${bundle.privacy.retentionDays} days / network ${bundle.privacy.networkDetailsIncluded} / metadata ${bundle.privacy.auditMetadataIncluded}`,
    ]
      .map(escapeCsvCell)
      .join(","),
    ...bundle.users.map((user) =>
      [
        "user",
        user.id,
        user.email,
        user.emailVerified ? "verified" : "pending",
        `${user.files} files / ${user.sessions} sessions`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    ...bundle.files.map((file) =>
      [
        "file",
        file.id,
        file.name,
        file.trashedAt ? "trashed" : "active",
        `${file.ownerEmail} / ${file.publicShareCount} public shares / ${file.openCommentCount} open comments`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    ...bundle.shares.map((share) =>
      [
        "share",
        share.id,
        share.fileName,
        share.disabledAt ? "disabled" : "active",
        `${share.permissionPreset} / downloads ${share.allowDownload} / comments ${share.allowComments} / expires ${share.expiresAt ?? "never"}`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    ...bundle.sessions.map((session) =>
      [
        "session",
        session.id,
        session.userEmail,
        new Date(session.expiresAt).getTime() <= Date.now()
          ? "expired"
          : "active",
        `${session.userAgent ?? "unknown agent"} / ${session.ipAddress ?? "unknown ip"}`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    ...bundle.notificationDeliveries.map((delivery) =>
      [
        "notification",
        delivery.id,
        delivery.recipientEmail,
        delivery.status,
        `${delivery.kind} / ${delivery.fileName}${delivery.reason ? ` / ${delivery.reason}` : ""}`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    ...bundle.auditEvents.map((event) =>
      [
        "audit",
        event.id,
        event.action,
        event.targetType,
        `${event.actorEmail} / ${event.targetLabel} / ${event.createdAt}`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    ...bundle.rollbackEvidence.rows.map((row) =>
      [
        "rollback",
        row.id,
        row.label,
        row.status,
        `${row.count} records / ${row.detail}`,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminSupportBundleMarkdown(bundle: AdminSupportBundle) {
  return [
    "# Admin Support Bundle",
    "",
    `Generated: ${bundle.generatedAt}`,
    `Requested by: ${bundle.requestedBy}`,
    `Scope: ${bundle.scope}`,
    `Target: ${bundle.target.label}`,
    `Status: ${bundle.status}`,
    `Score: ${bundle.score}`,
    "",
    "## Counts",
    "",
    `- Users: ${bundle.summary.users}`,
    `- Files: ${bundle.summary.files}`,
    `- Shares: ${bundle.summary.shares}`,
    `- Sessions: ${bundle.summary.sessions}`,
    `- Audit events: ${bundle.summary.auditEvents}`,
    `- Notification deliveries: ${bundle.summary.notificationDeliveries}`,
    `- Failed notifications: ${bundle.summary.failedNotifications}`,
    `- Rollback rows: ${bundle.summary.rollbackRows}`,
    `- Rollback version anchors: ${bundle.summary.rollbackVersions}`,
    "",
    "## Privacy",
    "",
    `- Mode: ${bundle.privacy.mode}`,
    `- Retention target: ${bundle.privacy.retentionDays} days`,
    `- Emails redacted: ${formatBoolean(bundle.privacy.emailsRedacted)}`,
    `- Network details included: ${formatBoolean(bundle.privacy.networkDetailsIncluded)}`,
    `- Notification reasons included: ${formatBoolean(bundle.privacy.notificationReasonsIncluded)}`,
    `- Audit metadata included: ${formatBoolean(bundle.privacy.auditMetadataIncluded)}`,
    "",
    "## Findings",
    "",
    ...bundle.findings.map(
      (finding) =>
        `- [${finding.status}] ${finding.label}: ${finding.value}. ${finding.detail}`,
    ),
    "",
    "## Users",
    "",
    ...formatRows(
      bundle.users.map(
        (user) =>
          `${user.email} (${user.emailVerified ? "verified" : "pending"}) - ${user.files} files, ${user.sessions} sessions`,
      ),
      "No users matched this support scope.",
    ),
    "",
    "## Files",
    "",
    ...formatRows(
      bundle.files.map(
        (file) =>
          `${file.name} by ${file.ownerEmail} - ${file.publicShareCount} public shares, ${file.openCommentCount} open comments`,
      ),
      "No files matched this support scope.",
    ),
    "",
    "## Public Shares",
    "",
    ...formatRows(
      bundle.shares.map(
        (share) =>
          `${share.fileName} (${share.permissionPreset}) - downloads ${share.allowDownload}, comments ${share.allowComments}, expires ${share.expiresAt ?? "never"}`,
      ),
      "No public shares matched this support scope.",
    ),
    "",
    "## Sessions",
    "",
    ...formatRows(
      bundle.sessions.map(
        (session) =>
          `${session.userEmail} - created ${session.createdAt}, expires ${session.expiresAt}`,
      ),
      "No sessions matched this support scope.",
    ),
    "",
    "## Notification Delivery",
    "",
    ...formatRows(
      bundle.notificationDeliveries.map(
        (delivery) =>
          `${delivery.status}: ${delivery.kind} to ${delivery.recipientEmail} for ${delivery.fileName}${delivery.reason ? ` (${delivery.reason})` : ""}`,
      ),
      "No notification deliveries matched this support scope.",
    ),
    "",
    "## Audit Events",
    "",
    ...formatRows(
      bundle.auditEvents.map(
        (event) =>
          `${event.createdAt}: ${event.actorEmail} ${event.action} ${event.targetType}/${event.targetLabel}`,
      ),
      "No audit events matched this support scope.",
    ),
    "",
    "## Rollback Evidence",
    "",
    `- Status: ${bundle.rollbackEvidence.status}`,
    `- Score: ${bundle.rollbackEvidence.score}`,
    `- Database: ${bundle.rollbackEvidence.database.databaseKind}`,
    `- Deployment links: ${bundle.rollbackEvidence.deploymentUrls.join(", ") || "none"}`,
    "",
    ...bundle.rollbackEvidence.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function formatRows(rows: string[], emptyText: string) {
  return rows.length > 0 ? rows.map((row) => `- ${row}`) : [`- ${emptyText}`];
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
