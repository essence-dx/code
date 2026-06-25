import {
  getAdminOrganizationAuditIntelligenceMarkdown,
  getAdminOrganizationAuditIntelligenceReport,
} from "../src/features/admin/admin-organization-audit-intelligence";

const report = getAdminOrganizationAuditIntelligenceReport({
  generatedAt: "2026-05-18T04:00:00.000Z",
  auditEvents: [
    {
      id: "audit-1",
      actorEmail: "admin@example.com",
      action: "share.disable",
      targetType: "share",
      targetId: "share-1",
      targetLabel: "checkout-token-secret",
      metadata: { token: "super-secret-token", ownerEmail: "sam@example.com" },
      createdAt: "2026-05-18T03:10:00.000Z",
    },
    {
      id: "audit-2",
      actorEmail: "admin@example.com",
      action: "session.revoke",
      targetType: "user",
      targetId: "user-1",
      targetLabel: "sam@example.com",
      metadata: { reason: "suspicious access" },
      createdAt: "2026-05-18T03:20:00.000Z",
    },
    {
      id: "audit-3",
      actorEmail: "ops@example.com",
      action: "release.approval.snapshot",
      targetType: "release",
      targetId: "release-1",
      targetLabel: "production release",
      metadata: { deploymentUrl: "https://example.vercel.app" },
      createdAt: "2026-05-18T03:30:00.000Z",
    },
  ],
  users: [
    {
      id: "user-1",
      name: "Sam Designer",
      email: "sam@example.com",
      emailVerified: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      sessions: 3,
      files: 2,
      isCurrentUser: false,
    },
  ],
  files: [
    {
      id: "file-1",
      name: "Checkout production",
      ownerEmail: "sam@example.com",
      favorite: true,
      scope: "team",
      teamName: "Product",
      projectName: "Checkout",
      openCommentCount: 6,
      brokenPrototypeCount: 1,
      readyForDevCount: 3,
      prototypeHotspotCount: 5,
      collaboratorCount: 5,
      editorCount: 3,
      commenterCount: 1,
      viewerCount: 1,
      publicShareCount: 2,
      staleShareCount: 1,
      downloadShareCount: 1,
      reviewShareCount: 1,
      updatedAt: "2026-05-17T22:00:00.000Z",
      trashedAt: null,
    },
  ],
  shares: [
    {
      id: "share-1",
      fileId: "file-1",
      fileName: "Checkout production",
      ownerEmail: "sam@example.com",
      token: "secret-share-token",
      sharePath: "/share/secret-share-token",
      permissionPreset: "review",
      accessLevel: "viewer",
      allowComments: true,
      allowDownload: true,
      createdAt: "2026-05-17T23:00:00.000Z",
      expiresAt: null,
      disabledAt: null,
    },
  ],
  roleChangeApprovals: {
    generatedAt: "2026-05-18T03:40:00.000Z",
    pendingCount: 2,
    approvedCount: 1,
    rejectedCount: 0,
    requests: [
      {
        requestId: "request-1",
        requesterId: "user-1",
        requesterEmail: "sam@example.com",
        fileId: "file-1",
        fileName: "Checkout production",
        targetUserId: "user-2",
        targetEmail: "lee@example.com",
        currentRole: "viewer",
        requestedRole: "editor",
        requesterNote: "Needs launch edit access",
        reviewerEmail: null,
        reviewerNote: null,
        status: "pending",
        createdAt: "2026-05-18T03:45:00.000Z",
        decidedAt: null,
      },
    ],
  },
  dataLossPrevention: {
    generatedAt: "2026-05-18T03:50:00.000Z",
    status: "blocked",
    score: 58,
    blockedCount: 2,
    reviewCount: 2,
    sensitiveFindingCount: 5,
    sensitiveFileCount: 1,
    downloadExposureCount: 1,
    publicRouteRiskCount: 1,
    commands: ["Export data-loss prevention evidence."],
  },
  workspaceAccessBudget: {
    generatedAt: "2026-05-18T03:52:00.000Z",
    status: "review",
    score: 76,
    externalDomainCount: 2,
    elevatedCollaboratorCount: 3,
    riskyShareCount: 2,
    noExpiryShareCount: 1,
    downloadShareCount: 1,
    pendingRoleChangeCount: 2,
    commands: ["Export workspace access budget."],
  },
  releaseRiskTimeline: {
    generatedAt: "2026-05-18T03:54:00.000Z",
    status: "blocked",
    score: 55,
    highRiskCount: 3,
    correlationCount: 2,
    commandCount: 3,
    commands: ["Export release risk timeline."],
  },
  workspaceCapacityForecast: {
    generatedAt: "2026-05-18T03:56:00.000Z",
    status: "review",
    score: 78,
    blockedCount: 0,
    reviewCount: 2,
    storageUsedPercent: 82,
    projected90DayStorageBytes: 25000000,
    routeEventCount: 300,
    collaborationRoomCount: 4,
    commands: ["Export workspace capacity forecast."],
  },
});

assert(report.clusterCount >= 5, "Audit intelligence should build multiple anomaly clusters.");
assert(report.packetCount === report.clusterCount, "Each cluster should have an investigation packet.");
assert(
  report.reviewerQueues.some((queue) => queue.reviewer === "Security reviewer"),
  "Security reviewer ownership should be assigned.",
);
assert(
  report.investigationPackets.every(
    (packet) =>
      !packet.redactedEvidence.includes("sam@example.com") &&
      !packet.redactedEvidence.includes("secret-share-token") &&
      !packet.redactedEvidence.includes("super-secret-token"),
  ),
  "Investigation packets must redact emails and secret tokens.",
);
assert(
  report.clusters.some((cluster) => cluster.category === "share-exposure"),
  "Share exposure anomaly cluster should be present.",
);

const markdown = getAdminOrganizationAuditIntelligenceMarkdown(report);

assert(
  markdown.includes("Organization Audit Intelligence"),
  "Markdown export should include a clear title.",
);
assert(
  markdown.includes("[redacted-email]"),
  "Markdown export should preserve redaction markers.",
);

console.log(
  `Admin organization audit intelligence smoke passed: ${report.clusterCount} clusters, ${report.packetCount} packets.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
