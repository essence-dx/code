import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";

export type ProjectDependencyGraphStatus = "ready" | "review" | "blocked";

export type ProjectDependencyNodeType =
  | "project"
  | "package"
  | "export"
  | "website"
  | "campaign"
  | "public-link";

export type ProjectDependencyEdgeType =
  | "variant"
  | "package"
  | "export"
  | "website"
  | "campaign"
  | "public-link";

export type ProjectDependencyRiskKind =
  | "missing-source"
  | "stale-variant"
  | "failed-export"
  | "paused-website"
  | "editable-public-surface"
  | "unlinked-campaign";

export type ProjectDependencyNode = {
  id: string;
  type: ProjectDependencyNodeType;
  label: string;
  detail: string;
  status: ProjectDependencyGraphStatus;
  href: string | null;
  meta: string[];
};

export type ProjectDependencyEdge = {
  id: string;
  type: ProjectDependencyEdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  status: ProjectDependencyGraphStatus;
};

export type ProjectDependencyRisk = {
  id: string;
  kind: ProjectDependencyRiskKind;
  title: string;
  detail: string;
  status: ProjectDependencyGraphStatus;
  nodeId: string;
  href: string | null;
};

export type ProjectDependencyCluster = {
  projectId: string;
  projectName: string;
  status: ProjectDependencyGraphStatus;
  nodes: ProjectDependencyNode[];
  edges: ProjectDependencyEdge[];
  riskCount: number;
};

export type ProjectDependencyGraph = {
  status: ProjectDependencyGraphStatus;
  score: number;
  nodes: ProjectDependencyNode[];
  edges: ProjectDependencyEdge[];
  clusters: ProjectDependencyCluster[];
  risks: ProjectDependencyRisk[];
  nextActions: string[];
  totals: {
    projects: number;
    variants: number;
    packages: number;
    exports: number;
    websites: number;
    campaigns: number;
    publicLinks: number;
    risks: number;
    edges: number;
  };
};

export type ProjectDependencyGraphInput = {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  exportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  campaigns: CampaignBoardSummary[];
};
