export type WorkspaceEvidenceGraphNodeKind = "artifact" | "audit" | "incident" | "policy" | "release-packet" | "source-record";
export type WorkspaceEvidenceGraphSeverity = "critical" | "healthy" | "info" | "warning";
export type WorkspaceEvidenceGraphLinkKind = "correlates" | "contains" | "documents" | "supports";

export interface WorkspaceEvidenceGraphPolicySource {
  rows: {
    evidence: string;
    id: string;
    label: string;
    ownerHint: string;
    status: "blocked" | "ready" | "watch";
  }[];
}

export interface WorkspaceEvidenceGraphAuditSource {
  category: string;
  description: string;
  eventId: string;
  occurredAt: string;
  projectId: string;
  projectName: string;
  status: "danger" | "info" | "success" | "warning";
  title: string;
}

export interface WorkspaceEvidenceGraphReleaseBundleSource {
  auditEventCount: number;
  fileCount: number;
  projectCount: number;
  releaseBlockerCount: number;
  riskLevel: "critical" | "healthy" | "watch";
  riskScore: number;
}

export interface WorkspaceEvidenceGraphReviewerPacketSource {
  packetId: string;
  summary: {
    handoffScore: number;
    status: "blocked" | "ready" | "watch";
    totalAttestationCount: number;
    verifiedChecksumCount: number;
  };
}

export interface WorkspaceEvidenceGraphArtifactSource {
  entries: {
    artifactId: string;
    kind: string;
    label: string;
    projectId: string;
    projectName: string;
    sourceKey: string;
    sourceVersionId: string;
    status: "available" | "blocked" | "draft";
    updatedAt: string;
  }[];
}

export interface WorkspaceEvidenceGraphIncidentSource {
  incidents: {
    id: string;
    kind: string;
    message: string;
    occurredAt: string | null;
    projectId: string;
    projectName: string;
    severity: "critical" | "warning";
    title: string;
  }[];
}

export interface WorkspaceEvidenceGraphTimelineSource {
  events: {
    evidence: string;
    id: string;
    occurredAt: string;
    ownerHint: string;
    projectId: string | null;
    projectName: string | null;
    severity: "critical" | "healthy" | "info" | "warning";
    source: string;
    title: string;
  }[];
}

export interface WorkspaceEvidenceGraphNode {
  detail: string;
  id: string;
  kind: WorkspaceEvidenceGraphNodeKind;
  label: string;
  ownerHint: string;
  projectId: string | null;
  projectName: string | null;
  severity: WorkspaceEvidenceGraphSeverity;
  sourceId: string;
  timestamp: string | null;
}

export interface WorkspaceEvidenceGraphLink {
  detail: string;
  id: string;
  kind: WorkspaceEvidenceGraphLinkKind;
  sourceId: string;
  targetId: string;
}

export interface WorkspaceEvidenceGraphReport {
  generatedAt: string;
  links: WorkspaceEvidenceGraphLink[];
  nodes: WorkspaceEvidenceGraphNode[];
  summary: {
    artifactNodeCount: number;
    auditNodeCount: number;
    connectedNodeCount: number;
    coverageScore: number;
    criticalNodeCount: number;
    incidentNodeCount: number;
    linkCount: number;
    nodeCount: number;
    orphanRiskCount: number;
    policyNodeCount: number;
    releasePacketNodeCount: number;
    sourceRecordNodeCount: number;
    warningNodeCount: number;
  };
}

export interface CreateWorkspaceEvidenceGraphInput {
  artifactRegistryReport: WorkspaceEvidenceGraphArtifactSource;
  auditRows: WorkspaceEvidenceGraphAuditSource[];
  generatedAt?: string;
  governanceTimelineReport: WorkspaceEvidenceGraphTimelineSource;
  incidentHistory: WorkspaceEvidenceGraphIncidentSource;
  policyAsCodeReport: WorkspaceEvidenceGraphPolicySource;
  releaseEvidenceBundleSummary: WorkspaceEvidenceGraphReleaseBundleSource;
  reviewerHandoffPacket: WorkspaceEvidenceGraphReviewerPacketSource;
}

const policyAuditCategories: Record<string, string[]> = {
  "public-surface-guardrails": ["exports", "publishing", "releases"],
  "publish-permissions": ["permissions", "publishing"],
  "release-approvals": ["publishing", "releases"],
  "retention-windows": ["releases", "versions"],
};

function policySeverity(status: WorkspaceEvidenceGraphPolicySource["rows"][number]["status"]): WorkspaceEvidenceGraphSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "healthy";
}

function auditSeverity(status: WorkspaceEvidenceGraphAuditSource["status"]): WorkspaceEvidenceGraphSeverity {
  if (status === "danger") {
    return "critical";
  }

  if (status === "warning") {
    return "warning";
  }

  return status === "success" ? "healthy" : "info";
}

function artifactSeverity(status: WorkspaceEvidenceGraphArtifactSource["entries"][number]["status"]): WorkspaceEvidenceGraphSeverity {
  if (status === "blocked") {
    return "warning";
  }

  return status === "draft" ? "info" : "healthy";
}

function releaseBundleSeverity(summary: WorkspaceEvidenceGraphReleaseBundleSource): WorkspaceEvidenceGraphSeverity {
  if (summary.releaseBlockerCount > 0 || summary.riskLevel === "critical") {
    return "warning";
  }

  return summary.riskLevel === "watch" ? "warning" : "healthy";
}

function packetSeverity(status: WorkspaceEvidenceGraphReviewerPacketSource["summary"]["status"]): WorkspaceEvidenceGraphSeverity {
  if (status === "blocked") {
    return "warning";
  }

  return status === "watch" ? "warning" : "healthy";
}

function projectMatches(first: { projectId: string | null }, second: { projectId: string | null }) {
  return Boolean(first.projectId && second.projectId && first.projectId === second.projectId);
}

function isRiskNode(node: WorkspaceEvidenceGraphNode) {
  return node.severity === "critical" || node.severity === "warning";
}

function node(input: WorkspaceEvidenceGraphNode): WorkspaceEvidenceGraphNode {
  return input;
}

function createPolicyNodes(report: WorkspaceEvidenceGraphPolicySource): WorkspaceEvidenceGraphNode[] {
  return report.rows.map((row) =>
    node({
      detail: row.evidence,
      id: `policy:${row.id}`,
      kind: "policy",
      label: row.label,
      ownerHint: row.ownerHint,
      projectId: null,
      projectName: null,
      severity: policySeverity(row.status),
      sourceId: row.id,
      timestamp: null,
    }),
  );
}

function createAuditNodes(rows: WorkspaceEvidenceGraphAuditSource[]): WorkspaceEvidenceGraphNode[] {
  return rows.map((row) =>
    node({
      detail: row.description,
      id: `audit:${row.eventId}`,
      kind: "audit",
      label: row.title,
      ownerHint: row.category,
      projectId: row.projectId,
      projectName: row.projectName,
      severity: auditSeverity(row.status),
      sourceId: row.eventId,
      timestamp: row.occurredAt,
    }),
  );
}

function createPacketNodes(input: CreateWorkspaceEvidenceGraphInput): WorkspaceEvidenceGraphNode[] {
  const bundle = input.releaseEvidenceBundleSummary;
  const packet = input.reviewerHandoffPacket;

  return [
    node({
      detail: `${bundle.fileCount} files, ${bundle.projectCount} projects, ${bundle.auditEventCount} audit events, ${bundle.releaseBlockerCount} release blockers.`,
      id: "packet:release-evidence-bundle",
      kind: "release-packet",
      label: "Release evidence bundle",
      ownerHint: "Launch owner",
      projectId: null,
      projectName: null,
      severity: releaseBundleSeverity(bundle),
      sourceId: "release-evidence-bundle",
      timestamp: input.generatedAt ?? null,
    }),
    node({
      detail: `${packet.summary.verifiedChecksumCount} verified checksums, ${packet.summary.totalAttestationCount} attestations, ${packet.summary.handoffScore}/100 handoff.`,
      id: `packet:${packet.packetId}`,
      kind: "release-packet",
      label: "Reviewer handoff packet",
      ownerHint: "Governance reviewer",
      projectId: null,
      projectName: null,
      severity: packetSeverity(packet.summary.status),
      sourceId: packet.packetId,
      timestamp: input.generatedAt ?? null,
    }),
  ];
}

function createArtifactNodes(report: WorkspaceEvidenceGraphArtifactSource): WorkspaceEvidenceGraphNode[] {
  return report.entries.map((entry) =>
    node({
      detail: `${entry.kind} ${entry.status}, version ${entry.sourceVersionId}.`,
      id: `artifact:${entry.sourceKey}`,
      kind: "artifact",
      label: entry.label,
      ownerHint: entry.kind,
      projectId: entry.projectId,
      projectName: entry.projectName,
      severity: artifactSeverity(entry.status),
      sourceId: entry.sourceKey,
      timestamp: entry.updatedAt,
    }),
  );
}

function createIncidentNodes(history: WorkspaceEvidenceGraphIncidentSource): WorkspaceEvidenceGraphNode[] {
  return history.incidents.map((incident) =>
    node({
      detail: incident.message,
      id: `incident:${incident.id}`,
      kind: "incident",
      label: incident.title,
      ownerHint: incident.kind,
      projectId: incident.projectId,
      projectName: incident.projectName,
      severity: incident.severity,
      sourceId: incident.id,
      timestamp: incident.occurredAt,
    }),
  );
}

function createSourceRecordNodes(report: WorkspaceEvidenceGraphTimelineSource): WorkspaceEvidenceGraphNode[] {
  return report.events.map((event) =>
    node({
      detail: event.evidence,
      id: `source:${event.id}`,
      kind: "source-record",
      label: event.title,
      ownerHint: event.ownerHint,
      projectId: event.projectId,
      projectName: event.projectName,
      severity: event.severity,
      sourceId: event.id,
      timestamp: event.occurredAt,
    }),
  );
}

function createLink(input: Omit<WorkspaceEvidenceGraphLink, "id">): WorkspaceEvidenceGraphLink {
  return {
    ...input,
    id: `${input.kind}:${input.sourceId}->${input.targetId}`,
  };
}

function addLink(links: Map<string, WorkspaceEvidenceGraphLink>, input: Omit<WorkspaceEvidenceGraphLink, "id">) {
  if (input.sourceId === input.targetId) {
    return;
  }

  const link = createLink(input);

  links.set(link.id, link);
}

function addPolicyAuditLinks(links: Map<string, WorkspaceEvidenceGraphLink>, policies: WorkspaceEvidenceGraphNode[], audits: WorkspaceEvidenceGraphNode[]) {
  for (const policy of policies) {
    const categories = policyAuditCategories[policy.sourceId] ?? [];

    for (const audit of audits) {
      if (categories.some((category) => audit.ownerHint === category)) {
        addLink(links, {
          detail: `${policy.label} is supported by ${audit.label}.`,
          kind: "supports",
          sourceId: policy.id,
          targetId: audit.id,
        });
      }
    }
  }
}

function addPacketLinks(links: Map<string, WorkspaceEvidenceGraphLink>, nodes: WorkspaceEvidenceGraphNode[]) {
  const bundle = nodes.find((entry) => entry.id === "packet:release-evidence-bundle");
  const reviewerPacket = nodes.find((entry) => entry.kind === "release-packet" && entry.id !== "packet:release-evidence-bundle");
  const releasePolicy = nodes.find((entry) => entry.id === "policy:release-approvals");

  if (bundle && reviewerPacket) {
    addLink(links, {
      detail: "Reviewer handoff depends on the current release evidence bundle.",
      kind: "documents",
      sourceId: reviewerPacket.id,
      targetId: bundle.id,
    });
  }

  if (bundle && releasePolicy) {
    addLink(links, {
      detail: "Release packet documents the release approval policy state.",
      kind: "documents",
      sourceId: bundle.id,
      targetId: releasePolicy.id,
    });
  }
}

function addArtifactLinks(links: Map<string, WorkspaceEvidenceGraphLink>, artifacts: WorkspaceEvidenceGraphNode[], relatedNodes: WorkspaceEvidenceGraphNode[]) {
  for (const artifact of artifacts) {
    addLink(links, {
      detail: `${artifact.label} is included in the release evidence graph.`,
      kind: "contains",
      sourceId: "packet:release-evidence-bundle",
      targetId: artifact.id,
    });

    for (const related of relatedNodes) {
      if (projectMatches(artifact, related)) {
        addLink(links, {
          detail: `${artifact.label} shares project context with ${related.label}.`,
          kind: "correlates",
          sourceId: artifact.id,
          targetId: related.id,
        });
      }
    }
  }
}

function addProjectCorrelationLinks(links: Map<string, WorkspaceEvidenceGraphLink>, sourceNodes: WorkspaceEvidenceGraphNode[], targetNodes: WorkspaceEvidenceGraphNode[]) {
  for (const source of sourceNodes) {
    for (const target of targetNodes) {
      if (projectMatches(source, target)) {
        addLink(links, {
          detail: `${source.label} and ${target.label} share project evidence.`,
          kind: "correlates",
          sourceId: source.id,
          targetId: target.id,
        });
      }
    }
  }
}

function addSourceRecordLinks(links: Map<string, WorkspaceEvidenceGraphLink>, sourceRecords: WorkspaceEvidenceGraphNode[], nodes: WorkspaceEvidenceGraphNode[]) {
  for (const sourceRecord of sourceRecords) {
    const referencedNode = nodes.find((entry) => entry.id === sourceRecord.sourceId);

    if (referencedNode) {
      addLink(links, {
        detail: `${sourceRecord.label} mirrors ${referencedNode.label}.`,
        kind: "documents",
        sourceId: sourceRecord.id,
        targetId: referencedNode.id,
      });
    }

    for (const candidate of nodes) {
      if (candidate.kind !== "source-record" && projectMatches(sourceRecord, candidate)) {
        addLink(links, {
          detail: `${sourceRecord.label} is part of the same project evidence chain as ${candidate.label}.`,
          kind: "correlates",
          sourceId: candidate.id,
          targetId: sourceRecord.id,
        });
      }
    }

    if (!sourceRecord.projectId && isRiskNode(sourceRecord)) {
      const riskPolicies = nodes.filter((entry) => entry.kind === "policy" && isRiskNode(entry));

      for (const policy of riskPolicies) {
        addLink(links, {
          detail: `${sourceRecord.label} is a workspace-level risk signal for ${policy.label}.`,
          kind: "supports",
          sourceId: sourceRecord.id,
          targetId: policy.id,
        });
      }
    }
  }
}

function createLinks(nodes: WorkspaceEvidenceGraphNode[]) {
  const links = new Map<string, WorkspaceEvidenceGraphLink>();
  const policies = nodes.filter((entry) => entry.kind === "policy");
  const audits = nodes.filter((entry) => entry.kind === "audit");
  const artifacts = nodes.filter((entry) => entry.kind === "artifact");
  const incidents = nodes.filter((entry) => entry.kind === "incident");
  const sourceRecords = nodes.filter((entry) => entry.kind === "source-record");

  addPolicyAuditLinks(links, policies, audits);
  addPacketLinks(links, nodes);
  addArtifactLinks(links, artifacts, [...audits, ...incidents]);
  addProjectCorrelationLinks(links, incidents, audits);
  addSourceRecordLinks(links, sourceRecords, nodes);

  return [...links.values()].sort((first, second) => first.sourceId.localeCompare(second.sourceId) || first.targetId.localeCompare(second.targetId));
}

function connectedNodeIds(links: WorkspaceEvidenceGraphLink[]) {
  return new Set(links.flatMap((link) => [link.sourceId, link.targetId]));
}

function summarize(nodes: WorkspaceEvidenceGraphNode[], links: WorkspaceEvidenceGraphLink[]): WorkspaceEvidenceGraphReport["summary"] {
  const connected = connectedNodeIds(links);
  const orphanRiskCount = nodes.filter((entry) => isRiskNode(entry) && !connected.has(entry.id)).length;

  return {
    artifactNodeCount: nodes.filter((entry) => entry.kind === "artifact").length,
    auditNodeCount: nodes.filter((entry) => entry.kind === "audit").length,
    connectedNodeCount: nodes.filter((entry) => connected.has(entry.id)).length,
    coverageScore: Math.max(0, Math.round(100 - orphanRiskCount * 12)),
    criticalNodeCount: nodes.filter((entry) => entry.severity === "critical").length,
    incidentNodeCount: nodes.filter((entry) => entry.kind === "incident").length,
    linkCount: links.length,
    nodeCount: nodes.length,
    orphanRiskCount,
    policyNodeCount: nodes.filter((entry) => entry.kind === "policy").length,
    releasePacketNodeCount: nodes.filter((entry) => entry.kind === "release-packet").length,
    sourceRecordNodeCount: nodes.filter((entry) => entry.kind === "source-record").length,
    warningNodeCount: nodes.filter((entry) => entry.severity === "warning").length,
  };
}

export function createWorkspaceEvidenceGraph(input: CreateWorkspaceEvidenceGraphInput): WorkspaceEvidenceGraphReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const nodes = [
    ...createPolicyNodes(input.policyAsCodeReport),
    ...createAuditNodes(input.auditRows),
    ...createPacketNodes({ ...input, generatedAt }),
    ...createArtifactNodes(input.artifactRegistryReport),
    ...createIncidentNodes(input.incidentHistory),
    ...createSourceRecordNodes(input.governanceTimelineReport),
  ];
  const links = createLinks(nodes);

  return {
    generatedAt,
    links,
    nodes,
    summary: summarize(nodes, links),
  };
}
