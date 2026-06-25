import {
  createCampaignEdges,
  createExportEdges,
  createPackageEdges,
  createPublicLinkEdges,
  createVariantEdges,
  createWebsiteEdges,
} from "@/features/projects/project-dependency-graph-edges";
import {
  createCampaignNodes,
  createExportNodes,
  createPackageNodes,
  createProjectNodes,
  createPublicLinkNodes,
  createWebsiteNodes,
} from "@/features/projects/project-dependency-graph-nodes";
import { createDependencyRisks } from "@/features/projects/project-dependency-graph-risks";
import type {
  ProjectDependencyCluster,
  ProjectDependencyGraph,
  ProjectDependencyGraphInput,
  ProjectDependencyGraphStatus,
} from "@/features/projects/project-dependency-graph-types";
import {
  average,
  projectNodeId,
  scoreToStatus,
  statusScore,
  statusWeight,
  uniqueById,
} from "@/features/projects/project-dependency-graph-utils";

export type {
  ProjectDependencyCluster,
  ProjectDependencyEdge,
  ProjectDependencyEdgeType,
  ProjectDependencyGraph,
  ProjectDependencyGraphInput,
  ProjectDependencyGraphStatus,
  ProjectDependencyNode,
  ProjectDependencyNodeType,
  ProjectDependencyRisk,
  ProjectDependencyRiskKind,
} from "@/features/projects/project-dependency-graph-types";

export function createProjectDependencyGraph(
  input: ProjectDependencyGraphInput,
): ProjectDependencyGraph {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const nodes = uniqueById([
    ...createProjectNodes(activeProjects),
    ...createPackageNodes(input.templates),
    ...createExportNodes(input.exportJobs),
    ...createWebsiteNodes(input.websitePublishes),
    ...createCampaignNodes(input.campaigns),
    ...createPublicLinkNodes(activeProjects),
  ]);
  const edges = uniqueById([
    ...createVariantEdges(activeProjects),
    ...createPackageEdges({
      projects: activeProjects,
      templates: input.templates,
    }),
    ...createExportEdges(input.exportJobs),
    ...createWebsiteEdges(input.websitePublishes),
    ...createCampaignEdges(input.campaigns),
    ...createPublicLinkEdges(activeProjects),
  ]);
  const risks = createDependencyRisks({
    projects: activeProjects,
    exportJobs: input.exportJobs,
    websitePublishes: input.websitePublishes,
  });
  const nodeScores = nodes.map((node) => statusScore(node.status));
  const edgeScores = edges.map((edge) => statusScore(edge.status));
  const riskPenalty = risks.reduce(
    (total, risk) => total + (risk.status === "blocked" ? 24 : 10),
    0,
  );
  const score = Math.max(
    0,
    average([...nodeScores, ...edgeScores]) - riskPenalty,
  );
  const status = scoreToStatus(
    score,
    risks.some((risk) => risk.status === "blocked"),
  );

  return {
    status,
    score,
    nodes,
    edges,
    clusters: createDependencyClusters({
      projectIds: activeProjects.map((project) => project.id),
      nodes,
      edges,
      risks,
    }),
    risks,
    nextActions: createNextActions(risks),
    totals: {
      projects: activeProjects.length,
      variants: activeProjects.filter((project) => project.sourceProjectId)
        .length,
      packages: input.templates.filter(
        (template) => template.marketplaceStatus !== "archived",
      ).length,
      exports: input.exportJobs.length,
      websites: input.websitePublishes.length,
      campaigns: input.campaigns.length,
      publicLinks: activeProjects.filter(
        (project) => project.publicShareId || project.editShareId,
      ).length,
      risks: risks.length,
      edges: edges.length,
    },
  };
}

function createDependencyClusters(input: {
  projectIds: string[];
  nodes: ProjectDependencyGraph["nodes"];
  edges: ProjectDependencyGraph["edges"];
  risks: ProjectDependencyGraph["risks"];
}): ProjectDependencyCluster[] {
  return input.projectIds
    .map((projectId) => {
      const rootNodeId = projectNodeId(projectId);
      const connectedEdges = input.edges.filter(
        (edge) =>
          edge.sourceNodeId === rootNodeId || edge.targetNodeId === rootNodeId,
      );
      const connectedNodeIds = new Set([
        rootNodeId,
        ...connectedEdges.flatMap((edge) => [
          edge.sourceNodeId,
          edge.targetNodeId,
        ]),
      ]);
      const nodes = input.nodes.filter((node) => connectedNodeIds.has(node.id));
      const projectNode = input.nodes.find((node) => node.id === rootNodeId);
      const risks = input.risks.filter((risk) =>
        connectedNodeIds.has(risk.nodeId),
      );
      const status = deriveClusterStatus(nodes, connectedEdges, risks);

      return {
        projectId,
        projectName: projectNode?.label ?? projectId,
        status,
        nodes,
        edges: connectedEdges,
        riskCount: risks.length,
      };
    })
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        right.riskCount - left.riskCount ||
        right.nodes.length - left.nodes.length ||
        left.projectName.localeCompare(right.projectName),
    )
    .slice(0, 8);
}

function deriveClusterStatus(
  nodes: ProjectDependencyGraph["nodes"],
  edges: ProjectDependencyGraph["edges"],
  risks: ProjectDependencyGraph["risks"],
): ProjectDependencyGraphStatus {
  if (
    risks.some((risk) => risk.status === "blocked") ||
    nodes.some((node) => node.status === "blocked") ||
    edges.some((edge) => edge.status === "blocked")
  ) {
    return "blocked";
  }

  if (
    risks.length ||
    nodes.some((node) => node.status === "review") ||
    edges.some((edge) => edge.status === "review")
  ) {
    return "review";
  }

  return "ready";
}

function createNextActions(risks: ProjectDependencyGraph["risks"]) {
  const actions: string[] = [];
  const missingSourceCount = risks.filter(
    (risk) => risk.kind === "missing-source",
  ).length;
  const failedExportCount = risks.filter(
    (risk) => risk.kind === "failed-export",
  ).length;
  const editableShareCount = risks.filter(
    (risk) => risk.kind === "editable-public-surface",
  ).length;
  const staleVariantCount = risks.filter(
    (risk) => risk.kind === "stale-variant",
  ).length;

  if (missingSourceCount) {
    actions.push(
      `Reconnect missing source designs for ${missingSourceCount} variant${missingSourceCount === 1 ? "" : "s"}.`,
    );
  }

  if (failedExportCount) {
    actions.push(
      `Retry or diagnose ${failedExportCount} failed export${failedExportCount === 1 ? "" : "s"}.`,
    );
  }

  if (staleVariantCount) {
    actions.push(
      `Refresh ${staleVariantCount} stale variant${staleVariantCount === 1 ? "" : "s"} from updated source designs.`,
    );
  }

  if (editableShareCount) {
    actions.push(
      `Review ${editableShareCount} editable public share surface${editableShareCount === 1 ? "" : "s"} before release.`,
    );
  }

  return actions.slice(0, 5);
}
