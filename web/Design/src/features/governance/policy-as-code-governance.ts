import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  AssetAuditRecord,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import {
  policyDefinitions,
  retentionWindowDays,
  staleProjectReviewDays,
  type PolicyAsCodeAffectedItem,
  type PolicyAsCodeAffectedItemKind,
  type PolicyAsCodeDomain,
  type PolicyAsCodeDryRunReport,
  type PolicyAsCodeEnforcementPacket,
  type PolicyAsCodeGovernanceCenter,
  type PolicyAsCodeRule,
  type PolicyAsCodeStatus,
} from "@/features/governance/policy-as-code-governance-types";

export type {
  PolicyAsCodeAffectedItem,
  PolicyAsCodeAffectedItemKind,
  PolicyAsCodeDomain,
  PolicyAsCodeDryRunReport,
  PolicyAsCodeEnforcementPacket,
  PolicyAsCodeGovernanceCenter,
  PolicyAsCodeRule,
  PolicyAsCodeStatus,
} from "@/features/governance/policy-as-code-governance-types";

export type PolicyAsCodeGovernanceCenterInput = {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  assetAudit: AssetLibraryAudit;
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export function createPolicyAsCodeGovernanceCenter(
  input: PolicyAsCodeGovernanceCenterInput,
): PolicyAsCodeGovernanceCenter {
  const checkedAt = normalizeNow(input.now).toISOString();
  const now = new Date(checkedAt);
  const dryRunReports = [
    createSharingDryRun(input),
    createPublishingDryRun(input),
    createAssetDryRun(input),
    createApprovalDryRun({ ...input, now }),
    createRetentionDryRun({ ...input, now }),
  ];
  const rules = dryRunReports.map(createRuleFromDryRun);
  const blockedRules = rules.filter((rule) => rule.status === "blocked").length;
  const reviewRules = rules.filter((rule) => rule.status === "review").length;
  const status = createStatus({ blocked: blockedRules, review: reviewRules });
  const violations = dryRunReports.reduce(
    (total, report) => total + report.affectedItems.length,
    0,
  );
  const plannedActions = dryRunReports.reduce(
    (total, report) => total + report.plannedActions.length,
    0,
  );
  const enforcementPacket = createEnforcementPacket({
    status,
    checkedAt,
    rules,
    dryRunReports,
  });

  return {
    status,
    score: scoreRules(rules),
    checkedAt,
    rules,
    dryRunReports,
    enforcementPacket,
    nextActions: dryRunReports
      .filter((report) => report.status !== "ready")
      .flatMap((report) => report.plannedActions)
      .slice(0, 6),
    totals: {
      policyDomains: dryRunReports.length,
      rules: rules.length,
      dryRunReports: dryRunReports.length,
      violations,
      blockedRules,
      reviewRules,
      plannedActions,
      auditEvents: new Set(dryRunReports.flatMap((report) => report.auditLogIds))
        .size,
    },
  };
}

function createSharingDryRun(
  input: PolicyAsCodeGovernanceCenterInput,
): PolicyAsCodeDryRunReport {
  const affectedItems = input.projects
    .filter((project) => !project.deletedAt)
    .flatMap((project) => {
      const hasUnapprovedEditLink =
        Boolean(project.editShareId) &&
        project.editSharePermission === "edit" &&
        project.approvalStatus !== "approved";
      const hasUnapprovedPublicLink =
        Boolean(project.publicShareId) &&
        (project.approvalStatus === "draft" ||
          project.approvalStatus === "changes-requested");

      if (!hasUnapprovedEditLink && !hasUnapprovedPublicLink) return [];

      return [
        createAffectedItem({
          id: project.id,
          kind: "project",
          name: project.name,
          severity: hasUnapprovedEditLink ? "blocked" : "review",
          detail: [
            hasUnapprovedEditLink
              ? "editable share link is exposed before approval"
              : null,
            hasUnapprovedPublicLink
              ? "public share link is exposed while approval is still draft"
              : null,
          ]
            .filter(Boolean)
            .join("; "),
          sourceIds: [project.id, project.editShareId, project.publicShareId],
        }),
      ];
    });
  const plannedActions = affectedItems.map((item) =>
    item.severity === "blocked"
      ? `Downgrade editable share link for ${item.name} to comment or view until approval is complete.`
      : `Review public share access for ${item.name} before external release.`,
  );

  return createDryRun({
    domain: "sharing",
    affectedItems,
    plannedActions,
    auditLogIds: findAuditIds(input.auditLogs, affectedItems),
    readySummary: "Share links match approval-safe release policy.",
  });
}

function createPublishingDryRun(
  input: PolicyAsCodeGovernanceCenterInput,
): PolicyAsCodeDryRunReport {
  const unpublishedCopy = input.contentScheduleItems
    .filter((item) => item.status === "planned" && !item.caption.trim())
    .map((item) =>
      createAffectedItem({
        id: item.id,
        kind: "schedule",
        name: item.title,
        severity: "blocked",
        detail: `${item.channel} schedule item has no caption copy.`,
        sourceIds: [item.id, item.projectId],
      }),
    );
  const unapprovedPublishedTemplates = input.templates
    .filter(
      (template) =>
        template.marketplaceStatus === "published" &&
        template.approvalStatus !== "approved",
    )
    .map((template) =>
      createAffectedItem({
        id: template.id,
        kind: "template",
        name: template.name,
        severity: "blocked",
        detail: "published marketplace template is not approved.",
        sourceIds: [template.id],
      }),
    );
  const affectedItems = [...unpublishedCopy, ...unapprovedPublishedTemplates];
  const plannedActions = [
    ...unpublishedCopy.map(
      (item) =>
        `Add release caption and channel copy to ${item.name} before publishing.`,
    ),
    ...unapprovedPublishedTemplates.map(
      (item) =>
        `Move ${item.name} through approval before marketplace publication remains active.`,
    ),
  ];

  return createDryRun({
    domain: "publishing",
    affectedItems,
    plannedActions,
    auditLogIds: findAuditIds(input.auditLogs, affectedItems),
    readySummary: "Publishing surfaces have approval and copy evidence.",
  });
}

function createAssetDryRun(
  input: PolicyAsCodeGovernanceCenterInput,
): PolicyAsCodeDryRunReport {
  const missingAssetEvidence = input.assetAudit.records
    .filter(isMissingAssetEvidence)
    .slice(0, 8)
    .map((asset) =>
      createAffectedItem({
        id: asset.id,
        kind: "asset",
        name: asset.name,
        severity: "review",
        detail: "asset is missing source or license metadata.",
        sourceIds: [asset.id],
      }),
    );
  const skippedManifest =
    input.assetAudit.skippedProjectReferenceCount > 0
      ? [
          createAffectedItem({
            id: "asset-manifest-skipped-references",
            kind: "asset",
            name: "Project asset manifests",
            severity: "review",
            detail: `${input.assetAudit.skippedProjectReferenceCount} skipped project asset references need review.`,
            sourceIds: input.assetAudit.records.map((record) => record.id),
          }),
        ]
      : [];
  const duplicateAssets =
    input.assetAudit.duplicateCount > 0
      ? [
          createAffectedItem({
            id: "asset-duplicates",
            kind: "asset",
            name: "Duplicate assets",
            severity: "review",
            detail: `${input.assetAudit.duplicateCount} duplicate asset records can be cleaned before export.`,
            sourceIds: input.assetAudit.records.map((record) => record.id),
          }),
        ]
      : [];
  const affectedItems = [
    ...missingAssetEvidence,
    ...skippedManifest,
    ...duplicateAssets,
  ];
  const plannedActions = affectedItems.length
    ? [
        "Attach source and license metadata to unverified assets before export or publication.",
        "Review skipped project asset references so manifest-based exports stay reproducible.",
        "Deduplicate repeated assets when the dry-run packet marks them safe to remove.",
      ].slice(0, Math.max(1, affectedItems.length))
    : [];

  return createDryRun({
    domain: "assets",
    affectedItems,
    plannedActions,
    auditLogIds: findAuditIds(input.auditLogs, affectedItems),
    readySummary: "Asset source, license, and manifest evidence is present.",
  });
}

function createApprovalDryRun(input: PolicyAsCodeGovernanceCenterInput & {
  now: Date;
}): PolicyAsCodeDryRunReport {
  const overdueTasks = input.reviewTasks
    .filter((task) => isOpenReviewTask(task) && isPastDate(task.taskDueAt, input.now))
    .map((task) =>
      createAffectedItem({
        id: task.id,
        kind: "review-task",
        name: task.projectName,
        severity: "blocked",
        detail: `${task.body} is overdue for ${task.taskAssigneeName ?? "an owner"}.`,
        sourceIds: [task.id, task.projectId],
      }),
    );
  const ownerlessTasks = input.reviewTasks
    .filter((task) => isOpenReviewTask(task) && !task.taskAssigneeName)
    .map((task) =>
      createAffectedItem({
        id: `${task.id}-owner`,
        kind: "review-task",
        name: task.projectName,
        severity: "review",
        detail: "open review task has no assignee.",
        sourceIds: [task.id, task.projectId],
      }),
    );
  const publicUnapprovedProjects = input.projects
    .filter(
      (project) =>
        !project.deletedAt &&
        (project.publicShareId || project.editShareId) &&
        project.approvalStatus !== "approved",
    )
    .map((project) =>
      createAffectedItem({
        id: `${project.id}-approval`,
        kind: "project",
        name: project.name,
        severity: project.editSharePermission === "edit" ? "blocked" : "review",
        detail: `shared project approval is ${project.approvalStatus}.`,
        sourceIds: [project.id],
      }),
    );
  const affectedItems = dedupeAffectedItems([
    ...overdueTasks,
    ...ownerlessTasks,
    ...publicUnapprovedProjects,
  ]);
  const plannedActions = [
    ...overdueTasks.map(
      (item) =>
        `Resolve overdue approval task for ${item.name} before release gates pass.`,
    ),
    ...ownerlessTasks.map(
      (item) => `Assign an approval owner for ${item.name}.`,
    ),
    ...publicUnapprovedProjects.map(
      (item) => `Move ${item.name} into approved state before release.`,
    ),
  ];

  return createDryRun({
    domain: "approvals",
    affectedItems,
    plannedActions,
    auditLogIds: findAuditIds(input.auditLogs, affectedItems),
    readySummary: "Approval tasks and shared work have release evidence.",
  });
}

function createRetentionDryRun(input: PolicyAsCodeGovernanceCenterInput & {
  now: Date;
}): PolicyAsCodeDryRunReport {
  const legalHoldProjectIds = findActiveLegalHolds(input.auditLogs);
  const trashedProjects = input.projects.filter((project) => project.deletedAt);
  const legalHoldDeletionBlocks = trashedProjects
    .filter((project) => legalHoldProjectIds.has(project.id))
    .map((project) =>
      createAffectedItem({
        id: `${project.id}-legal-hold`,
        kind: "project",
        name: project.name,
        severity: "blocked",
        detail: "deleted project is under active legal hold.",
        sourceIds: [project.id],
      }),
    );
  const expiredTrash = trashedProjects
    .filter(
      (project) =>
        project.deletedAt &&
        !legalHoldProjectIds.has(project.id) &&
        daysBetween(project.deletedAt, input.now) > retentionWindowDays,
    )
    .map((project) =>
      createAffectedItem({
        id: `${project.id}-retention-window`,
        kind: "project",
        name: project.name,
        severity: "review",
        detail: `deleted project is past the ${retentionWindowDays}-day retention window.`,
        sourceIds: [project.id],
      }),
    );
  const staleActiveProjects = input.projects
    .filter(
      (project) =>
        !project.deletedAt &&
        daysBetween(project.updatedAt, input.now) >= staleProjectReviewDays,
    )
    .map((project) =>
      createAffectedItem({
        id: `${project.id}-archive-review`,
        kind: "project",
        name: project.name,
        severity: "review",
        detail: `${daysBetween(project.updatedAt, input.now)} days inactive; archive review recommended.`,
        sourceIds: [project.id],
      }),
    );
  const affectedItems = [
    ...legalHoldDeletionBlocks,
    ...expiredTrash,
    ...staleActiveProjects,
  ];
  const plannedActions = [
    ...legalHoldDeletionBlocks.map(
      (item) =>
        `Preserve legal hold for ${item.name} and block destructive cleanup.`,
    ),
    ...expiredTrash.map(
      (item) =>
        `Review retention packet for ${item.name} before permanent deletion.`,
    ),
    ...staleActiveProjects.map(
      (item) => `Queue archive review for inactive project ${item.name}.`,
    ),
  ];

  return createDryRun({
    domain: "retention",
    affectedItems,
    plannedActions,
    auditLogIds: findAuditIds(input.auditLogs, affectedItems),
    readySummary: "Retention, archive, and legal-hold policies are clean.",
  });
}

function createDryRun(input: {
  domain: PolicyAsCodeDomain;
  affectedItems: PolicyAsCodeAffectedItem[];
  plannedActions: string[];
  auditLogIds: string[];
  readySummary: string;
}): PolicyAsCodeDryRunReport {
  const definition = policyDefinitions[input.domain];
  const blocked = input.affectedItems.filter(
    (item) => item.severity === "blocked",
  ).length;
  const review = input.affectedItems.filter(
    (item) => item.severity === "review",
  ).length;
  const status = createStatus({ blocked, review });

  return {
    id: `${input.domain}-policy-dry-run`,
    domain: input.domain,
    title: definition.title,
    status,
    score: scoreStatus({
      status,
      affectedItems: input.affectedItems.length,
    }),
    summary: input.affectedItems.length
      ? `${input.affectedItems.length} policy exception${
          input.affectedItems.length === 1 ? "" : "s"
        } found before enforcement.`
      : input.readySummary,
    affectedItems: input.affectedItems,
    plannedActions: dedupe(input.plannedActions).slice(0, 8),
    auditLogIds: dedupe(input.auditLogIds),
  };
}

function createRuleFromDryRun(
  report: PolicyAsCodeDryRunReport,
): PolicyAsCodeRule {
  const definition = policyDefinitions[report.domain];

  return {
    id: `${report.domain}-policy-rule`,
    domain: report.domain,
    title: definition.title,
    description: definition.description,
    policyExpression: definition.policyExpression,
    status: report.status,
    score: report.score,
    evidence: report.affectedItems.length
      ? report.affectedItems.map((item) => item.detail).slice(0, 4)
      : [report.summary],
    violationCount: report.affectedItems.length,
  };
}

function createEnforcementPacket(input: {
  status: PolicyAsCodeStatus;
  checkedAt: string;
  rules: PolicyAsCodeRule[];
  dryRunReports: PolicyAsCodeDryRunReport[];
}): PolicyAsCodeEnforcementPacket {
  const packet = {
    id: "policy-as-code-dry-run-packet",
    generatedAt: input.checkedAt,
    status: input.status,
    rules: input.rules.map((rule) => ({
      id: rule.id,
      domain: rule.domain,
      status: rule.status,
      score: rule.score,
      policyExpression: rule.policyExpression,
      violationCount: rule.violationCount,
    })),
    dryRunReports: input.dryRunReports.map((report) => ({
      id: report.id,
      domain: report.domain,
      status: report.status,
      summary: report.summary,
      affectedItems: report.affectedItems,
      plannedActions: report.plannedActions,
      auditLogIds: report.auditLogIds,
    })),
  };
  const json = JSON.stringify(packet, null, 2);

  return {
    id: packet.id,
    status: input.status,
    generatedAt: input.checkedAt,
    ruleIds: input.rules.map((rule) => rule.id),
    violationCount: input.rules.reduce(
      (total, rule) => total + rule.violationCount,
      0,
    ),
    plannedActionCount: input.dryRunReports.reduce(
      (total, report) => total + report.plannedActions.length,
      0,
    ),
    download: {
      fileName: "policy-as-code-dry-run-packet.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createAffectedItem(input: {
  id: string;
  kind: PolicyAsCodeAffectedItemKind;
  name: string;
  severity: PolicyAsCodeStatus;
  detail: string;
  sourceIds: Array<string | null | undefined>;
}): PolicyAsCodeAffectedItem {
  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    severity: input.severity,
    detail: input.detail,
    sourceIds: input.sourceIds.filter((value): value is string =>
      Boolean(value),
    ),
  };
}

function findAuditIds(
  auditLogs: WorkspaceAuditLogSummary[],
  affectedItems: PolicyAsCodeAffectedItem[],
) {
  const sourceIds = new Set(affectedItems.flatMap((item) => item.sourceIds));

  return auditLogs
    .filter(
      (log) =>
        (log.targetId && sourceIds.has(log.targetId)) ||
        (typeof log.metadata.projectId === "string" &&
          sourceIds.has(log.metadata.projectId)) ||
        (typeof log.metadata.templateId === "string" &&
          sourceIds.has(log.metadata.templateId)),
    )
    .map((log) => log.id);
}

function findActiveLegalHolds(auditLogs: WorkspaceAuditLogSummary[]) {
  const logsByProjectId = new Map<string, WorkspaceAuditLogSummary[]>();

  for (const log of auditLogs) {
    if (
      log.targetType !== "project" ||
      !log.targetId ||
      (log.action !== "project.legal_hold.enabled" &&
        log.action !== "project.legal_hold.released")
    ) {
      continue;
    }

    const projectLogs = logsByProjectId.get(log.targetId) ?? [];
    projectLogs.push(log);
    logsByProjectId.set(log.targetId, projectLogs);
  }

  return new Set(
    Array.from(logsByProjectId.entries()).flatMap(([projectId, logs]) => {
      const latest = logs.sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0];

      return latest?.action === "project.legal_hold.enabled" ? [projectId] : [];
    }),
  );
}

function isMissingAssetEvidence(asset: AssetAuditRecord) {
  return (
    asset.scope !== "projects" &&
    (!asset.sourceProvider ||
      !asset.sourceUrl ||
      !asset.authorName ||
      !asset.licenseName ||
      !asset.licenseUrl)
  );
}

function isOpenReviewTask(task: ReviewTaskSummary) {
  return (
    !task.resolved &&
    task.taskStatus !== "none" &&
    task.taskStatus !== "done"
  );
}

function isPastDate(value: string | null, now: Date) {
  if (!value) return false;

  return Date.parse(value) < now.getTime();
}

function daysBetween(value: string, now: Date) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 0;

  return Math.max(
    0,
    Math.floor((now.getTime() - parsed) / (24 * 60 * 60 * 1000)),
  );
}

function createStatus(input: { blocked: number; review: number }) {
  if (input.blocked > 0) return "blocked";
  if (input.review > 0) return "review";

  return "ready";
}

function scoreStatus(input: {
  status: PolicyAsCodeStatus;
  affectedItems: number;
}) {
  if (input.status === "ready") return 100;
  if (input.status === "review") {
    return Math.max(55, 78 - input.affectedItems * 6);
  }

  return Math.max(25, 55 - input.affectedItems * 7);
}

function scoreRules(rules: PolicyAsCodeRule[]) {
  return Math.round(
    rules.reduce((total, rule) => total + rule.score, 0) /
      Math.max(rules.length, 1),
  );
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function dedupeAffectedItems(items: PolicyAsCodeAffectedItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);

    return true;
  });
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
