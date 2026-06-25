import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type {
  TemplateInstanceBreakingChange,
  TemplateInstanceChange,
  TemplateInstanceGroup,
  TemplateInstancePropagationDecision,
  TemplateInstancePropagationStatus,
  TemplateInstanceRollbackPacket,
  TemplateInstanceUpdatePreview,
} from "@/features/templates/template-instance-propagation-types";
import {
  formatDateLabel,
  unique,
  type CampaignProjectReference,
} from "@/features/templates/template-instance-propagation-utils";

export function createUpdatePreview(input: {
  template: DesignTemplateSummary;
  project: ProjectSummary;
  latestVersion: ProjectVersionSummary | null;
  campaignReferences: CampaignProjectReference[];
}): TemplateInstanceUpdatePreview {
  const changes = createChanges(input);
  const breakingChanges = createBreakingChanges(input);
  const decision = chooseDecision(breakingChanges);
  const status = decisionToStatus(decision);
  const score = previewScore({
    changes,
    breakingChanges,
    decision,
  });
  const campaignIds = unique(
    input.campaignReferences.map((reference) => reference.campaignId),
  );
  const campaignNames = unique(
    input.campaignReferences.map((reference) => reference.campaignName),
  );

  return {
    id: `template-preview-${input.template.id}-${input.project.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    projectId: input.project.id,
    projectName: input.project.name,
    projectHref: `/designs/${input.project.id}`,
    status,
    score,
    decision,
    decisionLabel: decisionLabels[decision],
    changes,
    breakingChanges,
    rollbackPacketId: null,
    latestVersionId: input.latestVersion?.id ?? null,
    latestVersionAt: input.latestVersion?.createdAt ?? null,
    campaignIds,
    campaignNames,
    nextAction: createPreviewNextAction({
      project: input.project,
      decision,
      breakingChanges,
      latestVersion: input.latestVersion,
    }),
  };
}

export function createGroupNextAction(input: {
  templateName: string;
  previews: TemplateInstanceUpdatePreview[];
  rollbackPacket: TemplateInstanceRollbackPacket | null;
}) {
  const rejected = input.previews.filter(
    (preview) => preview.decision === "reject",
  );
  const held = input.previews.filter((preview) => preview.decision === "hold");

  if (rejected.length) {
    return `Review ${rejected.length} rejected ${input.templateName} instance${rejected.length === 1 ? "" : "s"} before accepting the batch.`;
  }

  if (held.length) {
    return `Reconnect ${held.length} ${input.templateName} instance${held.length === 1 ? "" : "s"} before propagation.`;
  }

  if (input.rollbackPacket) {
    return `Accept ${input.previews.length} ${input.templateName} update${input.previews.length === 1 ? "" : "s"} with rollback packet ready.`;
  }

  return `Create a rollback snapshot before propagating ${input.templateName}.`;
}

export function createNextActions(
  groups: TemplateInstanceGroup[],
  previews: TemplateInstanceUpdatePreview[],
) {
  if (!groups.length) {
    return [
      "Create template-based project instances before propagation planning.",
    ];
  }

  const actions: string[] = [];
  const rejected = previews.filter((preview) => preview.decision === "reject");
  const missingRollback = previews.filter((preview) =>
    preview.breakingChanges.some(
      (change) => change.kind === "missing-rollback-snapshot",
    ),
  );
  const accepted = previews.filter((preview) => preview.decision === "accept");

  if (rejected.length) {
    actions.push(
      `Resolve breaking changes on ${rejected.length} rejected instance${rejected.length === 1 ? "" : "s"} before applying propagation.`,
    );
    actions.push(...rejected.slice(0, 2).map((preview) => preview.nextAction));
  }

  if (missingRollback.length) {
    actions.push(
      `Create rollback snapshots for ${missingRollback.length} instance${missingRollback.length === 1 ? "" : "s"}.`,
    );
  }

  if (accepted.length) {
    actions.push(
      `Download rollback packets and accept ${accepted.length} safe instance update${accepted.length === 1 ? "" : "s"}.`,
    );
  }

  return unique(actions).slice(0, 6);
}

function createChanges(input: {
  template: DesignTemplateSummary;
  project: ProjectSummary;
  latestVersion: ProjectVersionSummary | null;
  campaignReferences: CampaignProjectReference[];
}): TemplateInstanceChange[] {
  const changes: TemplateInstanceChange[] = [
    {
      id: `${input.template.id}-${input.project.id}-template-update`,
      kind: "template-update",
      label: "Template update",
      detail: createTemplateUpdateDetail(input.template, input.project),
      before: formatDateLabel(input.project.updatedAt),
      after: formatDateLabel(input.template.updatedAt),
      status:
        Date.parse(input.template.updatedAt) >
        Date.parse(input.project.updatedAt)
          ? "review"
          : "ready",
    },
    {
      id: `${input.template.id}-${input.project.id}-dimensions`,
      kind: "dimension",
      label: "Dimensions",
      detail:
        input.template.width === input.project.width &&
        input.template.height === input.project.height
          ? "Instance dimensions match the source template."
          : "Template dimensions differ from this instance and require a layout review.",
      before: `${input.project.width} x ${input.project.height}`,
      after: `${input.template.width} x ${input.template.height}`,
      status:
        input.template.width === input.project.width &&
        input.template.height === input.project.height
          ? "ready"
          : "blocked",
    },
    {
      id: `${input.template.id}-${input.project.id}-approval`,
      kind: "approval",
      label: "Approval state",
      detail:
        input.project.approvalStatus === "changes-requested"
          ? "Project has requested changes and should not receive automatic propagation."
          : "Project approval state can be reviewed with the update preview.",
      before: input.project.approvalStatus,
      after: input.template.approvalStatus,
      status:
        input.project.approvalStatus === "changes-requested"
          ? "blocked"
          : "ready",
    },
    {
      id: `${input.template.id}-${input.project.id}-rollback`,
      kind: "rollback",
      label: "Rollback snapshot",
      detail: input.latestVersion
        ? "Latest project version can restore the instance after propagation."
        : "No project version snapshot exists for rollback.",
      before: input.latestVersion?.createdAt ?? "No snapshot",
      after: input.template.updatedAt,
      status: input.latestVersion ? "ready" : "blocked",
    },
  ];

  if (input.campaignReferences.length) {
    const readyCampaigns = input.campaignReferences.filter(
      (reference) =>
        reference.deliverableStatus === "done" &&
        reference.deliverableApprovalStatus === "approved",
    ).length;
    changes.push({
      id: `${input.template.id}-${input.project.id}-campaigns`,
      kind: "campaign",
      label: "Campaign deliverables",
      detail: `${readyCampaigns} of ${input.campaignReferences.length} linked deliverables are done and approved.`,
      before: `${input.campaignReferences.length} linked`,
      after: `${readyCampaigns} ready`,
      status:
        readyCampaigns === input.campaignReferences.length
          ? "ready"
          : "blocked",
    });
  }

  return changes;
}

function createTemplateUpdateDetail(
  template: DesignTemplateSummary,
  project: ProjectSummary,
) {
  if (Date.parse(template.updatedAt) > Date.parse(project.updatedAt)) {
    return "Template updated after this instance; preview propagation before applying.";
  }

  return "Instance is newer than or aligned with the current template timestamp.";
}

function createBreakingChanges(input: {
  template: DesignTemplateSummary;
  project: ProjectSummary;
  latestVersion: ProjectVersionSummary | null;
  campaignReferences: CampaignProjectReference[];
}): TemplateInstanceBreakingChange[] {
  const changes: TemplateInstanceBreakingChange[] = [];

  if (input.project.sourceProjectId !== input.template.id) {
    changes.push({
      id: `${input.template.id}-${input.project.id}-source-disconnected`,
      templateId: input.template.id,
      templateName: input.template.name,
      projectId: input.project.id,
      projectName: input.project.name,
      kind: "source-disconnected",
      severity: "review",
      detail:
        "The instance matches by name or dimensions but lacks a stored template source link.",
      remediation:
        "Reconnect the project to its source template before applying automatic updates.",
    });
  }

  if (
    input.project.width !== input.template.width ||
    input.project.height !== input.template.height
  ) {
    changes.push({
      id: `${input.template.id}-${input.project.id}-dimension-mismatch`,
      templateId: input.template.id,
      templateName: input.template.name,
      projectId: input.project.id,
      projectName: input.project.name,
      kind: "dimension-mismatch",
      severity: "blocked",
      detail: `Project is ${input.project.width} x ${input.project.height}, while the template is ${input.template.width} x ${input.template.height}.`,
      remediation:
        "Create a format-specific migration preview before accepting the template update.",
    });
  }

  if (input.project.approvalStatus === "changes-requested") {
    changes.push({
      id: `${input.template.id}-${input.project.id}-project-changes-requested`,
      templateId: input.template.id,
      templateName: input.template.name,
      projectId: input.project.id,
      projectName: input.project.name,
      kind: "project-changes-requested",
      severity: "blocked",
      detail: "The project already has requested changes.",
      remediation:
        "Resolve the project review request before propagating template changes.",
    });
  }

  if (
    input.campaignReferences.some(
      (reference) =>
        reference.deliverableStatus !== "done" ||
        reference.deliverableApprovalStatus !== "approved",
    )
  ) {
    changes.push({
      id: `${input.template.id}-${input.project.id}-campaign-not-ready`,
      templateId: input.template.id,
      templateName: input.template.name,
      projectId: input.project.id,
      projectName: input.project.name,
      kind: "campaign-not-ready",
      severity: "blocked",
      detail: "One or more campaign deliverables are not done and approved.",
      remediation:
        "Finish campaign approval or hold this instance out of the propagation batch.",
    });
  }

  if (!input.latestVersion) {
    changes.push({
      id: `${input.template.id}-${input.project.id}-missing-rollback-snapshot`,
      templateId: input.template.id,
      templateName: input.template.name,
      projectId: input.project.id,
      projectName: input.project.name,
      kind: "missing-rollback-snapshot",
      severity: "blocked",
      detail: "No version snapshot is available for rollback.",
      remediation:
        "Create a project version snapshot before applying the update.",
    });
  }

  return changes;
}

function chooseDecision(
  breakingChanges: TemplateInstanceBreakingChange[],
): TemplateInstancePropagationDecision {
  if (breakingChanges.some((change) => change.severity === "blocked")) {
    return "reject";
  }

  if (breakingChanges.length) return "hold";

  return "accept";
}

function decisionToStatus(
  decision: TemplateInstancePropagationDecision,
): TemplateInstancePropagationStatus {
  if (decision === "accept") return "ready";
  if (decision === "hold") return "review";

  return "blocked";
}

function previewScore(input: {
  changes: TemplateInstanceChange[];
  breakingChanges: TemplateInstanceBreakingChange[];
  decision: TemplateInstancePropagationDecision;
}) {
  const base =
    input.decision === "accept" ? 100 : input.decision === "hold" ? 72 : 40;
  const blockedPenalty = input.breakingChanges.filter(
    (change) => change.severity === "blocked",
  ).length;
  const reviewPenalty = input.breakingChanges.filter(
    (change) => change.severity === "review",
  ).length;
  const changePenalty = input.changes.filter(
    (change) => change.status === "blocked",
  ).length;

  return Math.max(
    0,
    base - blockedPenalty * 8 - reviewPenalty * 5 - changePenalty * 3,
  );
}

function createPreviewNextAction(input: {
  project: ProjectSummary;
  decision: TemplateInstancePropagationDecision;
  breakingChanges: TemplateInstanceBreakingChange[];
  latestVersion: ProjectVersionSummary | null;
}) {
  if (input.decision === "accept") {
    return `Accept ${input.project.name} into the propagation batch.`;
  }

  const rollbackIssue = input.breakingChanges.find(
    (change) => change.kind === "missing-rollback-snapshot",
  );

  if (rollbackIssue || !input.latestVersion) {
    return `Create a rollback snapshot for ${input.project.name} before accepting this update.`;
  }

  const firstBreaking = input.breakingChanges[0];

  if (firstBreaking) {
    return `${firstBreaking.remediation} (${input.project.name})`;
  }

  return `Hold ${input.project.name} until source metadata is confirmed.`;
}

const decisionLabels: Record<TemplateInstancePropagationDecision, string> = {
  accept: "Accept",
  hold: "Hold",
  reject: "Reject",
};
