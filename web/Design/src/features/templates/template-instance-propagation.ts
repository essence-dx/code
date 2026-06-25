import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createRollbackPacket } from "@/features/templates/template-instance-propagation-packets";
import {
  createGroupNextAction,
  createNextActions,
  createUpdatePreview,
} from "@/features/templates/template-instance-propagation-previews";
import type {
  TemplateInstanceGroup,
  TemplateInstancePropagationCenter,
  TemplateInstanceRollbackPacket,
} from "@/features/templates/template-instance-propagation-types";
import {
  aggregateStatus,
  average,
  compareGroups,
  comparePreviews,
  createCampaignReferenceMap,
  createLatestVersionMap,
  findTemplateInstances,
  latestAuditForTemplate,
  normalizeDate,
  type CampaignProjectReference,
} from "@/features/templates/template-instance-propagation-utils";

export type {
  TemplateInstanceBreakingChange,
  TemplateInstanceBreakingChangeKind,
  TemplateInstanceChange,
  TemplateInstanceChangeKind,
  TemplateInstanceGroup,
  TemplateInstancePropagationCenter,
  TemplateInstancePropagationDecision,
  TemplateInstancePropagationStatus,
  TemplateInstanceRollbackPacket,
  TemplateInstanceUpdatePreview,
} from "@/features/templates/template-instance-propagation-types";

export function createTemplateInstancePropagationCenter(input: {
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  campaigns: CampaignBoardSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date | string;
}): TemplateInstancePropagationCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const latestVersions = createLatestVersionMap(input.projectVersions);
  const campaignReferences = createCampaignReferenceMap(input.campaigns);
  const templateGroups = input.templates
    .filter((template) => template.marketplaceStatus !== "archived")
    .map((template) =>
      createTemplateGroup({
        template,
        projects: activeProjects,
        latestVersions,
        campaignReferences,
        auditLogs: input.auditLogs,
        generatedAt,
      }),
    )
    .filter((group): group is TemplateInstanceGroup => group !== null)
    .sort(compareGroups);
  const updatePreviews = templateGroups.flatMap(
    (group) => group.updatePreviews,
  );
  const breakingChanges = updatePreviews.flatMap(
    (preview) => preview.breakingChanges,
  );
  const rollbackPackets = templateGroups
    .map((group) => group.rollbackPacket)
    .filter(
      (packet): packet is TemplateInstanceRollbackPacket => packet !== null,
    );
  const score = average(
    templateGroups.map((group) => group.score),
    0,
  );

  return {
    generatedAt,
    status: aggregateStatus(templateGroups.map((group) => group.status)),
    score,
    templateGroups,
    updatePreviews,
    breakingChanges,
    rollbackPackets,
    nextActions: createNextActions(templateGroups, updatePreviews),
    totals: {
      templates: templateGroups.length,
      instances: updatePreviews.length,
      campaigns: new Set(
        updatePreviews.flatMap((preview) => preview.campaignIds),
      ).size,
      acceptableUpdates: updatePreviews.filter(
        (preview) => preview.decision === "accept",
      ).length,
      heldUpdates: updatePreviews.filter(
        (preview) => preview.decision === "hold",
      ).length,
      rejectedUpdates: updatePreviews.filter(
        (preview) => preview.decision === "reject",
      ).length,
      breakingChanges: breakingChanges.length,
      rollbackPackets: rollbackPackets.length,
    },
  };
}

function createTemplateGroup(input: {
  template: DesignTemplateSummary;
  projects: ProjectSummary[];
  latestVersions: Map<string, ProjectVersionSummary>;
  campaignReferences: Map<string, CampaignProjectReference[]>;
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt: string;
}): TemplateInstanceGroup | null {
  const instances = findTemplateInstances({
    template: input.template,
    projects: input.projects,
    campaignReferences: input.campaignReferences,
  });

  if (!instances.length) return null;

  const previews = instances
    .map((project) =>
      createUpdatePreview({
        template: input.template,
        project,
        latestVersion: input.latestVersions.get(project.id) ?? null,
        campaignReferences: input.campaignReferences.get(project.id) ?? [],
      }),
    )
    .sort(comparePreviews);
  const rollbackPacket = createRollbackPacket({
    template: input.template,
    previews,
    generatedAt: input.generatedAt,
  });
  const updatePreviews = previews.map((preview) => ({
    ...preview,
    rollbackPacketId:
      preview.decision === "accept" && rollbackPacket
        ? rollbackPacket.id
        : null,
  }));
  const score = average(
    updatePreviews.map((preview) => preview.score),
    0,
  );
  const status = aggregateStatus(
    updatePreviews.map((preview) => preview.status),
  );
  const campaignCount = new Set(
    updatePreviews.flatMap((preview) => preview.campaignIds),
  ).size;

  return {
    id: `template-instance-group-${input.template.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    href: `/templates/${input.template.id}`,
    dimensions: `${input.template.width} x ${input.template.height}`,
    status,
    score,
    instanceCount: updatePreviews.length,
    campaignCount,
    acceptableCount: updatePreviews.filter(
      (preview) => preview.decision === "accept",
    ).length,
    heldCount: updatePreviews.filter((preview) => preview.decision === "hold")
      .length,
    rejectedCount: updatePreviews.filter(
      (preview) => preview.decision === "reject",
    ).length,
    latestTemplateAuditAt: latestAuditForTemplate({
      template: input.template,
      auditLogs: input.auditLogs,
    }),
    updatePreviews,
    rollbackPacket,
    nextAction: createGroupNextAction({
      templateName: input.template.name,
      previews: updatePreviews,
      rollbackPacket,
    }),
  };
}
