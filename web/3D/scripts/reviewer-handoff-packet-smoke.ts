import { strict as assert } from "node:assert";
import { createReviewerHandoffPacketReport } from "@/features/projects/reviewer-handoff-packet";
import type { ReleaseArchiveExplorerReport } from "@/features/projects/release-archive-explorer";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";

const generatedAt = "2026-05-16T07:15:00.000Z";

const archiveExplorer: ReleaseArchiveExplorerReport = {
  generatedAt,
  rows: [
    {
      downloadHref: "/api/workspaces/workspace-secret-1/release-evidence-bundle",
      evidence: "10 files, 4 projects, 20 audit events, 0 release blockers.",
      id: "release-evidence-bundles",
      label: "Release evidence bundles",
      latestActivityAt: generatedAt,
      nextAction: "Download the current evidence bundle.",
      ownerHint: "Launch owner",
      recordCount: 10,
      status: "ready",
    },
    {
      downloadHref: null,
      evidence: "2 templates, 3 remediations, 1 failed smoke check linked.",
      id: "incident-postmortems",
      label: "Incident postmortems",
      latestActivityAt: generatedAt,
      nextAction: "Keep templates current.",
      ownerHint: "Incident owner",
      recordCount: 2,
      status: "ready",
    },
    {
      downloadHref: "/api/workspaces/workspace-secret-1/release-drill-history",
      evidence: "2 saved runs, 8 scenario rows, latest hash sha256:drill-history.",
      id: "release-drill-history",
      label: "Release drill history",
      latestActivityAt: "2026-05-16T07:00:00.000Z",
      nextAction: "Resolve watched scenarios.",
      ownerHint: "Release owner",
      recordCount: 2,
      status: "watch",
    },
    {
      downloadHref: null,
      evidence: "5/5 restore scopes ready, 0 blocked, 100/100 score.",
      id: "restore-rehearsals",
      label: "Restore rehearsals",
      latestActivityAt: generatedAt,
      nextAction: "Keep restore notes beside the archive.",
      ownerHint: "Workspace owner",
      recordCount: 5,
      status: "ready",
    },
    {
      downloadHref: null,
      evidence: "4/5 resource guardrails ready, 44% average load, 0 blocked.",
      id: "resource-guardrail-snapshots",
      label: "Resource guardrail snapshots",
      latestActivityAt: generatedAt,
      nextAction: "Review watched free-tier guardrails.",
      ownerHint: "Operations owner",
      recordCount: 5,
      status: "watch",
    },
  ],
  summary: {
    blockedCount: 0,
    downloadableCount: 2,
    evidenceRecordCount: 24,
    governanceScore: 86,
    latestActivityAt: generatedAt,
    readyCount: 3,
    totalCount: 5,
    watchCount: 2,
    worstStatus: "watch",
  },
};

const releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary = {
  auditEventCount: 20,
  cadJobCount: 2,
  certificateRecordCount: 3,
  complianceReportCount: 4,
  fileCount: 10,
  highPriorityActionCount: 0,
  projectCount: 4,
  publicSurfaceSnapshotCount: 5,
  releaseBlockerCount: 0,
  riskLevel: "healthy",
  riskScore: 92,
  runbookRecordCount: 6,
  totalByteSize: 20480,
};

const riskDigest = {
  actionItems: [],
  audit: {
    dangerCount: 0,
    newestAt: generatedAt,
    rows: [],
    totalCount: 20,
    warningCount: 1,
  },
  generatedAt,
  incidents: {
    criticalCount: 0,
    incidents: [],
    totalCount: 2,
    warningCount: 1,
  },
  packetId: "risk-digest-secret-workspace-20260516",
  publicHealth: {
    failedCount: 0,
    snapshotDiffCount: 1,
    snapshots: [],
    totalCount: 5,
    warningCount: 1,
  },
  riskLevel: "healthy",
  runbook: {
    blockedCount: 0,
    nextDueAt: "2026-05-20T00:00:00.000Z",
    records: [],
    totalCount: 6,
  },
  schemaVersion: 1,
  score: 92,
  trust: {
    projectRows: [],
    projectWithBlockerCount: 0,
    trustScore: 96,
  },
  workspace: {
    id: "workspace-secret-1",
    name: "Design Ops Secret Workspace",
    role: "owner",
  },
} satisfies WorkspaceRiskDigestReport;

const signedReport = createReviewerHandoffPacketReport({
  archiveExplorer,
  generatedAt,
  ownerAttestations: archiveExplorer.rows.map((row) => ({
    ownerHint: row.ownerHint,
    signedBy: "Release Director",
    signedOffAt: generatedAt,
    sourceId: row.id,
  })),
  releaseEvidenceBundleSummary,
  riskDigest,
});

assert.equal(signedReport.summary.status, "watch");
assert.equal(signedReport.summary.handoffScore, 95);
assert.equal(signedReport.summary.signedAttestationCount, 5);
assert.equal(signedReport.summary.pendingAttestationCount, 0);
assert.equal(signedReport.summary.verifiedChecksumCount, signedReport.checksums.length);
assert.equal(signedReport.summary.redactionCount >= 3, true);
assert.equal(signedReport.externalSummary.workspaceLabel.includes("workspace-secret-1"), false);
assert.equal(signedReport.packetJson.includes("workspace-secret-1"), false);
assert.equal(signedReport.packetJson.includes("Design Ops Secret Workspace"), false);
assert.equal(signedReport.checksums.every((entry) => entry.contentHash.startsWith("sha256:")), true);

const blockedReport = createReviewerHandoffPacketReport({
  archiveExplorer: {
    ...archiveExplorer,
    rows: archiveExplorer.rows.map((row) => (row.id === "release-evidence-bundles" ? { ...row, status: "blocked" } : row)),
    summary: {
      ...archiveExplorer.summary,
      blockedCount: 1,
      governanceScore: 73,
      worstStatus: "blocked",
    },
  },
  generatedAt,
  ownerAttestations: [],
  releaseEvidenceBundleSummary: {
    ...releaseEvidenceBundleSummary,
    releaseBlockerCount: 2,
  },
  riskDigest: {
    ...riskDigest,
    actionItems: [
      {
        detail: "Public package has release blockers.",
        evidenceCount: 2,
        id: "release-blockers",
        label: "Resolve release blockers",
        priority: "high",
        source: "trust",
      },
    ],
    riskLevel: "critical",
    score: 40,
  },
});

assert.equal(blockedReport.summary.status, "blocked");
assert.equal(blockedReport.summary.blockedAttestationCount, 1);
assert.equal(blockedReport.summary.pendingAttestationCount, 4);
assert.equal(blockedReport.summary.signedAttestationCount, 0);
assert.equal(blockedReport.summary.handoffScore, 53);
assert.match(blockedReport.attestations.find((row) => row.sourceId === "release-evidence-bundles")?.nextAction ?? "", /Clear blocked archive evidence/);

console.log("reviewer handoff packet smoke passed");
