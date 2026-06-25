import type {
  AdminAuditRow,
  AdminFileRow,
  AdminNotificationDeliveryRow,
  AdminSessionRiskRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";
import type { AdminRollbackVersionRow } from "@/features/admin/admin-rollback-readiness";
import type { AdminSupportBundleScope } from "@/features/admin/admin-support-bundle";

export type AdminSupportBundleRelatedEntities = {
  emails: Set<string>;
  fileIds: Set<string>;
  shareIds: Set<string>;
  userIds: Set<string>;
};

export function getAdminSupportBundleRelatedEntities({
  files,
  scope,
  selectedFile,
  selectedShare,
  selectedUser,
  shares,
  users,
}: {
  files: AdminFileRow[];
  scope: AdminSupportBundleScope;
  selectedFile: AdminFileRow | null;
  selectedShare: AdminShareRow | null;
  selectedUser: AdminUserRow | null;
  shares: AdminShareRow[];
  users: AdminUserRow[];
}): AdminSupportBundleRelatedEntities {
  const emails = new Set<string>();
  const fileIds = new Set<string>();
  const shareIds = new Set<string>();
  const userIds = new Set<string>();

  if (scope === "user" && selectedUser) {
    userIds.add(selectedUser.id);
    emails.add(selectedUser.email);
  }

  if (scope === "file" && selectedFile) {
    fileIds.add(selectedFile.id);
    emails.add(selectedFile.ownerEmail);
  }

  if (scope === "share" && selectedShare) {
    shareIds.add(selectedShare.id);
    fileIds.add(selectedShare.fileId);
    emails.add(selectedShare.ownerEmail);
  }

  for (const file of files) {
    if (emails.has(file.ownerEmail)) {
      fileIds.add(file.id);
    }
  }

  for (const share of shares) {
    if (emails.has(share.ownerEmail) || fileIds.has(share.fileId)) {
      shareIds.add(share.id);
      fileIds.add(share.fileId);
      emails.add(share.ownerEmail);
    }
  }

  for (const user of users) {
    if (emails.has(user.email)) {
      userIds.add(user.id);
    }
  }

  return { emails, fileIds, shareIds, userIds };
}

export function getScopedSupportUsers(
  rows: AdminUserRow[],
  related: AdminSupportBundleRelatedEntities,
  scope: AdminSupportBundleScope,
) {
  return scope === "workspace"
    ? rows
    : rows.filter(
        (row) => related.userIds.has(row.id) || related.emails.has(row.email),
      );
}

export function getScopedSupportFiles(
  rows: AdminFileRow[],
  related: AdminSupportBundleRelatedEntities,
  scope: AdminSupportBundleScope,
) {
  return scope === "workspace"
    ? rows
    : rows.filter(
        (row) => related.fileIds.has(row.id) || related.emails.has(row.ownerEmail),
      );
}

export function getScopedSupportShares(
  rows: AdminShareRow[],
  related: AdminSupportBundleRelatedEntities,
  scope: AdminSupportBundleScope,
) {
  return scope === "workspace"
    ? rows
    : rows.filter(
        (row) =>
          related.shareIds.has(row.id) ||
          related.fileIds.has(row.fileId) ||
          related.emails.has(row.ownerEmail),
      );
}

export function getScopedSupportSessions(
  rows: AdminSessionRiskRow[],
  related: AdminSupportBundleRelatedEntities,
  scope: AdminSupportBundleScope,
) {
  return scope === "workspace"
    ? rows
    : rows.filter((row) => related.emails.has(row.userEmail));
}

export function getScopedSupportNotifications(
  rows: AdminNotificationDeliveryRow[],
  related: AdminSupportBundleRelatedEntities,
  scope: AdminSupportBundleScope,
) {
  return scope === "workspace"
    ? rows
    : rows.filter(
        (row) =>
          related.fileIds.has(row.fileId) ||
          related.emails.has(row.ownerEmail) ||
          related.emails.has(row.recipientEmail),
      );
}

export function getScopedSupportAuditEvents(
  rows: AdminAuditRow[],
  related: AdminSupportBundleRelatedEntities,
  scope: AdminSupportBundleScope,
) {
  return scope === "workspace"
    ? rows
    : rows.filter(
        (row) =>
          related.userIds.has(row.targetId) ||
          related.fileIds.has(row.targetId) ||
          related.shareIds.has(row.targetId) ||
          related.emails.has(row.actorEmail) ||
          hasRelatedLabel(row.targetLabel, related.emails),
      );
}

export function getScopedSupportRollbackVersions(
  rows: AdminRollbackVersionRow[],
  related: AdminSupportBundleRelatedEntities,
  scope: AdminSupportBundleScope,
) {
  return scope === "workspace"
    ? rows
    : rows.filter(
        (row) =>
          related.fileIds.has(row.fileId) || related.emails.has(row.ownerEmail),
      );
}

function hasRelatedLabel(label: string, emails: Set<string>) {
  const normalized = label.toLowerCase();

  for (const email of emails) {
    if (normalized.includes(email.toLowerCase())) {
      return true;
    }
  }

  return false;
}
