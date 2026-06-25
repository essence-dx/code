import { strict as assert } from "node:assert";
import { createWorkspaceEvidenceGraph } from "@/features/projects/workspace-evidence-graph";

const generatedAt = "2026-05-16T14:00:00.000Z";

const graph = createWorkspaceEvidenceGraph({
  artifactRegistryReport: {
    entries: [
      {
        artifactId: "artifact-public-viewer",
        kind: "public-asset",
        label: "Public viewer bundle",
        projectId: "project-1",
        projectName: "Launch scene",
        sourceKey: "project-1:public-asset:viewer",
        sourceVersionId: "version-1",
        status: "blocked",
        updatedAt: "2026-05-16T11:30:00.000Z",
      },
      {
        artifactId: "artifact-compliance",
        kind: "compliance-export",
        label: "Compliance report",
        projectId: "project-1",
        projectName: "Launch scene",
        sourceKey: "project-1:compliance-export:report",
        sourceVersionId: "version-1",
        status: "available",
        updatedAt: "2026-05-16T12:00:00.000Z",
      },
    ],
  },
  auditRows: [
    {
      category: "publishing",
      description: "Public link approval was blocked before release.",
      eventId: "audit-1",
      occurredAt: "2026-05-16T10:00:00.000Z",
      projectId: "project-1",
      projectName: "Launch scene",
      status: "danger",
      title: "Publish approval blocked",
    },
    {
      category: "comments",
      description: "Reviewer note added.",
      eventId: "audit-2",
      occurredAt: "2026-05-16T09:00:00.000Z",
      projectId: "project-2",
      projectName: "Quiet scene",
      status: "info",
      title: "Comment added",
    },
  ],
  generatedAt,
  governanceTimelineReport: {
    events: [
      {
        evidence: "publishing audit event for Launch scene.",
        id: "audit:audit-1",
        occurredAt: "2026-05-16T10:00:00.000Z",
        ownerHint: "Release Owner",
        projectId: "project-1",
        projectName: "Launch scene",
        severity: "critical",
        source: "audit",
        title: "Publish approval blocked",
      },
      {
        evidence: "1 failing public surface.",
        id: "slo:public-surfaces",
        occurredAt: "2026-05-16T12:00:00.000Z",
        ownerHint: "Operations owner",
        projectId: null,
        projectName: null,
        severity: "critical",
        source: "slo",
        title: "SLO: Public surfaces",
      },
    ],
  },
  incidentHistory: {
    incidents: [
      {
        id: "incident-1",
        kind: "blocked-review-gate",
        message: "Public link is blocking release handoff.",
        occurredAt: "2026-05-16T10:30:00.000Z",
        projectId: "project-1",
        projectName: "Launch scene",
        severity: "critical",
        title: "Blocked review gates",
      },
    ],
  },
  policyAsCodeReport: {
    rows: [
      {
        evidence: "1 permission issue.",
        id: "publish-permissions",
        label: "Publish permissions",
        ownerHint: "Publishing owner",
        status: "blocked",
      },
      {
        evidence: "Release packet is ready.",
        id: "release-approvals",
        label: "Release approvals",
        ownerHint: "Launch owner",
        status: "ready",
      },
    ],
  },
  releaseEvidenceBundleSummary: {
    auditEventCount: 2,
    fileCount: 8,
    projectCount: 2,
    releaseBlockerCount: 1,
    riskLevel: "critical",
    riskScore: 72,
  },
  reviewerHandoffPacket: {
    packetId: "reviewer-handoff-test",
    summary: {
      handoffScore: 82,
      status: "watch",
      totalAttestationCount: 3,
      verifiedChecksumCount: 5,
    },
  },
});

assert.equal(graph.summary.nodeCount, 11);
assert.equal(graph.summary.policyNodeCount, 2);
assert.equal(graph.summary.releasePacketNodeCount, 2);
assert.equal(graph.summary.artifactNodeCount, 2);
assert.equal(graph.summary.orphanRiskCount, 0);
assert.equal(graph.summary.criticalNodeCount, 5);
assert.equal(graph.summary.coverageScore, 100);
assert.ok(graph.summary.linkCount >= 11);
assert.ok(graph.links.some((link) => link.sourceId === "policy:publish-permissions" && link.targetId === "audit:audit-1"));
assert.ok(graph.links.some((link) => link.sourceId === "incident:incident-1" && link.targetId === "source:audit:audit-1"));
assert.ok(graph.links.some((link) => link.sourceId === "packet:release-evidence-bundle" && link.targetId === "artifact:project-1:public-asset:viewer"));

const readyGraph = createWorkspaceEvidenceGraph({
  artifactRegistryReport: {
    entries: [],
  },
  auditRows: [],
  generatedAt,
  governanceTimelineReport: {
    events: [],
  },
  incidentHistory: {
    incidents: [],
  },
  policyAsCodeReport: {
    rows: [
      {
        evidence: "Ready.",
        id: "release-approvals",
        label: "Release approvals",
        ownerHint: "Launch owner",
        status: "ready",
      },
    ],
  },
  releaseEvidenceBundleSummary: {
    auditEventCount: 0,
    fileCount: 1,
    projectCount: 0,
    releaseBlockerCount: 0,
    riskLevel: "healthy",
    riskScore: 100,
  },
  reviewerHandoffPacket: {
    packetId: "reviewer-handoff-ready",
    summary: {
      handoffScore: 100,
      status: "ready",
      totalAttestationCount: 0,
      verifiedChecksumCount: 5,
    },
  },
});

assert.equal(readyGraph.summary.orphanRiskCount, 0);
assert.equal(readyGraph.summary.coverageScore, 100);

console.log("workspace evidence graph smoke passed");
