import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { approvalStatusLabels } from "@/features/review/approval-status";
import {
  templateMarketplaceStatusLabels,
} from "@/features/templates/template-marketplace";
import { createTemplatePackageRegistry } from "@/features/templates/template-package-registry";
import type {
  TemplateDesignDeprecationNotice,
  TemplateDesignMigrationSuggestion,
  TemplateDesignReleaseChannel,
  TemplateDesignReleaseChannelId,
  TemplateDesignReleaseChannelsCenter,
  TemplateDesignReleaseDependencyImpact,
  TemplateDesignReleaseDependencyProject,
  TemplateDesignReleaseEntry,
  TemplateDesignReleaseStatus,
  TemplateDesignRollbackPacket,
} from "@/features/templates/template-design-release-channels-types";

export type {
  TemplateDesignDeprecationNotice,
  TemplateDesignMigrationSuggestion,
  TemplateDesignReleaseChannel,
  TemplateDesignReleaseChannelId,
  TemplateDesignReleaseChannelsCenter,
  TemplateDesignReleaseDependencyImpact,
  TemplateDesignReleaseDependencyProject,
  TemplateDesignReleaseEntry,
  TemplateDesignReleaseStatus,
  TemplateDesignRollbackPacket,
} from "@/features/templates/template-design-release-channels-types";

export function createTemplateDesignReleaseChannelsCenter(input: {
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date | string;
}): TemplateDesignReleaseChannelsCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const versionCounts = createVersionCounts(input.projectVersions);
  const latestVersions = createLatestVersionMap(input.projectVersions);
  const packageRegistry = createTemplatePackageRegistry({
    templates: input.templates,
    projects: activeProjects,
    projectVersions: input.projectVersions,
    auditLogs: input.auditLogs,
  });
  const packageVersionByTemplateId = new Map(
    packageRegistry.packages.map((entry) => [entry.templateId, entry.version]),
  );
  const entries = input.templates
    .map((template) =>
      createReleaseEntry({
        template,
        templates: input.templates,
        activeProjects,
        versionCounts,
        latestVersions,
        version:
          packageVersionByTemplateId.get(template.id) ??
          createFallbackVersion(template, input.auditLogs),
        now,
      }),
    )
    .sort(compareReleaseEntries);
  const channels = createChannels(entries);
  const deprecationNotices = entries
    .map((entry) => entry.deprecationNotice)
    .filter(
      (notice): notice is TemplateDesignDeprecationNotice => notice !== null,
    );
  const migrationSuggestions = entries.flatMap(
    (entry) => entry.migrationSuggestions,
  );
  const dependencyImpacts = entries.map((entry) => entry.dependencyImpact);
  const rollbackPackets = entries.map((entry) => entry.rollbackPacket);
  const score = average(entries.map((entry) => entry.score), 100);
  const status = aggregateStatus(entries.map((entry) => entry.status));

  return {
    generatedAt,
    status,
    score,
    releaseEntries: entries,
    channels,
    deprecationNotices,
    migrationSuggestions,
    dependencyImpacts,
    rollbackPackets,
    nextActions: createNextActions(entries),
    totals: {
      templates: entries.length,
      channels: channels.length,
      stagedRollouts: entries.filter((entry) => entry.rolloutPercent > 0)
        .length,
      deprecationNotices: deprecationNotices.length,
      migrationSuggestions: migrationSuggestions.length,
      dependencyImpacts: dependencyImpacts.filter(
        (impact) => impact.affectedProjects > 0,
      ).length,
      rollbackSafePackets: rollbackPackets.filter(
        (packet) => packet.status === "ready",
      ).length,
      affectedProjects: dependencyImpacts.reduce(
        (total, impact) => total + impact.affectedProjects,
        0,
      ),
      publicSurfaces: dependencyImpacts.reduce(
        (total, impact) => total + impact.publicSurfaces,
        0,
      ),
    },
  };
}

function createReleaseEntry(input: {
  template: DesignTemplateSummary;
  templates: DesignTemplateSummary[];
  activeProjects: ProjectSummary[];
  versionCounts: Map<string, number>;
  latestVersions: Map<string, ProjectVersionSummary>;
  version: string;
  now: Date;
}): TemplateDesignReleaseEntry {
  const channel = chooseChannel(input.template);
  const dependencyImpact = createDependencyImpact({
    template: input.template,
    projects: input.activeProjects,
    versionCounts: input.versionCounts,
    latestVersions: input.latestVersions,
  });
  const replacement = findReplacementTemplate({
    template: input.template,
    templates: input.templates,
  });
  const deprecationNotice = createDeprecationNotice({
    template: input.template,
    dependencyImpact,
    replacement,
    now: input.now,
  });
  const migrationSuggestions = createMigrationSuggestions({
    template: input.template,
    dependencyImpact,
    replacement,
    deprecationNotice,
  });
  const rollbackPacket = createRollbackPacket({
    template: input.template,
    version: input.version,
    channelId: channel.id,
    dependencyImpact,
  });
  const status = aggregateStatus([
    channel.status,
    dependencyImpact.status,
    deprecationNotice?.status ?? "ready",
    rollbackPacket.status,
    ...migrationSuggestions.map((suggestion) => suggestion.status),
  ]);
  const score = average([
    statusScore(channel.status),
    statusScore(dependencyImpact.status),
    statusScore(deprecationNotice?.status ?? "ready"),
    statusScore(rollbackPacket.status),
    migrationSuggestions.length
      ? average(
          migrationSuggestions.map((suggestion) =>
            statusScore(suggestion.status),
          ),
        )
      : 100,
  ]);

  return {
    id: `template-release-${input.template.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    href: `/templates/${input.template.id}`,
    version: input.version,
    channelId: channel.id,
    channelLabel: channel.label,
    stageLabel: channel.stageLabel,
    rolloutPercent: channel.rolloutPercent,
    status,
    score,
    marketplaceLabel:
      templateMarketplaceStatusLabels[input.template.marketplaceStatus],
    approvalLabel: approvalStatusLabels[input.template.approvalStatus],
    dependencyImpact,
    deprecationNotice,
    migrationSuggestions,
    rollbackPacket,
    nextAction: createEntryNextAction({
      channel,
      dependencyImpact,
      deprecationNotice,
      rollbackPacket,
      migrationSuggestions,
    }),
  };
}

function chooseChannel(template: DesignTemplateSummary): {
  id: TemplateDesignReleaseChannelId;
  label: string;
  stageLabel: string;
  rolloutPercent: number;
  status: TemplateDesignReleaseStatus;
} {
  if (template.marketplaceStatus === "archived") {
    return {
      id: "stable",
      label: channelDefinitions.stable.label,
      stageLabel: "Deprecated hold",
      rolloutPercent: 0,
      status: "review",
    };
  }

  if (template.approvalStatus === "changes-requested") {
    return {
      id: "canary",
      label: channelDefinitions.canary.label,
      stageLabel: "Canary blocked",
      rolloutPercent: 0,
      status: "blocked",
    };
  }

  if (
    template.marketplaceStatus === "review" ||
    template.approvalStatus === "in-review" ||
    hasUnreleasedChanges(template)
  ) {
    return {
      id: "beta",
      label: channelDefinitions.beta.label,
      stageLabel: "Reviewer rollout",
      rolloutPercent: channelDefinitions.beta.rolloutPercent,
      status: "review",
    };
  }

  if (
    template.marketplaceStatus === "published" &&
    template.approvalStatus === "approved"
  ) {
    return {
      id: "stable",
      label: channelDefinitions.stable.label,
      stageLabel: "General release",
      rolloutPercent: channelDefinitions.stable.rolloutPercent,
      status: "ready",
    };
  }

  return {
    id: "canary",
    label: channelDefinitions.canary.label,
    stageLabel: "Creator preview",
    rolloutPercent: channelDefinitions.canary.rolloutPercent,
    status: template.approvalStatus === "approved" ? "review" : "blocked",
  };
}

function createDependencyImpact(input: {
  template: DesignTemplateSummary;
  projects: ProjectSummary[];
  versionCounts: Map<string, number>;
  latestVersions: Map<string, ProjectVersionSummary>;
}): TemplateDesignReleaseDependencyImpact {
  const projects = input.projects
    .map((project) =>
      createDependencyProject({
        template: input.template,
        project,
        versionCount: input.versionCounts.get(project.id) ?? 0,
        latestVersion: input.latestVersions.get(project.id) ?? null,
      }),
    )
    .filter(
      (
        project,
      ): project is TemplateDesignReleaseDependencyProject => project !== null,
    )
    .sort(compareDependencyProjects)
    .slice(0, 10);
  const restorableProjects = projects.filter(
    (project) => project.versionCount > 0,
  ).length;
  const blockedProjects = projects.filter(
    (project) => project.status === "blocked",
  ).length;
  const publicSurfaces = projects.filter((project) => project.publicSurface)
    .length;
  const status = createDependencyImpactStatus({
    projects,
    restorableProjects,
    blockedProjects,
  });

  return {
    id: `template-release-impact-${input.template.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    status,
    affectedProjects: projects.length,
    restorableProjects,
    blockedProjects,
    publicSurfaces,
    detail: createDependencyImpactDetail({
      affectedProjects: projects.length,
      restorableProjects,
      blockedProjects,
      publicSurfaces,
    }),
    projects,
  };
}

function createDependencyProject(input: {
  template: DesignTemplateSummary;
  project: ProjectSummary;
  versionCount: number;
  latestVersion: ProjectVersionSummary | null;
}): TemplateDesignReleaseDependencyProject | null {
  const relation = createDependencyRelation(input.template, input.project);

  if (!relation) return null;

  const status = createDependencyProjectStatus({
    project: input.project,
    versionCount: input.versionCount,
  });

  return {
    projectId: input.project.id,
    projectName: input.project.name,
    relation,
    status,
    versionCount: input.versionCount,
    latestVersionAt: input.latestVersion?.createdAt ?? null,
    publicSurface: Boolean(input.project.publicShareId || input.project.editShareId),
    href: `/editor/${input.project.id}`,
  };
}

function createDependencyRelation(
  template: DesignTemplateSummary,
  project: ProjectSummary,
): TemplateDesignReleaseDependencyProject["relation"] | null {
  if (project.sourceProjectId) {
    return project.sourceProjectId === template.id ? "source" : null;
  }

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

function createDeprecationNotice(input: {
  template: DesignTemplateSummary;
  dependencyImpact: TemplateDesignReleaseDependencyImpact;
  replacement: DesignTemplateSummary | null;
  now: Date;
}): TemplateDesignDeprecationNotice | null {
  if (
    input.template.marketplaceStatus !== "archived" &&
    input.template.approvalStatus !== "changes-requested"
  ) {
    return null;
  }

  const blocked =
    input.template.approvalStatus === "changes-requested" &&
    input.dependencyImpact.affectedProjects > 0 &&
    !input.replacement;
  const effectiveAt =
    input.template.marketplaceStatus === "archived"
      ? addDays(input.now, 30).toISOString()
      : input.now.toISOString();

  return {
    id: `template-deprecation-${input.template.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    status: blocked ? "blocked" : "review",
    title:
      input.template.marketplaceStatus === "archived"
        ? `${input.template.name} is deprecated`
        : `${input.template.name} is held for requested changes`,
    detail: input.replacement
      ? `Route dependent designs through a migration to ${input.replacement.name} before the notice takes effect.`
      : "Publish an approved replacement before dependent designs migrate away from this template.",
    effectiveAt,
    replacementTemplateId: input.replacement?.id ?? null,
    replacementTemplateName: input.replacement?.name ?? null,
    audience: [
      `${input.dependencyImpact.affectedProjects} dependent design${plural(input.dependencyImpact.affectedProjects)}`,
      `${input.template.marketplaceUseCount} recorded use${plural(input.template.marketplaceUseCount)}`,
      templateMarketplaceStatusLabels[input.template.marketplaceStatus],
    ],
  };
}

function createMigrationSuggestions(input: {
  template: DesignTemplateSummary;
  dependencyImpact: TemplateDesignReleaseDependencyImpact;
  replacement: DesignTemplateSummary | null;
  deprecationNotice: TemplateDesignDeprecationNotice | null;
}): TemplateDesignMigrationSuggestion[] {
  if (!input.deprecationNotice || !input.replacement) return [];

  const confidence = createMigrationConfidence(input.template, input.replacement);
  const status = confidence >= 80 ? "ready" : "review";

  return [
    {
      id: `template-migration-${input.template.id}-${input.replacement.id}`,
      fromTemplateId: input.template.id,
      fromTemplateName: input.template.name,
      toTemplateId: input.replacement.id,
      toTemplateName: input.replacement.name,
      status,
      confidence,
      reason: createMigrationReason(input.template, input.replacement),
      affectedProjectIds: input.dependencyImpact.projects.map(
        (project) => project.projectId,
      ),
    },
  ];
}

function createRollbackPacket(input: {
  template: DesignTemplateSummary;
  version: string;
  channelId: TemplateDesignReleaseChannelId;
  dependencyImpact: TemplateDesignReleaseDependencyImpact;
}): TemplateDesignRollbackPacket {
  const status = createRollbackStatus(input.dependencyImpact);
  const previousVersion = createPreviousVersion(input.version);
  const steps = [
    `Pin template package ${input.template.name} to previous version ${previousVersion}.`,
    "Restore dependent designs from the latest pre-release project snapshots.",
    "Pause staged rollout automation before publishing another channel update.",
    "Re-run dependency impact and marketplace approval checks before resuming.",
  ];
  const packet = {
    templateId: input.template.id,
    templateName: input.template.name,
    channelId: input.channelId,
    currentVersion: input.version,
    previousVersion,
    status,
    dependencyImpact: input.dependencyImpact,
    steps,
  };

  return {
    id: `template-rollback-${input.template.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    status,
    previousVersion,
    fileName: `${slugify(input.template.name)}-rollback-packet.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(packet, null, 2),
    )}`,
    steps,
    impactedProjectIds: input.dependencyImpact.projects.map(
      (project) => project.projectId,
    ),
  };
}

function findReplacementTemplate(input: {
  template: DesignTemplateSummary;
  templates: DesignTemplateSummary[];
}) {
  if (
    input.template.marketplaceStatus !== "archived" &&
    input.template.approvalStatus !== "changes-requested"
  ) {
    return null;
  }

  return (
    input.templates
      .filter(
        (template) =>
          template.id !== input.template.id &&
          template.marketplaceStatus !== "archived" &&
          template.approvalStatus === "approved",
      )
      .map((template) => ({
        template,
        score: createReplacementScore(input.template, template),
      }))
      .filter((candidate) => candidate.score >= 50)
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.template.marketplaceUseCount - left.template.marketplaceUseCount ||
          left.template.name.localeCompare(right.template.name),
      )[0]?.template ?? null
  );
}

function createChannels(
  entries: TemplateDesignReleaseEntry[],
): TemplateDesignReleaseChannel[] {
  return channelOrder.map((id) => {
    const definition = channelDefinitions[id];
    const channelEntries = entries.filter((entry) => entry.channelId === id);
    const status = aggregateStatus(channelEntries.map((entry) => entry.status));

    return {
      id,
      label: definition.label,
      description: definition.description,
      rolloutPercent: definition.rolloutPercent,
      status,
      entries: channelEntries,
      summary: channelEntries.length
        ? `${channelEntries.length} template${plural(channelEntries.length)} in ${definition.label.toLowerCase()} with ${definition.rolloutPercent}% default rollout.`
        : `No templates currently assigned to ${definition.label.toLowerCase()}.`,
    };
  });
}

function createEntryNextAction(input: {
  channel: ReturnType<typeof chooseChannel>;
  dependencyImpact: TemplateDesignReleaseDependencyImpact;
  deprecationNotice: TemplateDesignDeprecationNotice | null;
  rollbackPacket: TemplateDesignRollbackPacket;
  migrationSuggestions: TemplateDesignMigrationSuggestion[];
}) {
  if (input.deprecationNotice && !input.migrationSuggestions.length) {
    return "Publish an approved replacement before issuing the deprecation notice.";
  }

  if (input.dependencyImpact.status !== "ready") {
    return input.dependencyImpact.detail;
  }

  if (input.rollbackPacket.status !== "ready") {
    return "Create restorable snapshots before promoting this update.";
  }

  if (input.channel.status === "review") {
    return "Review staged rollout evidence before promotion.";
  }

  return "Release channel is ready with dependency and rollback evidence.";
}

function createNextActions(entries: TemplateDesignReleaseEntry[]) {
  return entries
    .filter((entry) => entry.status !== "ready")
    .map(
      (entry) =>
        `${entry.templateName}: ${entry.nextAction}`,
    )
    .slice(0, 5);
}

function createDependencyProjectStatus(input: {
  project: ProjectSummary;
  versionCount: number;
}): TemplateDesignReleaseStatus {
  if (input.project.approvalStatus === "changes-requested") return "blocked";
  if (input.versionCount === 0) return "review";
  return "ready";
}

function createDependencyImpactStatus(input: {
  projects: TemplateDesignReleaseDependencyProject[];
  restorableProjects: number;
  blockedProjects: number;
}): TemplateDesignReleaseStatus {
  if (input.blockedProjects > 0) return "blocked";
  if (!input.projects.length) return "ready";
  if (input.restorableProjects < input.projects.length) return "review";
  return "ready";
}

function createDependencyImpactDetail(input: {
  affectedProjects: number;
  restorableProjects: number;
  blockedProjects: number;
  publicSurfaces: number;
}) {
  if (!input.affectedProjects) {
    return "No dependent designs are currently attached to this template.";
  }

  if (input.blockedProjects) {
    return `${input.blockedProjects} dependent design${plural(input.blockedProjects)} need approval before rollout.`;
  }

  if (input.restorableProjects < input.affectedProjects) {
    return `${input.affectedProjects - input.restorableProjects} dependent design${plural(input.affectedProjects - input.restorableProjects)} need snapshots before rollback is safe.`;
  }

  return `${input.affectedProjects} dependent design${plural(input.affectedProjects)} have rollback snapshots; ${input.publicSurfaces} public surface${plural(input.publicSurfaces)} will be watched during rollout.`;
}

function createRollbackStatus(
  impact: TemplateDesignReleaseDependencyImpact,
): TemplateDesignReleaseStatus {
  if (!impact.affectedProjects) return "ready";
  if (impact.blockedProjects > 0) return "blocked";
  if (impact.restorableProjects === impact.affectedProjects) return "ready";
  return impact.restorableProjects > 0 ? "review" : "blocked";
}

function hasUnreleasedChanges(template: DesignTemplateSummary) {
  if (!template.marketplacePublishedAt) return false;
  return (
    Date.parse(template.updatedAt) >
    Date.parse(template.marketplacePublishedAt) + 60_000
  );
}

function createVersionCounts(projectVersions: ProjectVersionSummary[]) {
  const counts = new Map<string, number>();

  for (const version of projectVersions) {
    counts.set(version.projectId, (counts.get(version.projectId) ?? 0) + 1);
  }

  return counts;
}

function createLatestVersionMap(projectVersions: ProjectVersionSummary[]) {
  const latestVersions = new Map<string, ProjectVersionSummary>();

  for (const version of projectVersions) {
    const previous = latestVersions.get(version.projectId);

    if (!previous || Date.parse(version.createdAt) > Date.parse(previous.createdAt)) {
      latestVersions.set(version.projectId, version);
    }
  }

  return latestVersions;
}

function createFallbackVersion(
  template: DesignTemplateSummary,
  auditLogs: WorkspaceAuditLogSummary[],
) {
  const major = template.marketplaceStatus === "published" ? 1 : 0;
  const reviewEvents = auditLogs.filter(
    (log) => log.targetId === template.id && log.targetType === "template",
  ).length;
  const patch = Math.max(0, template.marketplaceUseCount + reviewEvents);

  return `${major}.${Math.max(0, reviewEvents)}.${patch}`;
}

function createPreviousVersion(version: string) {
  const [major = "0", minor = "0", patch = "0"] = version.split(".");
  const patchNumber = Number.parseInt(patch, 10);

  if (Number.isFinite(patchNumber) && patchNumber > 0) {
    return `${major}.${minor}.${patchNumber - 1}`;
  }

  return `${major}.${minor}.0`;
}

function createMigrationConfidence(
  fromTemplate: DesignTemplateSummary,
  toTemplate: DesignTemplateSummary,
) {
  return Math.min(100, createReplacementScore(fromTemplate, toTemplate));
}

function createMigrationReason(
  fromTemplate: DesignTemplateSummary,
  toTemplate: DesignTemplateSummary,
) {
  const reasons = [];

  if (fromTemplate.marketplaceCollection === toTemplate.marketplaceCollection) {
    reasons.push("same collection");
  }

  if (
    fromTemplate.width === toTemplate.width &&
    fromTemplate.height === toTemplate.height
  ) {
    reasons.push("same dimensions");
  }

  if (toTemplate.marketplaceStatus === "published") {
    reasons.push("published replacement");
  }

  return `Recommended because it has ${reasons.join(", ")}.`;
}

function createReplacementScore(
  fromTemplate: DesignTemplateSummary,
  toTemplate: DesignTemplateSummary,
) {
  let score = 0;

  if (fromTemplate.marketplaceCollection === toTemplate.marketplaceCollection) {
    score += 40;
  }

  if (
    fromTemplate.width === toTemplate.width &&
    fromTemplate.height === toTemplate.height
  ) {
    score += 30;
  }

  if (toTemplate.marketplaceStatus === "published") score += 20;
  if (toTemplate.isBrandTemplate === fromTemplate.isBrandTemplate) score += 5;
  if (toTemplate.isTeamTemplate === fromTemplate.isTeamTemplate) score += 5;

  return score + sharedTokenScore(fromTemplate.name, toTemplate.name);
}

function sharedTokenScore(left: string, right: string) {
  const leftTokens = new Set(normalizeLookup(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeLookup(right).split(" ").filter(Boolean));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));

  return Math.min(10, shared.length * 2);
}

function compareReleaseEntries(
  left: TemplateDesignReleaseEntry,
  right: TemplateDesignReleaseEntry,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    channelWeight(left.channelId) - channelWeight(right.channelId) ||
    right.dependencyImpact.affectedProjects -
      left.dependencyImpact.affectedProjects ||
    left.templateName.localeCompare(right.templateName)
  );
}

function compareDependencyProjects(
  left: TemplateDesignReleaseDependencyProject,
  right: TemplateDesignReleaseDependencyProject,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    Number(right.publicSurface) - Number(left.publicSurface) ||
    right.versionCount - left.versionCount ||
    left.projectName.localeCompare(right.projectName)
  );
}

function aggregateStatus(
  statuses: TemplateDesignReleaseStatus[],
): TemplateDesignReleaseStatus {
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";
  return "ready";
}

function statusScore(status: TemplateDesignReleaseStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 72;
  return 30;
}

function statusWeight(status: TemplateDesignReleaseStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;
  return 2;
}

function channelWeight(channelId: TemplateDesignReleaseChannelId) {
  if (channelId === "stable") return 0;
  if (channelId === "beta") return 1;
  return 2;
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;
  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeDate(value: Date | string | undefined) {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value: string) {
  return (
    normalizeLookup(value)
      .replace(/\s+/g, "-")
      .replace(/^-|-$/g, "") || "template"
  );
}

function plural(count: number) {
  return count === 1 ? "" : "s";
}

const channelOrder: TemplateDesignReleaseChannelId[] = [
  "stable",
  "beta",
  "canary",
];

const channelDefinitions: Record<
  TemplateDesignReleaseChannelId,
  {
    label: string;
    description: string;
    rolloutPercent: number;
  }
> = {
  stable: {
    label: "Stable",
    description: "Approved templates available to every workspace user.",
    rolloutPercent: 100,
  },
  beta: {
    label: "Beta",
    description: "Approved or review-ready updates staged for reviewers.",
    rolloutPercent: 35,
  },
  canary: {
    label: "Canary",
    description: "Early creator previews held to a narrow rollout.",
    rolloutPercent: 10,
  },
};
