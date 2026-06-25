import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type {
  DesignSystemComponentDefinition,
  DesignSystemIntelligenceStatus,
  DesignSystemTokenDriftReport,
} from "@/features/design-system/design-system-intelligence";
import type {
  DesignSystemBreakingChange,
  DesignSystemBreakingChangePreview,
  DesignSystemComponentAdoptionGate,
  DesignSystemDownstreamImpactPacket,
  DesignSystemReleaseGateResult,
  DesignSystemReleaseGovernanceCenter,
  DesignSystemReleaseGovernanceComponentContext,
  DesignSystemReleaseGovernanceInput,
  DesignSystemReleaseGovernanceStatus,
  DesignSystemTokenMigrationPlan,
} from "@/features/design-system/design-system-release-governance-types";

export type {
  DesignSystemBreakingChange,
  DesignSystemBreakingChangeKind,
  DesignSystemBreakingChangePreview,
  DesignSystemComponentAdoptionGate,
  DesignSystemDownstreamImpactPacket,
  DesignSystemReleaseGateKind,
  DesignSystemReleaseGateResult,
  DesignSystemReleaseGovernanceCenter,
  DesignSystemReleaseGovernanceInput,
  DesignSystemReleaseGovernanceStatus,
  DesignSystemTokenMigrationPlan,
} from "@/features/design-system/design-system-release-governance-types";

export function createDesignSystemReleaseGovernanceCenter(
  input: DesignSystemReleaseGovernanceInput,
): DesignSystemReleaseGovernanceCenter {
  const generatedAt = normalizeDate(
    input.now ?? input.designSystem.generatedAt,
  ).toISOString();
  const contexts = createComponentContexts(input);
  const tokenMigrationPlans = createTokenMigrationPlans(
    input.designSystem.tokenDriftReports,
  );
  const componentAdoptionGates = contexts
    .map((context) =>
      createComponentAdoptionGate({
        context,
        tokenMigrationPlans,
      }),
    )
    .sort(compareGates);
  const breakingChangePreviews = componentAdoptionGates
    .map((gate) =>
      createBreakingChangePreview({
        gate,
        context: contexts.find(
          (context) => context.component.id === gate.componentId,
        )!,
        tokenMigrationPlans,
      }),
    )
    .filter((preview) => preview.changes.length)
    .sort(comparePreviews);
  const downstreamImpactPackets = breakingChangePreviews.map((preview) =>
    createDownstreamImpactPacket({
      generatedAt,
      preview,
      gate: componentAdoptionGates.find(
        (gate) => gate.componentId === preview.componentId,
      )!,
      context: contexts.find(
        (context) => context.component.id === preview.componentId,
      )!,
      tokenMigrationPlans,
    }),
  );
  const status = aggregateStatus([
    ...tokenMigrationPlans.map((plan) => plan.status),
    ...componentAdoptionGates.map((gate) => gate.status),
    ...breakingChangePreviews.map((preview) => preview.status),
  ]);
  const score = average(
    [
      input.designSystem.score,
      average(
        tokenMigrationPlans.map((plan) => plan.readinessScore),
        100,
      ),
      average(
        componentAdoptionGates.map((gate) => gate.score),
        100,
      ),
      breakingChangePreviews.length
        ? average(
            breakingChangePreviews.map((preview) =>
              statusScore(preview.status),
            ),
            100,
          )
        : 100,
    ],
    100,
  );
  const affectedProjectIds = unique(
    downstreamImpactPackets.flatMap((packet) => packet.affectedProjectIds),
  );

  return {
    generatedAt,
    status,
    score,
    tokenMigrationPlans,
    componentAdoptionGates,
    breakingChangePreviews,
    downstreamImpactPackets,
    nextActions: createNextActions({
      tokenMigrationPlans,
      componentAdoptionGates,
      breakingChangePreviews,
    }),
    totals: {
      tokenMigrationPlans: tokenMigrationPlans.length,
      componentAdoptionGates: componentAdoptionGates.length,
      breakingChangePreviews: breakingChangePreviews.length,
      downstreamImpactPackets: downstreamImpactPackets.length,
      affectedProjects: affectedProjectIds.length,
      publicSurfaces: downstreamImpactPackets.reduce(
        (total, packet) => total + packet.publicSurfaces,
        0,
      ),
      blockedGates: componentAdoptionGates.filter(
        (gate) => gate.status === "blocked",
      ).length,
      reviewGates: componentAdoptionGates.filter(
        (gate) => gate.status === "review",
      ).length,
      readyGates: componentAdoptionGates.filter(
        (gate) => gate.status === "ready",
      ).length,
    },
  };
}

function createComponentContexts(
  input: DesignSystemReleaseGovernanceInput,
): DesignSystemReleaseGovernanceComponentContext[] {
  const templatesById = new Map(
    input.templates.map((template) => [template.id, template]),
  );
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const versionedProjectIds = new Set(
    input.projectVersions.map((version) => version.projectId),
  );

  return input.designSystem.componentDefinitions.map((component) => {
    const template = templatesById.get(component.templateId) ?? null;
    const projects = activeProjects.filter((project) =>
      component.usage.projectIds.includes(project.id),
    );

    return {
      component,
      template,
      projects,
      restorePointCount: projects.filter((project) =>
        versionedProjectIds.has(project.id),
      ).length,
      auditEvents: input.auditLogs.filter((log) =>
        matchesComponentAudit(log, component),
      ),
    };
  });
}

function createTokenMigrationPlans(
  driftReports: DesignSystemTokenDriftReport[],
): DesignSystemTokenMigrationPlan[] {
  return driftReports.map((report) => {
    const readinessScore = Math.max(
      0,
      statusScore(report.status) - report.driftCount * 8,
    );

    return {
      id: `token-migration-${report.id}`,
      tokenKind: report.kind,
      label: `${report.label} migration`,
      status: report.status,
      affectedProjectIds: report.affectedProjectIds,
      readinessScore,
      blockerCount: report.status === "blocked" ? report.driftCount : 0,
      steps: [
        report.recommendedFix,
        `Re-audit ${report.affectedProjectIds.length || "all"} downstream project${report.affectedProjectIds.length === 1 ? "" : "s"} after token migration.`,
        "Attach the migration evidence packet before the design-system release moves to stable.",
      ],
    };
  });
}

function createComponentAdoptionGate(input: {
  context: DesignSystemReleaseGovernanceComponentContext;
  tokenMigrationPlans: DesignSystemTokenMigrationPlan[];
}): DesignSystemComponentAdoptionGate {
  const gateResults = createGateResults(input);
  const status = aggregateStatus(gateResults.map((gate) => gate.status));
  const score = average(
    gateResults.map((gate) => statusScore(gate.status)),
    100,
  );

  return {
    id: `adoption-gate-${input.context.component.templateId}`,
    componentId: input.context.component.id,
    templateId: input.context.component.templateId,
    componentName: input.context.component.name,
    status,
    score,
    affectedProjectIds: input.context.projects.map((project) => project.id),
    publicSurfaces: countPublicSurfaces(input.context.projects),
    gateResults,
    nextAction: createGateNextAction({
      componentName: input.context.component.name,
      gateResults,
    }),
  };
}

function createGateResults(input: {
  context: DesignSystemReleaseGovernanceComponentContext;
  tokenMigrationPlans: DesignSystemTokenMigrationPlan[];
}): DesignSystemReleaseGateResult[] {
  const tokenStatus =
    input.context.component.tokenCoverage.complete &&
    !input.tokenMigrationPlans.length
      ? "ready"
      : input.tokenMigrationPlans.some((plan) => plan.status === "blocked")
        ? "blocked"
        : "review";
  const template = input.context.template;
  const approvalStatus = getApprovalGateStatus(template);
  const projectCount = input.context.projects.length;
  const restorePointCount = input.context.restorePointCount;
  const publicSurfaces = countPublicSurfaces(input.context.projects);

  return [
    {
      id: `${input.context.component.id}-gate-token`,
      kind: "token",
      status: tokenStatus,
      label: "Token migration",
      detail:
        tokenStatus === "ready"
          ? "Required brand tokens are complete for release."
          : `${input.tokenMigrationPlans.length} token migration plan${input.tokenMigrationPlans.length === 1 ? "" : "s"} must clear before release.`,
    },
    {
      id: `${input.context.component.id}-gate-approval`,
      kind: "approval",
      status: approvalStatus,
      label: "Component approval",
      detail: template
        ? `${template.name} approval is ${template.approvalStatus}.`
        : "Template source is missing for this component.",
    },
    {
      id: `${input.context.component.id}-gate-usage`,
      kind: "usage",
      status: projectCount ? "ready" : "review",
      label: "Adoption coverage",
      detail: `${projectCount} downstream project${projectCount === 1 ? "" : "s"} currently use this component.`,
    },
    {
      id: `${input.context.component.id}-gate-rollback`,
      kind: "rollback",
      status:
        projectCount === 0 || restorePointCount === projectCount
          ? "ready"
          : restorePointCount > 0
            ? "review"
            : "blocked",
      label: "Rollback snapshots",
      detail: `${restorePointCount} of ${projectCount} downstream project${projectCount === 1 ? "" : "s"} have restore points.`,
    },
    {
      id: `${input.context.component.id}-gate-public-surface`,
      kind: "public-surface",
      status:
        publicSurfaces &&
        (tokenStatus !== "ready" || approvalStatus !== "ready")
          ? "blocked"
          : publicSurfaces
            ? "review"
            : "ready",
      label: "Public surface preview",
      detail: `${publicSurfaces} public or editable surface${publicSurfaces === 1 ? "" : "s"} depend on this component.`,
    },
    {
      id: `${input.context.component.id}-gate-audit`,
      kind: "audit",
      status: input.context.auditEvents.length ? "ready" : "review",
      label: "Audit evidence",
      detail: input.context.auditEvents.length
        ? `${input.context.auditEvents.length} audit event${input.context.auditEvents.length === 1 ? "" : "s"} are attached.`
        : "Record design-system release audit evidence before stable rollout.",
    },
  ];
}

function createBreakingChangePreview(input: {
  gate: DesignSystemComponentAdoptionGate;
  context: DesignSystemReleaseGovernanceComponentContext;
  tokenMigrationPlans: DesignSystemTokenMigrationPlan[];
}): DesignSystemBreakingChangePreview {
  const changes: DesignSystemBreakingChange[] = [
    ...input.tokenMigrationPlans
      .filter((plan) => plan.status !== "ready")
      .map((plan) => ({
        id: `${input.gate.id}-change-${plan.id}`,
        kind: "token-migration" as const,
        status: plan.status,
        label: plan.label,
        detail: plan.steps[0] ?? "Complete token migration.",
      })),
    ...input.gate.gateResults
      .filter(
        (gate) =>
          gate.status !== "ready" &&
          gate.kind !== "token" &&
          gate.kind !== "audit",
      )
      .map((gate) => ({
        id: `${input.gate.id}-change-${gate.kind}`,
        kind: mapGateToBreakingChange(gate.kind),
        status: gate.status,
        label: gate.label,
        detail: gate.detail,
      })),
  ];
  const status = aggregateStatus(changes.map((change) => change.status));

  return {
    id: `breaking-preview-${input.context.component.templateId}`,
    componentId: input.context.component.id,
    templateId: input.context.component.templateId,
    componentName: input.context.component.name,
    status,
    affectedProjectIds: input.gate.affectedProjectIds,
    changes,
    detail: `${changes.length} release change${changes.length === 1 ? "" : "s"} require preview before ${input.context.component.name} reaches stable.`,
  };
}

function createDownstreamImpactPacket(input: {
  generatedAt: string;
  preview: DesignSystemBreakingChangePreview;
  gate: DesignSystemComponentAdoptionGate;
  context: DesignSystemReleaseGovernanceComponentContext;
  tokenMigrationPlans: DesignSystemTokenMigrationPlan[];
}): DesignSystemDownstreamImpactPacket {
  const payload = {
    kind: "essence-studio.design-system-release-governance",
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    component: {
      id: input.context.component.id,
      templateId: input.context.component.templateId,
      name: input.context.component.name,
      status: input.context.component.status,
    },
    tokenMigrationPlans: input.tokenMigrationPlans,
    adoptionGate: input.gate,
    breakingChangePreview: input.preview,
    downstreamImpact: {
      affectedProjectIds: input.gate.affectedProjectIds,
      publicSurfaces: input.gate.publicSurfaces,
      restorePoints: input.context.restorePointCount,
      auditLogIds: input.context.auditEvents.map((event) => event.id),
    },
    releaseSteps: [
      ...input.tokenMigrationPlans.flatMap((plan) => plan.steps.slice(0, 1)),
      input.gate.nextAction,
      `Preview ${input.preview.affectedProjectIds.length} downstream project${input.preview.affectedProjectIds.length === 1 ? "" : "s"} before release.`,
    ],
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `downstream-impact-${input.context.component.templateId}`,
    componentId: input.context.component.id,
    templateId: input.context.component.templateId,
    componentName: input.context.component.name,
    status: input.preview.status,
    affectedProjectIds: input.gate.affectedProjectIds,
    publicSurfaces: input.gate.publicSurfaces,
    restorePoints: input.context.restorePointCount,
    fileName: `design-system-release-${slugify(input.context.component.name)}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
  };
}

function createGateNextAction(input: {
  componentName: string;
  gateResults: DesignSystemReleaseGateResult[];
}) {
  const blocker = input.gateResults.find((gate) => gate.status === "blocked");
  if (blocker) return `${input.componentName}: ${blocker.detail}`;

  const review = input.gateResults.find((gate) => gate.status === "review");
  if (review) return `${input.componentName}: ${review.detail}`;

  return `${input.componentName}: release gates are ready.`;
}

function createNextActions(input: {
  tokenMigrationPlans: DesignSystemTokenMigrationPlan[];
  componentAdoptionGates: DesignSystemComponentAdoptionGate[];
  breakingChangePreviews: DesignSystemBreakingChangePreview[];
}) {
  const tokenActions = input.tokenMigrationPlans
    .filter((plan) => plan.status !== "ready")
    .map((plan) => `${plan.label}: ${plan.steps[0]}`);
  const gateActions = input.componentAdoptionGates
    .filter((gate) => gate.status !== "ready")
    .map((gate) => gate.nextAction);
  const previewActions = input.breakingChangePreviews
    .filter((preview) => preview.status !== "ready")
    .map(
      (preview) =>
        `${preview.componentName}: preview ${preview.changes.length} breaking-change signal${preview.changes.length === 1 ? "" : "s"}.`,
    );
  const actions = [...tokenActions, ...gateActions, ...previewActions];

  return actions.length
    ? unique(actions).slice(0, 6)
    : ["Design system release governance is ready for stable rollout."];
}

function getApprovalGateStatus(
  template: DesignTemplateSummary | null,
): DesignSystemReleaseGovernanceStatus {
  if (!template) return "blocked";
  if (template.approvalStatus === "changes-requested") {
    return "blocked";
  }
  if (
    template.approvalStatus === "in-review" ||
    template.marketplaceStatus === "review" ||
    template.marketplaceStatus === "draft"
  ) {
    return "review";
  }

  return "ready";
}

function mapGateToBreakingChange(
  kind: DesignSystemReleaseGateResult["kind"],
): DesignSystemBreakingChange["kind"] {
  if (kind === "approval") return "approval";
  if (kind === "rollback") return "rollback";
  if (kind === "public-surface") return "public-surface";

  return "adoption";
}

function matchesComponentAudit(
  log: WorkspaceAuditLogSummary,
  component: DesignSystemComponentDefinition,
) {
  return (
    log.targetId === component.templateId ||
    stringOrNull(log.metadata.templateId) === component.templateId ||
    stringOrNull(log.metadata.componentId) === component.id
  );
}

function countPublicSurfaces(projects: ProjectSummary[]) {
  return projects.filter(
    (project) => project.publicShareId || project.editShareId,
  ).length;
}

function aggregateStatus(statuses: DesignSystemIntelligenceStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function statusScore(status: DesignSystemIntelligenceStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 15;
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        values.reduce((total, value) => total + value, 0) / values.length,
      ),
    ),
  );
}

function compareGates(
  left: DesignSystemComponentAdoptionGate,
  right: DesignSystemComponentAdoptionGate,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    right.affectedProjectIds.length - left.affectedProjectIds.length ||
    left.componentName.localeCompare(right.componentName)
  );
}

function comparePreviews(
  left: DesignSystemBreakingChangePreview,
  right: DesignSystemBreakingChangePreview,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.changes.length - left.changes.length ||
    left.componentName.localeCompare(right.componentName)
  );
}

function statusWeight(status: DesignSystemIntelligenceStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "component"
  );
}
