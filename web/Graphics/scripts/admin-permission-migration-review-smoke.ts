import {
  getAdminPermissionMigrationReviewMarkdown,
  getAdminPermissionMigrationReviewReport,
} from "../src/features/admin/admin-permission-migration-review";

const report = getAdminPermissionMigrationReviewReport({
  generatedAt: "2026-05-18T09:00:00.000Z",
  files: [
    {
      id: "file-1",
      name: "Checkout launch",
      ownerEmail: "sam@example.com",
      scope: "team",
      teamName: "Product",
      projectName: "Checkout",
      collaboratorCount: 8,
      editorCount: 5,
      commenterCount: 2,
      viewerCount: 1,
      publicShareCount: 2,
      staleShareCount: 1,
      downloadShareCount: 1,
      reviewShareCount: 1,
      updatedAt: "2026-05-18T08:30:00.000Z",
      trashedAt: null,
    },
  ],
  collaborators: [
    {
      fileId: "file-1",
      fileName: "Checkout launch",
      ownerEmail: "sam@example.com",
      userId: "user-1",
      collaboratorEmail: "external@vendor.dev",
      collaboratorName: "External Vendor",
      role: "editor",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
    {
      fileId: "file-1",
      fileName: "Checkout launch",
      ownerEmail: "sam@example.com",
      userId: "user-2",
      collaboratorEmail: "reviewer@example.com",
      collaboratorName: "Reviewer",
      role: "editor",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-15T00:00:00.000Z",
    },
  ],
  shares: [
    {
      id: "share-1",
      fileId: "file-1",
      fileName: "Checkout launch",
      ownerEmail: "sam@example.com",
      accessLevel: "viewer",
      permissionPreset: "review",
      allowComments: true,
      allowDownload: true,
      createdAt: "2026-05-10T00:00:00.000Z",
      expiresAt: null,
      disabledAt: null,
    },
  ],
  designBranches: {
    generatedAt: "2026-05-18T08:45:00.000Z",
    status: "blocked",
    score: 56,
    branchCount: 1,
    activeBranchCount: 1,
    reviewIntentCount: 1,
    missingRestorePointCount: 1,
    staleBranchCount: 1,
    commands: ["Export design branches."],
    records: [
      {
        id: "branch-1",
        fileId: "file-1",
        fileName: "Checkout launch",
        ownerEmail: "sam@example.com",
        branchName: "Checkout risky copy",
        branchStatus: "active",
        mergeIntent: "release-candidate",
        sourceFileId: "file-1",
        sourceFileName: "Checkout launch",
        sourceVersionId: "version-1",
        sourceVersionName: "Before launch",
        restorePointVersionId: null,
        restorePointName: "Missing restore point",
        hasRestorePoint: false,
        activityCount: 0,
        ageDays: 18,
        updatedAgeDays: 14,
        createdAt: "2026-04-30T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z",
      },
    ],
    rows: [],
  },
  libraryReleaseGates: {
    generatedAt: "2026-05-18T08:46:00.000Z",
    status: "blocked",
    score: 62,
    componentFileCount: 1,
    componentCount: 12,
    blockedLibraryFileCount: 1,
    reviewLibraryFileCount: 0,
    tokenCoveragePercent: 42,
    rows: [
      {
        id: "component-readiness",
        status: "blocked",
        category: "components",
        label: "Component readiness",
        value: "blocked",
        detail: "Component release is blocked.",
        recommendation: "Gate release to library maintainers.",
        target: "Checkout launch",
      },
    ],
    files: [
      {
        fileId: "file-1",
        fileName: "Checkout launch",
        ownerEmail: "sam@example.com",
        componentCount: 12,
        readinessScore: 62,
        readinessStatus: "blocked",
        readinessLabel: "Needs review",
        readinessBlockedCount: 2,
        readinessReviewCount: 1,
        tokenCoveragePercent: 42,
        tokenBindablePropertyCount: 20,
        tokenBoundPropertyCount: 8,
        tokenMatchingRawPropertyCount: 4,
        pendingUpdateInstanceCount: 9,
        detachedInstanceCount: 4,
      },
    ],
  },
  libraryRolloutMonitor: {
    generatedAt: "2026-05-18T08:47:00.000Z",
    status: "review",
    score: 74,
    subscribedComponentCount: 14,
    updateAvailableComponentCount: 5,
    detachedComponentCount: 3,
    subscriptionDriftCount: 2,
    orphanSubscriptionCount: 1,
    releaseAdoptionPercent: 64,
    rows: [],
    files: [
      {
        fileId: "file-1",
        fileName: "Checkout launch",
        ownerEmail: "sam@example.com",
        publishedLibraryCount: 1,
        librarySubscriptionCount: 2,
        subscribedComponentCount: 14,
        subscribedInstanceCount: 30,
        updateAvailableComponentCount: 5,
        pendingUpdateInstanceCount: 9,
        detachedComponentCount: 3,
        detachedInstanceCount: 4,
        subscriptionDriftCount: 2,
        orphanSubscriptionCount: 1,
        adoptedLatestComponentCount: 9,
        releaseAdoptionPercent: 64,
        latestSubscriptionAt: "2026-05-18T08:20:00.000Z",
        status: "review",
      },
    ],
  },
});

assert(report.status === "blocked", "Risky file/share/branch/component permissions should block migration review.");
assert(report.migrationCount >= 5, "Report should produce migration rows across workspace surfaces.");
assert(report.fileMigrationCount >= 1, "File collaborator roles should create a migration row.");
assert(report.shareMigrationCount === 1, "Risky public share should create a share migration row.");
assert(report.branchMigrationCount === 1, "Release-candidate branch without restore point should create branch migration row.");
assert(report.libraryMigrationCount >= 1, "Library rollout drift should create library migration row.");
assert(report.componentMigrationCount >= 1, "Component readiness drift should create component migration row.");
assert(
  report.leastPrivilegeRecommendationCount === report.migrations.length,
  "Every migration row should include a least-privilege recommendation.",
);
assert(
  report.commands.some((command) => command.includes("admin:permission-migration-smoke")),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminPermissionMigrationReviewMarkdown(report);

assert(
  markdown.includes("Granular Permission Migration Review"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("least privilege"), "Markdown should preserve least-privilege guidance.");
assert(!markdown.includes("sam@example.com"), "Markdown export should redact owner emails.");

console.log(
  `Admin permission migration review smoke passed: ${report.migrationCount} migrations, score ${report.score}.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
