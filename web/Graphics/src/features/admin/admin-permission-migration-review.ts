import type {
  AdminPermissionMigration,
  AdminPermissionMigrationBranchSource,
  AdminPermissionMigrationCategory,
  AdminPermissionMigrationCollaborator,
  AdminPermissionMigrationComponentFileSource,
  AdminPermissionMigrationFile,
  AdminPermissionMigrationLibraryFileSource,
  AdminPermissionMigrationReviewInput,
  AdminPermissionMigrationReviewReport,
  AdminPermissionMigrationReviewRow,
  AdminPermissionMigrationShare,
  AdminPermissionMigrationStatus,
} from "@/features/admin/admin-permission-migration-review-types";

export function getAdminPermissionMigrationReviewReport({
  collaborators,
  designBranches,
  files,
  generatedAt = new Date().toISOString(),
  libraryReleaseGates,
  libraryRolloutMonitor,
  shares,
}: AdminPermissionMigrationReviewInput): AdminPermissionMigrationReviewReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const activeFileIds = new Set(activeFiles.map((file) => file.id));
  const activeCollaborators = collaborators.filter((collaborator) =>
    activeFileIds.has(collaborator.fileId),
  );
  const migrations = [
    ...getFileMigrations(activeFiles, activeCollaborators),
    ...getShareMigrations(shares),
    ...getBranchMigrations(designBranches.records),
    ...getLibraryMigrations(libraryRolloutMonitor.files),
    ...getComponentMigrations(libraryReleaseGates.files),
  ].sort(sortMigrations);
  const rows = getMigrationRows(migrations);
  const blockedCount = migrations.filter((item) => item.status === "blocked")
    .length;
  const reviewCount = migrations.filter((item) => item.status === "review")
    .length;
  const readyCount = migrations.filter((item) => item.status === "ready").length;

  return {
    generatedAt,
    status: getWorstStatus(migrations.map((migration) => migration.status)),
    score: Math.max(0, 100 - blockedCount * 12 - reviewCount * 4),
    migrationCount: migrations.length,
    readyCount,
    reviewCount,
    blockedCount,
    fileMigrationCount: countCategory(migrations, "file"),
    shareMigrationCount: countCategory(migrations, "share"),
    branchMigrationCount: countCategory(migrations, "branch"),
    libraryMigrationCount: countCategory(migrations, "library"),
    componentMigrationCount: countCategory(migrations, "component"),
    leastPrivilegeRecommendationCount: migrations.filter((migration) =>
      migration.leastPrivilegeRecommendation.toLowerCase().includes("least privilege"),
    ).length,
    migrations,
    rows,
    commands: getPermissionMigrationCommands(),
  };
}

function getFileMigrations(
  files: AdminPermissionMigrationFile[],
  collaborators: AdminPermissionMigrationCollaborator[],
) {
  const collaboratorsByFile = groupBy(collaborators, (row) => row.fileId);

  return files.flatMap((file) => {
    const fileCollaborators = collaboratorsByFile.get(file.id) ?? [];
    const editors = fileCollaborators.filter((row) => row.role === "editor");
    const externalEditors = editors.filter(
      (row) => getDomain(row.collaboratorEmail) !== getDomain(file.ownerEmail),
    );
    const migrations: AdminPermissionMigration[] = [];

    if (file.editorCount > 2 || externalEditors.length > 0) {
      migrations.push({
        id: `file-${file.id}-editor-migration`,
        category: "file",
        status: externalEditors.length > 0 || file.editorCount > 4 ? "blocked" : "review",
        surface: "File collaborators",
        fileId: file.id,
        fileName: file.name,
        ownerEmail: file.ownerEmail,
        currentAccess: `${file.editorCount} editors / ${file.collaboratorCount} collaborators`,
        targetAccess: "Owner plus active implementation editors; reviewers as commenters or viewers.",
        risk:
          externalEditors.length > 0
            ? `${externalEditors.length} external editor grant${externalEditors.length === 1 ? "" : "s"} can change production design files.`
            : "Editor access is broader than the active collaboration need.",
        leastPrivilegeRecommendation:
          "Apply least privilege by downgrading non-building collaborators to commenter and external launch reviewers to viewer unless they are actively editing.",
        evidenceCount: file.editorCount + externalEditors.length,
        latestAt: latestIso([
          file.updatedAt,
          ...fileCollaborators.map((collaborator) => collaborator.updatedAt),
        ]),
      });
    }

    if (file.publicShareCount > 0 || file.downloadShareCount > 0) {
      migrations.push({
        id: `file-${file.id}-share-policy-migration`,
        category: "file",
        status: file.downloadShareCount > 0 ? "blocked" : "review",
        surface: "File share defaults",
        fileId: file.id,
        fileName: file.name,
        ownerEmail: file.ownerEmail,
        currentAccess: `${file.publicShareCount} public shares / ${file.downloadShareCount} download-enabled`,
        targetAccess: "Internal collaborator roles first; public links only for scoped review handoff.",
        risk: "File-level share posture allows broad access outside explicit collaborator grants.",
        leastPrivilegeRecommendation:
          "Apply least privilege by replacing broad file-level public sharing with named collaborators or expiring review links.",
        evidenceCount: file.publicShareCount + file.downloadShareCount,
        latestAt: file.updatedAt,
      });
    }

    return migrations;
  });
}

function getShareMigrations(shares: AdminPermissionMigrationShare[]) {
  return shares
    .filter((share) => !share.disabledAt)
    .filter(
      (share) => share.allowDownload || share.allowComments || !share.expiresAt,
    )
    .map<AdminPermissionMigration>((share) => ({
      id: `share-${share.id}-least-privilege`,
      category: "share",
      status: share.allowDownload && !share.expiresAt ? "blocked" : "review",
      surface: "Public share link",
      fileId: share.fileId,
      fileName: share.fileName,
      ownerEmail: share.ownerEmail,
      currentAccess: [
        share.permissionPreset,
        share.accessLevel,
        share.allowComments ? "comments on" : "comments off",
        share.allowDownload ? "download on" : "download off",
        share.expiresAt ? "expires" : "no expiry",
      ].join(" / "),
      targetAccess: "Viewer or prototype-only link with expiry, comments by need, and downloads off.",
      risk: "Public link settings are broader than a least-privilege handoff requires.",
      leastPrivilegeRecommendation:
        "Apply least privilege by disabling downloads, setting an expiry, and limiting comments to active review windows.",
      evidenceCount: [
        share.allowDownload,
        share.allowComments,
        !share.expiresAt,
      ].filter(Boolean).length,
      latestAt: share.createdAt,
    }));
}

function getBranchMigrations(branches: AdminPermissionMigrationBranchSource[]) {
  return branches
    .filter(
      (branch) =>
        branch.branchStatus === "active" ||
        branch.mergeIntent === "review" ||
        branch.mergeIntent === "release-candidate",
    )
    .filter(
      (branch) =>
        !branch.hasRestorePoint ||
        branch.updatedAgeDays > 7 ||
        branch.mergeIntent === "release-candidate",
    )
    .map<AdminPermissionMigration>((branch) => ({
      id: `branch-${branch.id}-merge-permission`,
      category: "branch",
      status:
        branch.mergeIntent === "release-candidate" && !branch.hasRestorePoint
          ? "blocked"
          : "review",
      surface: "Branch merge permissions",
      fileId: branch.fileId,
      fileName: branch.fileName,
      ownerEmail: branch.ownerEmail,
      currentAccess: `${branch.branchName} / ${branch.mergeIntent} / ${branch.branchStatus}`,
      targetAccess: "Named reviewer approval, restore point, and owner-scoped merge before publication.",
      risk:
        !branch.hasRestorePoint
          ? "Branch can be merged without a verified restore point."
          : "Branch merge intent needs reviewer-scoped permission before migration.",
      leastPrivilegeRecommendation:
        "Apply least privilege by allowing only branch owners and assigned reviewers to merge release-candidate branches.",
      evidenceCount: [
        !branch.hasRestorePoint,
        branch.updatedAgeDays > 7,
        branch.mergeIntent === "release-candidate",
      ].filter(Boolean).length,
      latestAt: branch.updatedAt,
    }));
}

function getLibraryMigrations(files: AdminPermissionMigrationLibraryFileSource[]) {
  return files
    .filter(
      (file) =>
        file.updateAvailableComponentCount > 0 ||
        file.subscriptionDriftCount > 0 ||
        file.orphanSubscriptionCount > 0 ||
        file.releaseAdoptionPercent < 80,
    )
    .map<AdminPermissionMigration>((file) => ({
      id: `library-${file.fileId}-rollout-permission`,
      category: "library",
      status:
        file.orphanSubscriptionCount > 0 || file.subscriptionDriftCount > 1
          ? "blocked"
          : "review",
      surface: "Library subscription permissions",
      fileId: file.fileId,
      fileName: file.fileName,
      ownerEmail: file.ownerEmail,
      currentAccess: `${file.subscribedComponentCount} subscribed components / ${file.updateAvailableComponentCount} updates / ${file.releaseAdoptionPercent}% adopted`,
      targetAccess: "Subscribed files migrate through approved library update queues.",
      risk: "Library consumers can drift away from governed component releases.",
      leastPrivilegeRecommendation:
        "Apply least privilege by routing library updates through maintainers and limiting subscription changes to component owners.",
      evidenceCount:
        file.updateAvailableComponentCount +
        file.subscriptionDriftCount +
        file.orphanSubscriptionCount,
      latestAt: file.latestSubscriptionAt,
    }));
}

function getComponentMigrations(files: AdminPermissionMigrationComponentFileSource[]) {
  return files
    .filter(
      (file) =>
        file.readinessStatus !== "ready" ||
        file.detachedInstanceCount > 0 ||
        file.pendingUpdateInstanceCount > 0 ||
        file.tokenCoveragePercent < 80,
    )
    .map<AdminPermissionMigration>((file) => ({
      id: `component-${file.fileId}-permission-migration`,
      category: "component",
      status: file.readinessStatus,
      surface: "Component library permissions",
      fileId: file.fileId,
      fileName: file.fileName,
      ownerEmail: file.ownerEmail,
      currentAccess: `${file.componentCount} components / ${file.pendingUpdateInstanceCount} pending updates / ${file.detachedInstanceCount} detached instances`,
      targetAccess: "Maintainer-approved component publishing with reviewer-only consumer updates.",
      risk: "Component edits and detached instances can bypass governed release ownership.",
      leastPrivilegeRecommendation:
        "Apply least privilege by limiting component publish rights to maintainers and moving consumers to review-only update approvals.",
      evidenceCount:
        file.readinessBlockedCount +
        file.readinessReviewCount +
        file.pendingUpdateInstanceCount +
        file.detachedInstanceCount,
      latestAt: null,
    }));
}

function getMigrationRows(
  migrations: AdminPermissionMigration[],
): AdminPermissionMigrationReviewRow[] {
  const categories: AdminPermissionMigrationCategory[] = [
    "file",
    "share",
    "branch",
    "library",
    "component",
  ];

  return categories.map((category) => {
    const categoryMigrations = migrations.filter(
      (migration) => migration.category === category,
    );
    const status = getWorstStatus(
      categoryMigrations.map((migration) => migration.status),
    );

    return {
      id: `permission-migration-${category}`,
      category,
      status,
      label: formatCategory(category),
      value: `${categoryMigrations.length} migrations`,
      detail:
        categoryMigrations.length > 0
          ? `${categoryMigrations.length} ${formatCategory(category).toLowerCase()} migration rows need least-privilege review.`
          : `No ${formatCategory(category).toLowerCase()} migration rows need review.`,
      recommendation:
        categoryMigrations.length > 0
          ? "Review every migration row and apply least privilege before approving broad workspace access."
          : "Keep the current least-privilege posture for this surface.",
      count: categoryMigrations.length,
      target: categoryMigrations[0]?.fileName ?? null,
      latestAt: latestIso(categoryMigrations.map((migration) => migration.latestAt)),
    };
  });
}

function countCategory(
  migrations: AdminPermissionMigration[],
  category: AdminPermissionMigrationCategory,
) {
  return migrations.filter((migration) => migration.category === category).length;
}

function getPermissionMigrationCommands() {
  return [
    "bun run admin:permission-migration-smoke",
    "Export Admin > Permission migration review JSON.",
    "Export Admin > Permission migration review CSV.",
    "Export Admin > Permission migration review Markdown.",
    "Review Admin > Files permission migration before approving role or release changes.",
  ];
}

function getWorstStatus(statuses: AdminPermissionMigrationStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function groupBy<Value>(
  values: Value[],
  getKey: (value: Value) => string,
) {
  const groups = new Map<string, Value[]>();

  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return groups;
}

function latestIso(values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

function getDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function formatCategory(category: AdminPermissionMigrationCategory) {
  const labels: Record<AdminPermissionMigrationCategory, string> = {
    branch: "Branch permissions",
    component: "Component permissions",
    file: "File permissions",
    library: "Library permissions",
    share: "Share permissions",
  };

  return labels[category];
}

function statusWeight(status: AdminPermissionMigrationStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortMigrations(
  left: AdminPermissionMigration,
  right: AdminPermissionMigration,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.evidenceCount - left.evidenceCount ||
    left.fileName.localeCompare(right.fileName)
  );
}

export {
  getAdminPermissionMigrationReviewCsv,
  getAdminPermissionMigrationReviewJson,
  getAdminPermissionMigrationReviewMarkdown,
} from "@/features/admin/admin-permission-migration-review-export";

export type {
  AdminPermissionMigration,
  AdminPermissionMigrationCategory,
  AdminPermissionMigrationCollaborator,
  AdminPermissionMigrationFile,
  AdminPermissionMigrationReviewInput,
  AdminPermissionMigrationReviewReport,
  AdminPermissionMigrationReviewRow,
  AdminPermissionMigrationShare,
  AdminPermissionMigrationStatus,
} from "@/features/admin/admin-permission-migration-review-types";
