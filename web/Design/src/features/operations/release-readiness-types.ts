import type { AccountProfile } from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { OperationalHealthReport } from "@/features/operations/operational-health";

export type ReleaseReadinessStatus = "ready" | "review" | "blocked";

export type ReleaseReadinessGateId =
  | "route-coverage"
  | "environment"
  | "migration-drift"
  | "seeded-account"
  | "vercel-deployment";

export type ReleaseReadinessItem = {
  id: string;
  title: string;
  detail: string;
  status: ReleaseReadinessStatus;
  badge: string;
  meta: string[];
  href: string | null;
};

export type ReleaseReadinessGate = {
  id: ReleaseReadinessGateId;
  title: string;
  description: string;
  status: ReleaseReadinessStatus;
  score: number;
  metricLabel: string;
  metricValue: number;
  items: ReleaseReadinessItem[];
};

export type ReleaseRouteDefinition = {
  id: string;
  label: string;
  path: string;
  source: string;
  area: "app" | "api";
  critical: boolean;
  requirement:
    | "always"
    | "project"
    | "template"
    | "share"
    | "website"
    | "email-export"
    | "project-version"
    | "auth-email";
};

export type ReleaseReadinessPacket = {
  fileName: string;
  dataUrl: string;
  payload: {
    kind: "essence-studio.release-readiness";
    version: 1;
    generatedAt: string;
    status: ReleaseReadinessStatus;
    score: number;
    gates: Array<{
      id: ReleaseReadinessGateId;
      title: string;
      status: ReleaseReadinessStatus;
      score: number;
      metric: string;
      items: ReleaseReadinessItem[];
    }>;
    nextActions: string[];
    routeDefinitions: ReleaseRouteDefinition[];
  };
};

export type ReleaseReadinessReport = {
  generatedAt: string;
  status: ReleaseReadinessStatus;
  score: number;
  gates: ReleaseReadinessGate[];
  nextActions: string[];
  packet: ReleaseReadinessPacket;
  totals: {
    criticalRoutes: number;
    coveredCriticalRoutes: number;
    environmentChecks: number;
    blockedEnvironmentChecks: number;
    activeProjects: number;
    missingSnapshots: number;
    staleSnapshots: number;
    verifiedSeededAccounts: number;
    vercelChecks: number;
  };
};

export type ReleaseReadinessInput = {
  now?: Date;
  accountProfile: AccountProfile;
  adminUsers?: Array<{ email: string; emailVerified: boolean }>;
  seededAdminEmail?: string;
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  authEmails: AuthEmailSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  websitePublishes: WebsitePublishSummary[];
  health: OperationalHealthReport | null;
};

export type ReleaseReadinessContext = ReleaseReadinessInput & {
  activeProjects: ProjectSummary[];
  generatedAt: string;
};

export const releaseRouteDefinitions: ReleaseRouteDefinition[] = [
  {
    id: "home",
    label: "Public entry",
    path: "/",
    source: "src/app/page.tsx",
    area: "app",
    critical: true,
    requirement: "always",
  },
  {
    id: "dashboard",
    label: "Authenticated dashboard",
    path: "/designs",
    source: "src/app/designs/page.tsx",
    area: "app",
    critical: true,
    requirement: "always",
  },
  {
    id: "editor",
    label: "Project editor",
    path: "/editor/[projectId]",
    source: "src/app/editor/[projectId]/page.tsx",
    area: "app",
    critical: true,
    requirement: "project",
  },
  {
    id: "public-share",
    label: "Public share view",
    path: "/view/[shareId]",
    source: "src/app/view/[shareId]/page.tsx",
    area: "app",
    critical: true,
    requirement: "share",
  },
  {
    id: "edit-share",
    label: "Editable share view",
    path: "/edit/[shareId]",
    source: "src/app/edit/[shareId]/page.tsx",
    area: "app",
    critical: true,
    requirement: "share",
  },
  {
    id: "template-detail",
    label: "Template detail",
    path: "/templates/[templateId]",
    source: "src/app/templates/[templateId]/page.tsx",
    area: "app",
    critical: true,
    requirement: "template",
  },
  {
    id: "published-site",
    label: "Published website",
    path: "/site/[slug]",
    source: "src/app/site/[slug]/page.tsx",
    area: "app",
    critical: true,
    requirement: "website",
  },
  {
    id: "email-export",
    label: "Email export endpoint",
    path: "/email/[projectId]/export",
    source: "src/app/email/[projectId]/export/route.ts",
    area: "api",
    critical: true,
    requirement: "email-export",
  },
  {
    id: "auth-api",
    label: "Better Auth API",
    path: "/api/auth/[...all]",
    source: "src/app/api/auth/[...all]/route.ts",
    area: "api",
    critical: true,
    requirement: "always",
  },
  {
    id: "project-save-api",
    label: "Project save API",
    path: "/api/projects/[projectId]",
    source: "src/app/api/projects/[projectId]/route.ts",
    area: "api",
    critical: true,
    requirement: "project",
  },
  {
    id: "version-restore-api",
    label: "Version restore API",
    path: "/api/projects/[projectId]/versions/[versionId]/restore",
    source: "src/app/api/projects/[projectId]/versions/[versionId]/restore/route.ts",
    area: "api",
    critical: true,
    requirement: "project-version",
  },
  {
    id: "verification-route",
    label: "Email verification route",
    path: "/verify-email",
    source: "src/app/verify-email/page.tsx",
    area: "app",
    critical: false,
    requirement: "auth-email",
  },
];
