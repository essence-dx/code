import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { approvalStatusLabels } from "@/features/review/approval-status";
import { templateMarketplaceStatusLabels } from "@/features/templates/template-marketplace";

export type TemplatePackageStatus = "ready" | "review" | "blocked";

export type TemplatePackageKind =
  | "brand-kit"
  | "team-kit"
  | "marketplace-kit"
  | "private-template";

export type TemplatePackageCheckId = "install" | "update" | "rollback";

export type TemplatePackageCheck = {
  id: TemplatePackageCheckId;
  label: string;
  status: TemplatePackageStatus;
  detail: string;
};

export type TemplatePackageChangelogEntry = {
  id: string;
  title: string;
  detail: string;
  actorEmail: string | null;
  createdAt: string;
};

export type TemplatePackageDependency = {
  id: string;
  projectId: string;
  projectName: string;
  relation: "source" | "name" | "dimensions";
  status: TemplatePackageStatus;
  versionCount: number;
  latestVersionAt: string | null;
  approvalStatus: ProjectSummary["approvalStatus"];
  href: string;
};

export type TemplatePackageEntry = {
  id: string;
  templateId: string;
  name: string;
  version: string;
  kind: TemplatePackageKind;
  kindLabel: string;
  status: TemplatePackageStatus;
  score: number;
  dimensions: string;
  marketplaceLabel: string;
  approvalLabel: string;
  checks: TemplatePackageCheck[];
  changelog: TemplatePackageChangelogEntry[];
  dependencies: TemplatePackageDependency[];
  nextAction: string;
  href: string;
  stats: {
    uses: number;
    views: number;
    dependencyCount: number;
    versionedDependencies: number;
  };
};

export type TemplatePackageDependencyView = {
  id: string;
  packageName: string;
  version: string;
  status: TemplatePackageStatus;
  score: number;
  detail: string;
  dependencies: TemplatePackageDependency[];
};

export type TemplatePackageRegistry = {
  status: TemplatePackageStatus;
  score: number;
  packages: TemplatePackageEntry[];
  dependencyViews: TemplatePackageDependencyView[];
  changelog: TemplatePackageChangelogEntry[];
  nextActions: string[];
  totals: {
    templates: number;
    installablePackages: number;
    updateChecks: number;
    rollbackReadyPackages: number;
    dependencyLinks: number;
    changelogEntries: number;
  };
};

export function createTemplatePackageRegistry(input: {
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
}): TemplatePackageRegistry {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const versionCounts = createVersionCounts(input.projectVersions);
  const latestVersions = createLatestVersionMap(input.projectVersions);
  const packages = input.templates
    .filter((template) => template.marketplaceStatus !== "archived")
    .map((template) =>
      createTemplatePackage({
        template,
        activeProjects,
        versionCounts,
        latestVersions,
        auditLogs: input.auditLogs,
      }),
    )
    .sort(comparePackages);
  const dependencyViews = packages
    .filter((item) => item.dependencies.length > 0)
    .map(createDependencyView)
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        left.score - right.score ||
        right.dependencies.length - left.dependencies.length ||
        left.packageName.localeCompare(right.packageName),
    )
    .slice(0, 8);
  const changelog = packages
    .flatMap((item) =>
      item.changelog.map((entry) => ({
        ...entry,
        id: `${item.id}-${entry.id}`,
        title: `${item.name}: ${entry.title}`,
      })),
    )
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, 8);
  const score = average(packages.map((item) => item.score));

  return {
    status: scoreToStatus(
      score,
      packages.some((item) => item.status === "blocked"),
    ),
    score,
    packages,
    dependencyViews,
    changelog,
    nextActions: createNextActions(packages, dependencyViews),
    totals: {
      templates: input.templates.length,
      installablePackages: packages.filter((item) =>
        item.checks.some(
          (check) => check.id === "install" && check.status === "ready",
        ),
      ).length,
      updateChecks: packages.filter((item) =>
        item.checks.some(
          (check) => check.id === "update" && check.status !== "ready",
        ),
      ).length,
      rollbackReadyPackages: packages.filter((item) =>
        item.checks.some(
          (check) => check.id === "rollback" && check.status === "ready",
        ),
      ).length,
      dependencyLinks: packages.reduce(
        (total, item) => total + item.dependencies.length,
        0,
      ),
      changelogEntries: changelog.length,
    },
  };
}

function createTemplatePackage(input: {
  template: DesignTemplateSummary;
  activeProjects: ProjectSummary[];
  versionCounts: Map<string, number>;
  latestVersions: Map<string, ProjectVersionSummary>;
  auditLogs: WorkspaceAuditLogSummary[];
}): TemplatePackageEntry {
  const dependencies = createDependencies({
    template: input.template,
    projects: input.activeProjects,
    versionCounts: input.versionCounts,
    latestVersions: input.latestVersions,
  });
  const changelog = createChangelog(input.template, input.auditLogs);
  const checks = [
    createInstallCheck(input.template),
    createUpdateCheck(input.template),
    createRollbackCheck(dependencies),
  ];
  const score = average([
    ...checks.map((check) => checkScore(check.status)),
    dependencies.length
      ? coverageScore(
          dependencies.filter((dependency) => dependency.status !== "blocked")
            .length,
          dependencies.length,
        )
      : 70,
    changelog.length ? 100 : 35,
  ]);
  const status = scoreToStatus(
    score,
    checks.some((check) => check.status === "blocked"),
  );

  return {
    id: `template-package-${input.template.id}`,
    templateId: input.template.id,
    name: input.template.name,
    version: createSemanticVersion(input.template, dependencies, changelog),
    kind: createPackageKind(input.template),
    kindLabel: createPackageKindLabel(input.template),
    status,
    score,
    dimensions: `${input.template.width} x ${input.template.height}`,
    marketplaceLabel:
      templateMarketplaceStatusLabels[input.template.marketplaceStatus],
    approvalLabel: approvalStatusLabels[input.template.approvalStatus],
    checks,
    changelog,
    dependencies,
    nextAction: createPackageNextAction({
      status,
      checks,
      dependencies,
      changelog,
    }),
    href: `/templates/${input.template.id}`,
    stats: {
      uses: input.template.marketplaceUseCount,
      views: input.template.marketplaceViewCount,
      dependencyCount: dependencies.length,
      versionedDependencies: dependencies.filter(
        (dependency) => dependency.versionCount > 0,
      ).length,
    },
  };
}

function createInstallCheck(template: DesignTemplateSummary): TemplatePackageCheck {
  if (
    template.marketplaceStatus === "published" ||
    template.approvalStatus === "approved"
  ) {
    return {
      id: "install",
      label: "Install",
      status: "ready",
      detail: "Package is approved for workspace installation.",
    };
  }

  if (
    template.marketplaceStatus === "review" ||
    template.approvalStatus === "in-review"
  ) {
    return {
      id: "install",
      label: "Install",
      status: "review",
      detail: "Package is still in review before broad installation.",
    };
  }

  return {
    id: "install",
    label: "Install",
    status: "blocked",
    detail: "Approve or publish this template before installing it as a package.",
  };
}

function createUpdateCheck(template: DesignTemplateSummary): TemplatePackageCheck {
  if (
    template.marketplaceStatus === "archived" ||
    template.approvalStatus === "changes-requested"
  ) {
    return {
      id: "update",
      label: "Update",
      status: "blocked",
      detail: "Resolve requested changes before cutting an update.",
    };
  }

  if (!template.marketplacePublishedAt) {
    return {
      id: "update",
      label: "Update",
      status: template.approvalStatus === "approved" ? "review" : "blocked",
      detail:
        template.approvalStatus === "approved"
          ? "Publish the first stable release for update tracking."
          : "Approve the draft before the first release can be tracked.",
    };
  }

  const updatedAfterPublish =
    Date.parse(template.updatedAt) >
    Date.parse(template.marketplacePublishedAt) + 60_000;

  if (updatedAfterPublish) {
    return {
      id: "update",
      label: "Update",
      status: "review",
      detail: "Template has unpublished edits after the current release.",
    };
  }

  return {
    id: "update",
    label: "Update",
    status: "ready",
    detail: "Current release metadata matches the latest template update.",
  };
}

function createRollbackCheck(
  dependencies: TemplatePackageDependency[],
): TemplatePackageCheck {
  if (!dependencies.length) {
    return {
      id: "rollback",
      label: "Rollback",
      status: "review",
      detail: "No active projects depend on this package yet.",
    };
  }

  const versionedDependencies = dependencies.filter(
    (dependency) => dependency.versionCount > 0,
  );

  if (versionedDependencies.length === dependencies.length) {
    return {
      id: "rollback",
      label: "Rollback",
      status: "ready",
      detail: "Every dependent project has a restorable snapshot.",
    };
  }

  if (versionedDependencies.length > 0) {
    return {
      id: "rollback",
      label: "Rollback",
      status: "review",
      detail: "Some dependent projects still need snapshots before rollback.",
    };
  }

  return {
    id: "rollback",
    label: "Rollback",
    status: "blocked",
    detail: "Create snapshots for dependent projects before rollback is safe.",
  };
}

function createDependencies(input: {
  template: DesignTemplateSummary;
  projects: ProjectSummary[];
  versionCounts: Map<string, number>;
  latestVersions: Map<string, ProjectVersionSummary>;
}): TemplatePackageDependency[] {
  return input.projects
    .map((project) => {
      const relation = createDependencyRelation(input.template, project);

      if (!relation) return null;

      const versionCount = input.versionCounts.get(project.id) ?? 0;
      const latestVersion = input.latestVersions.get(project.id) ?? null;

      return {
        id: `${input.template.id}-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        relation,
        status: createDependencyStatus({
          project,
          versionCount,
          latestVersionAt: latestVersion?.createdAt ?? null,
        }),
        versionCount,
        latestVersionAt: latestVersion?.createdAt ?? null,
        approvalStatus: project.approvalStatus,
        href: `/editor/${project.id}`,
      } satisfies TemplatePackageDependency;
    })
    .filter(
      (dependency): dependency is TemplatePackageDependency =>
        dependency !== null,
    )
    .sort(compareDependencies)
    .slice(0, 8);
}

function createDependencyRelation(
  template: DesignTemplateSummary,
  project: ProjectSummary,
): TemplatePackageDependency["relation"] | null {
  if (project.sourceProjectId === template.id) return "source";

  const templateName = normalizeLookup(template.name);
  const projectName = normalizeLookup(project.name);

  if (
    templateName.length >= 4 &&
    projectName.length >= 4 &&
    (projectName.includes(templateName) || templateName.includes(projectName))
  ) {
    return "name";
  }

  if (project.width === template.width && project.height === template.height) {
    return "dimensions";
  }

  return null;
}

function createDependencyStatus(input: {
  project: ProjectSummary;
  versionCount: number;
  latestVersionAt: string | null;
}): TemplatePackageStatus {
  if (input.project.approvalStatus === "changes-requested") return "blocked";
  if (!input.versionCount || !input.latestVersionAt) return "blocked";
  if (input.project.approvalStatus === "approved") return "ready";

  return "review";
}

function createChangelog(
  template: DesignTemplateSummary,
  auditLogs: WorkspaceAuditLogSummary[],
): TemplatePackageChangelogEntry[] {
  const lifecycleEntries: TemplatePackageChangelogEntry[] = [
    {
      id: "created",
      title: "Package created",
      detail: `${template.width} x ${template.height} template created.`,
      actorEmail: template.creatorEmail,
      createdAt: template.createdAt,
    },
  ];

  if (template.approvalStatus !== "draft") {
    lifecycleEntries.push({
      id: `approval-${template.approvalStatus}`,
      title: `Approval is ${approvalStatusLabels[template.approvalStatus]}`,
      detail: "Approval state is tracked for package install safety.",
      actorEmail: template.creatorEmail,
      createdAt: template.updatedAt,
    });
  }

  if (template.marketplacePublishedAt) {
    lifecycleEntries.push({
      id: "published",
      title: "Published release",
      detail: "Marketplace release is available for installation.",
      actorEmail: template.creatorEmail,
      createdAt: template.marketplacePublishedAt,
    });
  }

  if (Date.parse(template.updatedAt) > Date.parse(template.createdAt) + 60_000) {
    lifecycleEntries.push({
      id: "updated",
      title: "Template updated",
      detail: "Latest package metadata includes a template update.",
      actorEmail: template.creatorEmail,
      createdAt: template.updatedAt,
    });
  }

  if (template.marketplaceReviewNote.trim()) {
    lifecycleEntries.push({
      id: "review-note",
      title: "Curator note",
      detail: template.marketplaceReviewNote.trim(),
      actorEmail: template.creatorEmail,
      createdAt: template.updatedAt,
    });
  }

  const templateName = normalizeLookup(template.name);
  const auditEntries = auditLogs
    .filter(
      (log) =>
        log.targetId === template.id ||
        (templateName.length >= 4 &&
          normalizeLookup(log.summary).includes(templateName)),
    )
    .map((log) => ({
      id: `audit-${log.id}`,
      title: "Workspace activity",
      detail: log.summary,
      actorEmail: log.actorEmail,
      createdAt: log.createdAt,
    }));

  return uniqueChangelogEntries([...lifecycleEntries, ...auditEntries])
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, 8);
}

function createSemanticVersion(
  template: DesignTemplateSummary,
  dependencies: TemplatePackageDependency[],
  changelog: TemplatePackageChangelogEntry[],
) {
  const installReady =
    template.marketplaceStatus === "published" ||
    template.approvalStatus === "approved";
  const major = installReady ? 1 : 0;
  const minor = Math.min(
    99,
    changelog.filter((entry) => entry.id !== "created").length,
  );
  const patch = Math.min(
    99,
    dependencies.reduce(
      (total, dependency) => total + Math.min(3, dependency.versionCount),
      0,
    ),
  );

  return `${major}.${minor}.${patch}`;
}

function createPackageKind(template: DesignTemplateSummary): TemplatePackageKind {
  if (template.marketplaceStatus === "published") return "marketplace-kit";
  if (template.isBrandTemplate) return "brand-kit";
  if (template.isTeamTemplate) return "team-kit";

  return "private-template";
}

function createPackageKindLabel(template: DesignTemplateSummary) {
  const kind = createPackageKind(template);

  if (kind === "marketplace-kit") return "Marketplace kit";
  if (kind === "brand-kit") return "Brand kit";
  if (kind === "team-kit") return "Team kit";

  return "Private template";
}

function createPackageNextAction(input: {
  status: TemplatePackageStatus;
  checks: TemplatePackageCheck[];
  dependencies: TemplatePackageDependency[];
  changelog: TemplatePackageChangelogEntry[];
}) {
  const blockedCheck = input.checks.find((check) => check.status === "blocked");
  if (blockedCheck) return blockedCheck.detail;

  const reviewCheck = input.checks.find((check) => check.status === "review");
  if (reviewCheck) return reviewCheck.detail;

  const blockedDependency = input.dependencies.find(
    (dependency) => dependency.status === "blocked",
  );
  if (blockedDependency) {
    return `Create a restorable snapshot for ${blockedDependency.projectName}.`;
  }

  if (!input.changelog.length) return "Record a package changelog entry.";
  if (input.status === "ready") {
    return "Package is ready for install, update, and rollback workflows.";
  }

  return "Review package registry readiness before broad reuse.";
}

function createDependencyView(
  item: TemplatePackageEntry,
): TemplatePackageDependencyView {
  const score = coverageScore(
    item.dependencies.filter((dependency) => dependency.status !== "blocked")
      .length,
    item.dependencies.length,
  );

  return {
    id: `${item.id}-dependencies`,
    packageName: item.name,
    version: item.version,
    status: scoreToStatus(
      score,
      item.dependencies.some((dependency) => dependency.status === "blocked"),
    ),
    score,
    detail: `${item.dependencies.length} workspace project${item.dependencies.length === 1 ? "" : "s"} mapped to this package.`,
    dependencies: item.dependencies,
  };
}

function createNextActions(
  packages: TemplatePackageEntry[],
  dependencyViews: TemplatePackageDependencyView[],
) {
  const packageActions = packages
    .filter((item) => item.status !== "ready")
    .sort(comparePackages)
    .map((item) => `${item.name}: ${item.nextAction}`);
  const dependencyActions = dependencyViews
    .filter((view) => view.status !== "ready")
    .map(
      (view) =>
        `${view.packageName}: stabilize ${view.dependencies.length} dependency link${view.dependencies.length === 1 ? "" : "s"}.`,
    );

  return [...packageActions, ...dependencyActions].slice(0, 5);
}

function createVersionCounts(versions: ProjectVersionSummary[]) {
  const counts = new Map<string, number>();

  for (const version of versions) {
    counts.set(version.projectId, (counts.get(version.projectId) ?? 0) + 1);
  }

  return counts;
}

function createLatestVersionMap(versions: ProjectVersionSummary[]) {
  const latest = new Map<string, ProjectVersionSummary>();

  for (const version of versions) {
    const current = latest.get(version.projectId);

    if (
      !current ||
      Date.parse(version.createdAt) > Date.parse(current.createdAt)
    ) {
      latest.set(version.projectId, version);
    }
  }

  return latest;
}

function comparePackages(left: TemplatePackageEntry, right: TemplatePackageEntry) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    right.stats.dependencyCount - left.stats.dependencyCount ||
    left.name.localeCompare(right.name)
  );
}

function compareDependencies(
  left: TemplatePackageDependency,
  right: TemplatePackageDependency,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    relationWeight(left.relation) - relationWeight(right.relation) ||
    right.versionCount - left.versionCount ||
    left.projectName.localeCompare(right.projectName)
  );
}

function relationWeight(relation: TemplatePackageDependency["relation"]) {
  if (relation === "source") return 0;
  if (relation === "name") return 1;

  return 2;
}

function checkScore(status: TemplatePackageStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 20;
}

function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): TemplatePackageStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

function coverageScore(readyCount: number, totalCount: number) {
  if (totalCount <= 0) return 0;

  return Math.round((readyCount / totalCount) * 100);
}

function average(values: number[]) {
  if (!values.length) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(values.reduce((total, value) => total + value, 0) / values.length),
    ),
  );
}

function statusWeight(status: TemplatePackageStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function uniqueChangelogEntries(entries: TemplatePackageChangelogEntry[]) {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.id}:${entry.createdAt}:${entry.detail}`;

    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
}

function normalizeLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
