import {
  getAdminOperatorOnboardingRecoveryMarkdown,
  getAdminOperatorOnboardingRecoveryReport,
} from "../src/features/admin/admin-operator-onboarding-recovery";

const generatedAt = "2026-05-18T05:00:00.000Z";

const report = getAdminOperatorOnboardingRecoveryReport({
  generatedAt,
  auditEvents: [
    {
      id: "audit-1",
      actorEmail: "ops@example.com",
      action: "share.restore",
      targetType: "share",
      targetId: "share-1",
      targetLabel: "sample-secret-token",
      metadata: { ownerEmail: "sam@example.com", token: "sample-secret-token" },
      createdAt: "2026-05-18T04:30:00.000Z",
    },
  ],
  users: [
    {
      id: "user-1",
      name: "Sam Operator",
      email: "sam@example.com",
      emailVerified: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      sessions: 1,
      files: 1,
      isCurrentUser: false,
    },
  ],
  files: [
    {
      id: "file-1",
      name: "Sample recovery workspace",
      ownerEmail: "sam@example.com",
      favorite: true,
      scope: "team",
      teamName: "Ops",
      projectName: "Recovery",
      openCommentCount: 2,
      brokenPrototypeCount: 1,
      readyForDevCount: 0,
      prototypeHotspotCount: 2,
      collaboratorCount: 3,
      editorCount: 2,
      commenterCount: 1,
      viewerCount: 0,
      publicShareCount: 1,
      staleShareCount: 1,
      downloadShareCount: 1,
      reviewShareCount: 1,
      updatedAt: "2026-05-18T04:45:00.000Z",
      trashedAt: null,
    },
  ],
  shares: [
    {
      id: "share-1",
      fileId: "file-1",
      fileName: "Sample recovery workspace",
      ownerEmail: "sam@example.com",
      token: "sample-secret-token",
      sharePath: "/share/sample-secret-token",
      permissionPreset: "review",
      accessLevel: "viewer",
      allowComments: true,
      allowDownload: true,
      createdAt: "2026-05-18T04:40:00.000Z",
      expiresAt: null,
      disabledAt: null,
    },
  ],
  automationRunbookCenter: {
    generatedAt,
    status: "review",
    score: 76,
    readyCount: 6,
    reviewCount: 2,
    blockedCount: 0,
    commandCount: 4,
    commands: ["bun run ops:env-preflight", "bun run visual:deploy-smoke"],
  },
  deployEnvironmentPreflight: {
    generatedAt,
    status: "blocked",
    score: 42,
    readyCount: 3,
    reviewCount: 1,
    blockedCount: 2,
    requiredCount: 6,
    appOrigin: "https://figma.example.com",
    vercelEnv: "production",
    commands: ["bun run ops:env-preflight"],
  },
  operatorRehearsals: {
    generatedAt,
    status: "blocked",
    score: 52,
    runCount: 5,
    readyRunCount: 2,
    reviewRunCount: 1,
    blockedRunCount: 2,
    stepCount: 15,
    readyStepCount: 8,
    reviewStepCount: 3,
    blockedStepCount: 4,
    commandCount: 4,
    commands: ["bun run ops:post-deploy-smoke"],
    rows: [
      {
        id: "restore-step-1",
        runId: "restore-drill",
        runLabel: "Restore drill",
        kind: "restore",
        status: "blocked",
        label: "Confirm database restore source",
        ownerRole: "Platform operator",
        evidence: "Database restore source is missing.",
        expectedResult: "Database source, version anchor, and deployment link are ready.",
        command: "bun run ops:env-preflight",
      },
    ],
  },
  organizationAuditIntelligence: {
    generatedAt,
    status: "blocked",
    score: 60,
    clusterCount: 4,
    packetCount: 4,
    reviewerQueueCount: 3,
    highSeverityCount: 2,
    commands: ["Export organization audit packets."],
  },
  productionDeploySmoke: {
    generatedAt,
    baseUrl: "https://figma.example.com",
    status: "review",
    score: 74,
    routeCount: 8,
    requiredRouteCount: 6,
    readyCount: 5,
    reviewCount: 2,
    blockedCount: 1,
    commands: ["bun run visual:deploy-smoke -- --base-url https://figma.example.com"],
  },
  rollbackReadiness: {
    generatedAt,
    status: "blocked",
    score: 56,
    readyCount: 2,
    reviewCount: 1,
    blockedCount: 2,
    versionAnchorCount: 0,
    filesWithoutVersions: 1,
    staleShareCount: 1,
    elevatedShareCount: 1,
    deploymentLinkCount: 0,
    rows: [
      {
        id: "rollback-versions",
        status: "blocked",
        category: "versions",
        label: "Version restore anchors",
        detail: "No named versions are available.",
        recommendation: "Create named versions before recovery onboarding.",
        count: 1,
        target: "file-1",
      },
    ],
  },
  selfHostedBackupReadiness: {
    generatedAt,
    status: "blocked",
    score: 50,
    readyCount: 1,
    reviewCount: 1,
    blockedCount: 3,
    databaseConfigured: true,
    databaseAuthReady: false,
    backupScheduleConfigured: false,
    backupTargetConfigured: false,
    backupCommandConfigured: false,
    versionAnchorCount: 0,
    filesWithoutVersions: 1,
    activeShareCount: 1,
    staleShareCount: 1,
    elevatedShareCount: 1,
    commands: ["turso db shell <database> .dump"],
  },
});

assert(report.status === "blocked", "Blocked inputs should produce a blocked onboarding report.");
assert(report.playbookCount >= 4, "Operator onboarding should build multiple playbooks.");
assert(report.handoffExportCount >= 4, "Operator onboarding should include handoff export packets.");
assert(
  report.playbooks.some((playbook) => playbook.track === "sample-data"),
  "Sample-data health playbook should be present.",
);
assert(
  report.playbooks.some((playbook) => playbook.track === "restore-drills"),
  "Restore drill playbook should be present.",
);
assert(
  report.commands.some((command) => command.includes("admin:operator-onboarding-smoke")),
  "The targeted smoke command should be surfaced for operators.",
);
assert(
  report.handoffExports.every(
    (handoff) =>
      !handoff.summary.includes("sam@example.com") &&
      !handoff.summary.includes("sample-secret-token"),
  ),
  "Handoff summaries must redact emails and share tokens.",
);

const markdown = getAdminOperatorOnboardingRecoveryMarkdown(report);

assert(
  markdown.includes("Operator Onboarding And Recovery Playbooks"),
  "Markdown export should include the playbook title.",
);
assert(
  markdown.includes("[redacted-email]"),
  "Markdown export should preserve redaction markers.",
);
assert(
  !markdown.includes("sample-secret-token"),
  "Markdown export must redact share tokens.",
);

console.log(
  `Admin operator onboarding recovery smoke passed: ${report.playbookCount} playbooks, ${report.handoffExportCount} exports.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
