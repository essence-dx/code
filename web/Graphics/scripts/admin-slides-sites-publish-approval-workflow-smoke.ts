import { readFileSync } from "node:fs";
import {
  getAdminSlidesSitesPublishApprovalWorkflowCsv,
  getAdminSlidesSitesPublishApprovalWorkflowJson,
  getAdminSlidesSitesPublishApprovalWorkflowMarkdown,
  getAdminSlidesSitesPublishApprovalWorkflowReport,
} from "../src/features/admin/admin-slides-sites-publish-approval-workflow";
import type { AdminEmbedRouteAnalyticsJoinReport } from "../src/features/admin/admin-embed-route-analytics-join";
import type { AdminPublishChannelManagerReport } from "../src/features/admin/admin-publish-channel-manager";
import type { AdminReleaseApprovalSnapshot } from "../src/features/admin/admin-release-approval-snapshots";
import type { AdminRollbackReadinessReport } from "../src/features/admin/admin-rollback-readiness";
import type { ScopedPublicationApprovalReport } from "../src/features/admin/admin-scoped-publication-approvals";
import type { ProductionDeploySmokeReport } from "../src/features/editor/production-deploy-smoke";

const generatedAt = "2026-05-18T18:30:00.000Z";

const publishChannels: AdminPublishChannelManagerReport = {
  generatedAt,
  status: "ready",
  score: 100,
  channelCount: 3,
  readyCount: 3,
  reviewCount: 0,
  blockedCount: 0,
  prototypeChannelCount: 1,
  shareChannelCount: 0,
  siteChannelCount: 1,
  releaseChannelCount: 1,
  staleChannelCount: 0,
  approvalReadyCount: 3,
  rollbackLinkedCount: 3,
  routeSmokeBlockedCount: 0,
  channels: [
    channel("slides-prototype", "prototype", "Investor deck prototype", "file-slides"),
    channel("site-handoff", "site", "Marketing site handoff", "file-site"),
    channel("release-handoff", "release", "Production release handoff", null),
  ],
  rows: [],
  commands: ["Run deployed route smoke before publishing."],
};

const scopedPublicationApprovals: ScopedPublicationApprovalReport = {
  generatedAt,
  status: "ready",
  score: 100,
  scopeCount: 2,
  readyScopeCount: 2,
  reviewScopeCount: 0,
  blockedScopeCount: 0,
  approvedScopeCount: 2,
  missingApprovalCount: 0,
  staleApprovalCount: 0,
  overdueScopeCount: 0,
  rollbackAnchoredScopeCount: 2,
  releaseEvidenceDiffCount: 2,
  scopes: [
    {
      scopeKey: "Growth / Slides",
      teamName: "Growth",
      projectName: "Slides",
      status: "ready",
      approvalState: "approved",
      reviewerSummary: "Ari Reviewer approved the investor deck scope.",
      reviewerEmail: "ari@example.com",
      slaStatus: "clear",
      slaDueAt: "2026-05-19T18:30:00.000Z",
      fileCount: 1,
      channelCount: 1,
      readyChannelCount: 1,
      blockedChannelCount: 0,
      rollbackAnchorCount: 1,
      branchRequestCount: 1,
      branchBlockerCount: 0,
      releaseEvidenceDiffCount: 1,
      latestActivityAt: "2026-05-18T18:20:00.000Z",
      latestDecision: {
        id: "decision-slides",
        scopeKey: "Growth / Slides",
        teamName: "Growth",
        projectName: "Slides",
        decision: "approved",
        reviewerName: "Ari Reviewer",
        reviewerEmail: "ari@example.com",
        note: "Slides route, version, and rollback evidence are ready.",
        channelCount: 1,
        blockerCount: 0,
        evidenceDiffCount: 1,
        rollbackAnchorCount: 1,
        slaDueAt: "2026-05-19T18:30:00.000Z",
        createdAt: "2026-05-18T18:20:00.000Z",
      },
      evidence: ["reviewer approved", "route smoke ready", "rollback anchored"],
      blockers: [],
      recommendation: "Publish the approved Slides prototype with release notes.",
    },
    {
      scopeKey: "Marketing / Sites",
      teamName: "Marketing",
      projectName: "Sites",
      status: "ready",
      approvalState: "approved",
      reviewerSummary: "Mina Reviewer approved the Sites handoff scope.",
      reviewerEmail: "mina@example.com",
      slaStatus: "clear",
      slaDueAt: "2026-05-19T18:30:00.000Z",
      fileCount: 1,
      channelCount: 1,
      readyChannelCount: 1,
      blockedChannelCount: 0,
      rollbackAnchorCount: 1,
      branchRequestCount: 1,
      branchBlockerCount: 0,
      releaseEvidenceDiffCount: 1,
      latestActivityAt: "2026-05-18T18:22:00.000Z",
      latestDecision: {
        id: "decision-sites",
        scopeKey: "Marketing / Sites",
        teamName: "Marketing",
        projectName: "Sites",
        decision: "approved",
        reviewerName: "Mina Reviewer",
        reviewerEmail: "mina@example.com",
        note: "Sites route, version, and rollback evidence are ready.",
        channelCount: 1,
        blockerCount: 0,
        evidenceDiffCount: 1,
        rollbackAnchorCount: 1,
        slaDueAt: "2026-05-19T18:30:00.000Z",
        createdAt: "2026-05-18T18:22:00.000Z",
      },
      evidence: ["reviewer approved", "route smoke ready", "rollback anchored"],
      blockers: [],
      recommendation: "Publish the approved Sites route with release notes.",
    },
  ],
  rows: [],
  commands: ["Export scoped publication approvals."],
};

const releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[] = [
  {
    id: "release-snapshot-1",
    releaseLabel: "Slides and Sites launch",
    reviewerEmail: "ops@example.com",
    reviewerName: "Ops Reviewer",
    commitSha: "abc1234",
    deploymentUrl: "https://figma.example.com",
    smokeArtifacts: ["share route ready", "prototype route ready", "release route ready"],
    rollbackNotes: "Named versions and deployment rollback links are attached.",
    preflightStatus: "ready",
    preflightScore: 100,
    incidentStatus: "ready",
    incidentScore: 100,
    createdAt: "2026-05-18T18:25:00.000Z",
  },
];

const rollbackReadiness: AdminRollbackReadinessReport = {
  generatedAt,
  status: "ready",
  score: 100,
  readyCount: 5,
  reviewCount: 0,
  blockedCount: 0,
  versionAnchorCount: 2,
  filesWithoutVersions: 0,
  staleShareCount: 0,
  elevatedShareCount: 0,
  shareAuditEventCount: 2,
  deploymentLinkCount: 1,
  database: {
    databaseKind: "remote-libsql",
    configured: true,
    authTokenRequired: true,
    authTokenConfigured: true,
    users: 3,
    sessions: 2,
    accounts: 3,
    activeFiles: 2,
    activeShares: 2,
    versions: 2,
  },
  deploymentUrls: ["https://figma.example.com"],
  latestVersions: [
    {
      id: "version-slides",
      fileId: "file-slides",
      fileName: "Investor deck prototype",
      ownerEmail: "ari@example.com",
      versionName: "slides-launch-anchor",
      createdAt: "2026-05-18T18:10:00.000Z",
    },
    {
      id: "version-sites",
      fileId: "file-site",
      fileName: "Marketing site handoff",
      ownerEmail: "mina@example.com",
      versionName: "sites-launch-anchor",
      createdAt: "2026-05-18T18:12:00.000Z",
    },
  ],
  rows: [],
};

const productionDeploySmoke: ProductionDeploySmokeReport = {
  generatedAt,
  baseUrl: "https://figma.example.com",
  shareToken: "launch",
  status: "ready",
  score: 100,
  routeCount: 3,
  requiredRouteCount: 3,
  readyCount: 3,
  reviewCount: 0,
  blockedCount: 0,
  prototypeStartPageCount: 1,
  prototypeHotspotCount: 4,
  commands: ["bun run visual:deploy-smoke -- --base-url https://figma.example.com"],
  rows: [
    smoke("share-route", "share", "Public share route", "/share/launch"),
    smoke("prototype-route", "prototype", "Slides prototype route", "/share/launch/prototype"),
    smoke("release-route", "release-handoff", "Release handoff route", "/admin"),
  ],
};

const embedRouteAnalyticsJoin: AdminEmbedRouteAnalyticsJoinReport = {
  generatedAt,
  status: "ready",
  score: 100,
  routeFunnelCount: 2,
  referrerHealthCount: 2,
  exposureReviewCount: 2,
  adminExportCount: 4,
  totalRouteEventCount: 24,
  externalReferrerOriginCount: 2,
  blockedObservedOriginCount: 0,
  downloadExposureCount: 0,
  missingCoverageCount: 0,
  readyCount: 10,
  reviewCount: 0,
  blockedCount: 0,
  routeFunnels: [],
  referrerHealth: [],
  exposureReviews: [],
  adminExports: [],
  rows: [],
  commands: ["Attach analytics join to release evidence."],
};

const report = getAdminSlidesSitesPublishApprovalWorkflowReport({
  embedRouteAnalyticsJoin,
  generatedAt,
  productionDeploySmoke,
  publishChannels,
  releaseApprovalSnapshots,
  rollbackReadiness,
  scopedPublicationApprovals,
});

assert(report.status === "ready", "Complete publish approval fixture should be ready.");
assert(report.score >= 95, "Ready publish approval workflow should keep a high score.");
assert(report.reviewerAssignmentCount === 2, "Reviewer assignments should cover both scopes.");
assert(report.versionAnchorCount === 2, "Version anchors should cover both source files.");
assert(report.routeSmokeSignoffCount === 3, "Route smoke signoff should cover share, prototype, and release routes.");
assert(report.rollbackBundleCount === 3, "Rollback bundles should cover each publish target.");
assert(report.publishApprovalCount === 3, "Publish approval queue should cover each publish target.");
assert(report.analyticsEvidenceCount >= 1, "Analytics evidence should be included when available.");
assert(report.rows.some((row) => row.category === "reviewer-assignment"), "Rows should include reviewer assignments.");
assert(report.rows.some((row) => row.category === "version-anchor"), "Rows should include version anchors.");
assert(report.rows.some((row) => row.category === "route-smoke-signoff"), "Rows should include route smoke signoff.");
assert(report.rows.some((row) => row.category === "rollback-bundle"), "Rows should include rollback bundles.");
assert(report.rows.some((row) => row.category === "publish-approval"), "Rows should include publish approvals.");
assert(
  report.reviewerAssignments.every((assignment) => assignment.reviewerEmail),
  "Reviewer assignment rows should preserve reviewer ownership.",
);
assert(
  report.versionAnchors.every((anchor) => anchor.versionName.includes("anchor")),
  "Version anchors should preserve named version labels.",
);
assert(
  report.publishApprovals.every((approval) => approval.approvalState === "approved"),
  "Publish approvals should preserve approval state.",
);

const markdown = getAdminSlidesSitesPublishApprovalWorkflowMarkdown(report);
const csv = getAdminSlidesSitesPublishApprovalWorkflowCsv(report);
const json = JSON.parse(getAdminSlidesSitesPublishApprovalWorkflowJson(report)) as {
  reviewerAssignments: unknown[];
  versionAnchors: unknown[];
  routeSmokeSignoffs: unknown[];
  rollbackBundles: unknown[];
  publishApprovals: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Slides/Sites Publish Approval Workflow"), "Markdown should include a clear title.");
assert(markdown.includes("reviewer assignments"), "Markdown should include reviewer assignments.");
assert(markdown.includes("version anchors"), "Markdown should include version anchors.");
assert(markdown.includes("route smoke signoff"), "Markdown should include route smoke signoff.");
assert(markdown.includes("rollback bundles"), "Markdown should include rollback bundles.");
assert(markdown.includes("publish approvals"), "Markdown should include publish approvals.");
assert(csv.includes("reviewer-assignment"), "CSV should include reviewer assignment rows.");
assert(csv.includes("rollback-bundle"), "CSV should include rollback bundle rows.");
assert(json.reviewerAssignments.length === report.reviewerAssignments.length, "JSON should preserve reviewer assignments.");
assert(json.versionAnchors.length === report.versionAnchors.length, "JSON should preserve version anchors.");
assert(json.routeSmokeSignoffs.length === report.routeSmokeSignoffs.length, "JSON should preserve route smoke signoffs.");
assert(json.rollbackBundles.length === report.rollbackBundles.length, "JSON should preserve rollback bundles.");
assert(json.publishApprovals.length === report.publishApprovals.length, "JSON should preserve publish approvals.");
assert(
  packageJson.scripts["admin:slides-sites-publish-approval-workflow-smoke"]?.includes(
    "admin-slides-sites-publish-approval-workflow-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Admin Slides/Sites publish approval workflow smoke passed: ${report.publishApprovalCount} approvals, ${report.reviewerAssignmentCount} reviewers, score ${report.score}.`,
);

function channel(
  id: string,
  kind: "prototype" | "release" | "site",
  label: string,
  fileId: string | null,
): AdminPublishChannelManagerReport["channels"][number] {
  return {
    id,
    kind,
    status: "ready",
    label,
    fileId,
    fileName: fileId === "file-site" ? "Marketing site handoff" : "Investor deck prototype",
    ownerEmail: fileId === "file-site" ? "mina@example.com" : "ari@example.com",
    targetUrl:
      kind === "release"
        ? "https://figma.example.com/admin"
        : `https://figma.example.com/${id}`,
    shareId: fileId ? `${fileId}-share` : null,
    permissionPreset: kind === "prototype" ? "prototype" : kind === "site" ? "handoff" : null,
    approvalState: "approved",
    rollbackState: "linked",
    routeSmokeStatus: "ready",
    routeSmokeLabel: `${label} smoke`,
    routeSmokeAt: generatedAt,
    expiresAt: "2026-06-18T18:30:00.000Z",
    latestAt: "2026-05-18T18:15:00.000Z",
    blockerCount: 0,
    reviewCount: 0,
    evidence: ["route smoke", "release approval", "rollback link"],
    blockers: [],
    warnings: [],
    recommendation: "Channel is ready for production handoff.",
  };
}

function smoke(
  id: string,
  kind: "prototype" | "release-handoff" | "share",
  label: string,
  route: string,
): ProductionDeploySmokeReport["rows"][number] {
  return {
    id,
    status: "ready",
    kind,
    label,
    route,
    method: "GET",
    required: true,
    waitFor: "ready marker",
    evidence: `${label} loaded without console errors.`,
    detail: `${label} is ready for release signoff.`,
    command: `curl https://figma.example.com${route}`,
    recommendation: "Attach this smoke result to the release approval packet.",
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
