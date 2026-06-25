import type { DesignTemplateSummary } from "@/features/editor/types";
import type {
  WorkspacePackageContext,
  WorkspacePackageItem,
  WorkspacePackageSection,
} from "@/features/operations/workspace-package-operations-types";
import {
  approvalScore,
  average,
  clampScore,
  comparePackageItems,
  coverageScore,
  createBundleDetail,
  createLatestCompletedExportMap,
  createLatestVersionMap,
  createSourceFamilyCount,
  formatDate,
  scoreToStatus,
} from "@/features/operations/workspace-package-operations-utils";

export function createProjectBundleSection(
  context: WorkspacePackageContext,
): WorkspacePackageSection {
  const latestVersions = createLatestVersionMap(context.projectVersions);
  const latestExports = createLatestCompletedExportMap(context.serverExportJobs);
  const handoffPackets = new Map(
    context.projectHandoffPackets.map((packet) => [packet.projectId, packet]),
  );
  const items = context.activeProjects
    .map((project) => {
      const latestVersion = latestVersions.get(project.id) ?? null;
      const latestExport = latestExports.get(project.id) ?? null;
      const handoffPacket = handoffPackets.get(project.id) ?? null;
      const versionFresh =
        latestVersion !== null &&
        Date.parse(latestVersion.createdAt) >= Date.parse(project.updatedAt);
      const bundleScore = average([
        versionFresh ? 100 : latestVersion ? 65 : 0,
        latestExport ? 100 : 20,
        handoffPacket ? handoffPacket.packetScore : 0,
        approvalScore(project.approvalStatus),
      ]);

      return {
        id: project.id,
        title: project.name,
        detail: createBundleDetail({
          latestVersion,
          versionFresh,
          latestExport,
          handoffPacket,
        }),
        href: `/editor/${project.id}`,
        status: scoreToStatus(
          bundleScore,
          latestVersion === null ||
            handoffPacket?.status === "blocked" ||
            project.approvalStatus === "changes-requested",
        ),
        badge: `${bundleScore}/100`,
        meta: [
          latestVersion
            ? `Snapshot ${formatDate(latestVersion.createdAt)}`
            : "No snapshot",
          latestExport
            ? `${latestExport.formatLabel} export`
            : "No completed export",
          handoffPacket ? `${handoffPacket.status} packet` : "No handoff packet",
        ],
      } satisfies WorkspacePackageItem;
    })
    .sort(comparePackageItems)
    .slice(0, 8);
  const readyBundles = items.filter((item) => item.status === "ready").length;
  const score = context.activeProjects.length
    ? average(items.map((item) => Number.parseInt(item.badge, 10)))
    : 0;

  return {
    id: "project-bundles",
    title: "Project bundles",
    description:
      "Version snapshots, exports, approval state, and handoff packets per active design.",
    status: scoreToStatus(score, items.some((item) => item.status === "blocked")),
    score,
    metricLabel: "ready bundles",
    metricValue: readyBundles,
    emptyState: "Create a project before preparing reusable project bundles.",
    items,
  };
}

export function createComponentKitSection(
  context: WorkspacePackageContext,
): WorkspacePackageSection {
  const kits = [
    createTemplateKitItem({
      id: "brand-kits",
      title: "Brand component kits",
      templates: context.templates.filter((template) => template.isBrandTemplate),
      detail: "Brand-safe templates that can be packaged as repeatable kits.",
    }),
    createTemplateKitItem({
      id: "team-kits",
      title: "Team reusable kits",
      templates: context.templates.filter((template) => template.isTeamTemplate),
      detail: "Workspace templates available for internal reuse.",
    }),
    createTemplateKitItem({
      id: "marketplace-kits",
      title: "Marketplace install kits",
      templates: context.templates.filter(
        (template) => template.marketplaceStatus === "published",
      ),
      detail: "Published template groups that can install into other workspaces.",
    }),
    createTemplateKitItem({
      id: "approved-kits",
      title: "Approved starter kits",
      templates: context.templates.filter(
        (template) => template.approvalStatus === "approved",
      ),
      detail: "Approved starter templates ready for safe package inclusion.",
    }),
  ];
  const populatedKits = kits.filter((kit) => kit.count > 0);
  const approvedTemplates = context.templates.filter(
    (template) =>
      template.approvalStatus === "approved" ||
      template.marketplaceStatus === "published",
  ).length;
  const coverageScoreValue = context.templates.length
    ? Math.round((approvedTemplates / context.templates.length) * 30)
    : 0;
  const shelfScore = Math.round((populatedKits.length / kits.length) * 70);
  const score = context.templates.length ? shelfScore + coverageScoreValue : 0;

  return {
    id: "component-kits",
    title: "Reusable component kits",
    description:
      "Brand, team, marketplace, and approved template shelves for package reuse.",
    status: scoreToStatus(score, false),
    score,
    metricLabel: "usable kits",
    metricValue: populatedKits.length,
    emptyState: "Approve templates or publish starter packs to create reusable kits.",
    items: kits,
  };
}

export function createDependencyHealthSection(
  context: WorkspacePackageContext,
): WorkspacePackageSection {
  const projectIds = new Set(context.activeProjects.map((project) => project.id));
  const latestVersions = createLatestVersionMap(context.projectVersions);
  const latestExports = createLatestCompletedExportMap(context.serverExportJobs);
  const variants = context.activeProjects.filter(
    (project) => project.sourceProjectId || project.variantProfileId,
  );
  const orphanedVariants = variants.filter(
    (project) =>
      project.sourceProjectId !== null && !projectIds.has(project.sourceProjectId),
  );
  const staleSnapshots = context.activeProjects.filter((project) => {
    const latestVersion = latestVersions.get(project.id);

    return (
      latestVersion !== undefined &&
      Date.parse(project.updatedAt) > Date.parse(latestVersion.createdAt)
    );
  });
  const missingSnapshots = context.activeProjects.filter(
    (project) => !latestVersions.has(project.id),
  );
  const exportMissing = context.activeProjects.filter(
    (project) => !latestExports.has(project.id),
  );
  const sharedProjects = context.activeProjects.filter(
    (project) => project.publicShareId || project.editShareId,
  );
  const score = clampScore(
    100 -
      orphanedVariants.length * 35 -
      missingSnapshots.length * 12 -
      staleSnapshots.length * 8 -
      exportMissing.length * 7,
  );
  const items: WorkspacePackageItem[] = [
    {
      id: "source-variants",
      title: "Source and variant links",
      detail: orphanedVariants.length
        ? "Some derivatives point to source designs that are no longer active."
        : "Variant relationships resolve to active source designs.",
      href: null,
      status: orphanedVariants.length ? "blocked" : "ready",
      badge: `${orphanedVariants.length} orphaned`,
      meta: [
        `${variants.length} variants`,
        `${createSourceFamilyCount(context.activeProjects)} source families`,
        `${projectIds.size} active projects`,
      ],
    },
    {
      id: "snapshot-drift",
      title: "Version dependency drift",
      detail: staleSnapshots.length
        ? "Some projects changed after their latest reusable snapshot."
        : "Latest snapshots are aligned with saved projects.",
      href: null,
      status: missingSnapshots.length
        ? "blocked"
        : staleSnapshots.length
          ? "review"
          : "ready",
      badge: `${missingSnapshots.length + staleSnapshots.length} drift`,
      meta: [
        `${missingSnapshots.length} missing snapshots`,
        `${staleSnapshots.length} stale snapshots`,
      ],
    },
    {
      id: "share-contracts",
      title: "Share contract surface",
      detail: sharedProjects.length
        ? "Share links are visible in package dependency review."
        : "No public or editable share links are attached to active projects.",
      href: null,
      status: "ready",
      badge: `${sharedProjects.length} links`,
      meta: [
        `${context.activeProjects.filter((project) => project.publicShareId).length} public`,
        `${context.activeProjects.filter((project) => project.editShareId).length} edit`,
      ],
    },
    {
      id: "export-dependencies",
      title: "Export dependency cache",
      detail: exportMissing.length
        ? "Some active projects do not have a completed export artifact."
        : "Completed export artifacts exist for active package candidates.",
      href: null,
      status: exportMissing.length ? "review" : "ready",
      badge: `${exportMissing.length} missing`,
      meta: [
        `${latestExports.size} projects exported`,
        `${context.serverExportJobs.length} server jobs tracked`,
      ],
    },
  ];

  return {
    id: "dependency-health",
    title: "Dependency health",
    description:
      "Source variants, package snapshots, share contracts, and export cache coverage.",
    status: scoreToStatus(score, orphanedVariants.length > 0 || missingSnapshots.length > 0),
    score,
    metricLabel: "blocked dependencies",
    metricValue: orphanedVariants.length + missingSnapshots.length,
    emptyState: "No dependency checks are available until projects exist.",
    items,
  };
}

export function createMigrationCheckSection(
  context: WorkspacePackageContext,
): WorkspacePackageSection {
  const latestVersions = createLatestVersionMap(context.projectVersions);
  const latestExports = createLatestCompletedExportMap(context.serverExportJobs);
  const readyPackets = context.projectHandoffPackets.filter(
    (packet) => packet.status === "ready",
  );
  const reusableTemplates = context.templates.filter(
    (template) =>
      template.isBrandTemplate ||
      template.isTeamTemplate ||
      template.marketplaceStatus === "published",
  );
  const projectCount = context.activeProjects.length;
  const versionCoverage = coverageScore(latestVersions.size, projectCount);
  const exportCoverage = coverageScore(latestExports.size, projectCount);
  const packetCoverage = coverageScore(readyPackets.length, projectCount);
  const kitCoverage = coverageScore(
    reusableTemplates.length,
    Math.max(1, context.templates.length),
  );
  const checks: WorkspacePackageItem[] = [
    createMigrationItem({
      id: "restore-runway",
      title: "Restore runway",
      readyCount: latestVersions.size,
      totalCount: projectCount,
      score: versionCoverage,
      detail: "Project snapshots available for bundle restore and rollback.",
    }),
    createMigrationItem({
      id: "export-runway",
      title: "Export runway",
      readyCount: latestExports.size,
      totalCount: projectCount,
      score: exportCoverage,
      detail: "Completed export artifacts available for package migration.",
    }),
    createMigrationItem({
      id: "handoff-runway",
      title: "Handoff runway",
      readyCount: readyPackets.length,
      totalCount: projectCount,
      score: packetCoverage,
      detail: "Ready handoff packets available for workspace transfer.",
    }),
    createMigrationItem({
      id: "kit-runway",
      title: "Template kit runway",
      readyCount: reusableTemplates.length,
      totalCount: context.templates.length,
      score: kitCoverage,
      detail: "Reusable template kits available for import into another workspace.",
    }),
  ];
  const readyChecks = checks.filter((check) => check.status === "ready").length;
  const score = average([versionCoverage, exportCoverage, packetCoverage, kitCoverage]);

  return {
    id: "migration-checks",
    title: "Import and export migration checks",
    description:
      "Restore, export, handoff, and kit readiness for moving work between environments.",
    status: scoreToStatus(score, checks.some((check) => check.status === "blocked")),
    score,
    metricLabel: "ready checks",
    metricValue: readyChecks,
    emptyState: "Create projects, snapshots, exports, and kits before migration checks.",
    items: checks,
  };
}

function createTemplateKitItem(input: {
  id: string;
  title: string;
  templates: DesignTemplateSummary[];
  detail: string;
}): WorkspacePackageItem & { count: number } {
  const approvedCount = input.templates.filter(
    (template) =>
      template.approvalStatus === "approved" ||
      template.marketplaceStatus === "published",
  ).length;
  const coverage = coverageScore(approvedCount, input.templates.length);

  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    href: null,
    status: input.templates.length ? scoreToStatus(coverage, false) : "review",
    badge: `${input.templates.length} templates`,
    meta: [
      `${approvedCount} approved`,
      `${coverage}/100 coverage`,
      input.templates[0]?.name ?? "No examples yet",
    ],
    count: input.templates.length,
  };
}

function createMigrationItem(input: {
  id: string;
  title: string;
  readyCount: number;
  totalCount: number;
  score: number;
  detail: string;
}): WorkspacePackageItem {
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    href: null,
    status: scoreToStatus(
      input.score,
      input.totalCount > 0 && input.readyCount === 0,
    ),
    badge: `${input.readyCount}/${input.totalCount}`,
    meta: [`${input.score}/100 readiness`],
  };
}
