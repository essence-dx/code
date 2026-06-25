import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";

export type WorkspacePackageStatus = "ready" | "review" | "blocked";

export type WorkspacePackageSectionId =
  | "project-bundles"
  | "component-kits"
  | "dependency-health"
  | "migration-checks";

export type WorkspacePackageItem = {
  id: string;
  title: string;
  detail: string;
  href: string | null;
  status: WorkspacePackageStatus;
  badge: string;
  meta: string[];
};

export type WorkspacePackageSection = {
  id: WorkspacePackageSectionId;
  title: string;
  description: string;
  status: WorkspacePackageStatus;
  score: number;
  metricLabel: string;
  metricValue: number;
  emptyState: string;
  items: WorkspacePackageItem[];
};

export type WorkspacePackageOperations = {
  status: WorkspacePackageStatus;
  score: number;
  sections: WorkspacePackageSection[];
  nextActions: string[];
  totals: {
    activeProjects: number;
    versionedProjects: number;
    readyBundles: number;
    componentKits: number;
    blockedDependencies: number;
    migrationChecks: number;
  };
};

export type WorkspacePackageContext = {
  activeProjects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
};
