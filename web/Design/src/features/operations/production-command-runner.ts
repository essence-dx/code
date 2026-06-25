import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AutomationRecoveryPacket } from "@/features/automation/automation-run-history";
import type { AdvancedAdminAutomationRecipePlan } from "@/features/automation/advanced-admin-automation-recipes";
import type { PolicyAsCodeDryRunReport } from "@/features/governance/policy-as-code-governance";
import type {
  PublishExportOverrideRequest,
  PublishExportReleaseGate,
  PublishExportReleaseGateItem,
} from "@/features/operations/publish-export-release-gates";
import type {
  WorkspaceBackupIntegrityCheck,
  WorkspaceRestoreProjectDryRun,
  WorkspaceRollbackPlaybook,
} from "@/features/operations/workspace-backup-restore";
import type { MarketplaceCreatorModerationRoute } from "@/features/templates/marketplace-creator-operations";
import type {
  ProductionCommand,
  ProductionCommandArea,
  ProductionCommandAuditEvidence,
  ProductionCommandBatch,
  ProductionCommandBatchMode,
  ProductionCommandExecutionReport,
  ProductionCommandRunnerCenter,
  ProductionCommandRunnerInput,
  ProductionCommandRunnerStatus,
} from "@/features/operations/production-command-runner-types";

export type {
  ProductionCommand,
  ProductionCommandArea,
  ProductionCommandAuditEvidence,
  ProductionCommandBatch,
  ProductionCommandBatchMode,
  ProductionCommandExecutionReport,
  ProductionCommandMode,
  ProductionCommandPhase,
  ProductionCommandRisk,
  ProductionCommandRunnerCenter,
  ProductionCommandRunnerInput,
  ProductionCommandRunnerStatus,
  ProductionCommandSourceKind,
} from "@/features/operations/production-command-runner-types";

const areaOrder: ProductionCommandArea[] = [
  "policy",
  "release",
  "automation",
  "admin",
  "backup",
  "marketplace",
];

const areaTitles: Record<ProductionCommandArea, string> = {
  policy: "Policy commands",
  release: "Release commands",
  automation: "Automation commands",
  admin: "Admin automation commands",
  backup: "Backup and restore commands",
  marketplace: "Marketplace commands",
};

const statusScores: Record<ProductionCommandRunnerStatus, number> = {
  ready: 100,
  review: 76,
  blocked: 42,
};

export function createProductionCommandRunnerCenter(
  input: ProductionCommandRunnerInput,
): ProductionCommandRunnerCenter {
  const generatedAt = normalizeNow(input.now).toISOString();
  const commands = [
    ...createPolicyCommands(input),
    ...createReleaseGateCommands(input),
    ...createReleaseOverrideCommands(input),
    ...createAutomationCommands(input),
    ...createAdminCommands(input),
    ...createBackupCommands(input),
    ...createMarketplaceCommands(input),
  ].sort(compareCommands);
  const batches = createBatches(commands);
  const executionReports = batches.map((batch) =>
    createExecutionReport({ batch, generatedAt }),
  );
  const status = aggregateStatus(commands);
  const score = commands.length
    ? average(commands.map((command) => statusScores[command.status]))
    : 100;

  return {
    generatedAt,
    status,
    score,
    commands,
    batches,
    executionReports,
    nextActions: createNextActions(commands),
    totals: {
      batches: batches.length,
      commands: commands.length,
      readyCommands: commands.filter((command) => command.status === "ready")
        .length,
      reviewCommands: commands.filter((command) => command.status === "review")
        .length,
      blockedCommands: commands.filter(
        (command) => command.status === "blocked",
      ).length,
      dryRunCommands: commands.filter((command) => command.mode === "dry-run")
        .length,
      applyReadyCommands: commands.filter(
        (command) => command.mode === "apply" && command.status !== "blocked",
      ).length,
      rollbackNotes: commands.filter((command) => command.rollbackNote).length,
      auditEvidenceLinks: countEvidenceLinks(commands),
      executionReports: executionReports.length,
    },
  };
}

function createPolicyCommands(
  input: ProductionCommandRunnerInput,
): ProductionCommand[] {
  return input.policyAsCode.dryRunReports
    .filter((report) => report.status !== "ready")
    .flatMap((report, reportIndex) =>
      createPolicyReportCommands({
        report,
        input,
        reportIndex,
      }),
    );
}

function createPolicyReportCommands(input: {
  report: PolicyAsCodeDryRunReport;
  input: ProductionCommandRunnerInput;
  reportIndex: number;
}): ProductionCommand[] {
  const affectedItems = input.report.affectedItems.length
    ? input.report.affectedItems
    : [
        {
          id: input.report.id,
          kind: "audit" as const,
          name: input.report.title,
          severity: input.report.status,
          detail: input.report.summary,
          sourceIds: [input.report.id],
        },
      ];

  return affectedItems.map((item, itemIndex) => {
    const matchingAction =
      input.report.plannedActions.find((action) =>
        action.toLowerCase().includes(item.name.toLowerCase()),
      ) ?? input.report.plannedActions[0];
    const actionTitle = matchingAction ?? `${input.report.title}: ${item.name}`;

    return createCommand({
      area: "policy",
      sourceKind: "policy-dry-run",
      sourceId: `${input.report.id}-${item.id}`,
      title: actionTitle,
      detail: `${input.report.title}: ${item.detail}`,
      status: item.severity,
      mode: "dry-run",
      phase: "dry-run",
      risk: item.severity === "blocked" ? "high" : "medium",
      sequence: input.reportIndex * 100 + itemIndex,
      dryRunPlan: unique([
        ...input.report.plannedActions,
        `Confirm ${item.kind} ${item.name} still violates ${input.report.domain} policy before applying remediation.`,
      ]),
      applyPlan: [
        `Apply approved remediation for ${item.name}.`,
        "Re-run policy-as-code and publish/export release gates after remediation.",
      ],
      rollbackNote: `Rollback by restoring the previous ${input.report.domain} state from the policy packet and linked audit log evidence.`,
      auditEvidence: createEvidence({
        auditLogIds: [
          ...input.report.auditLogIds,
          ...findAuditLogIds(input.input.auditLogs, item.sourceIds),
        ],
        packetIds: [input.input.policyAsCode.enforcementPacket.id],
        sourceIds: [input.report.id, item.id, ...item.sourceIds],
      }),
      reportSummary: input.report.summary,
    });
  });
}

function createReleaseGateCommands(
  input: ProductionCommandRunnerInput,
): ProductionCommand[] {
  return input.publishExportReleaseGates.gates
    .filter((gate) => gate.status !== "ready")
    .flatMap((gate, gateIndex) =>
      gate.items
        .filter((item) => item.status !== "ready")
        .map((item, itemIndex) =>
          createReleaseGateCommand({
            gate,
            item,
            input,
            sequence: gateIndex * 100 + itemIndex,
          }),
        ),
    );
}

function createReleaseGateCommand(input: {
  gate: PublishExportReleaseGate;
  item: PublishExportReleaseGateItem;
  input: ProductionCommandRunnerInput;
  sequence: number;
}): ProductionCommand {
  const sourceIds = [input.gate.id, input.item.id, input.item.sourceId].filter(
    (value): value is string => Boolean(value),
  );

  return createCommand({
    area: "release",
    sourceKind: "release-gate",
    sourceId: `${input.gate.id}-${input.item.id}`,
    title: `${input.gate.title}: ${input.item.title}`,
    detail: input.item.detail,
    status: input.item.status,
    mode: "dry-run",
    phase: input.gate.id === "override-requests" ? "approval" : "validate",
    risk: input.item.status === "blocked" ? "high" : "medium",
    sequence: input.sequence,
    dryRunPlan: unique([
      `Validate ${input.item.title} against ${input.gate.title}.`,
      input.item.detail,
      ...input.item.meta,
    ]),
    applyPlan: [
      `Resolve ${input.item.title} and re-run publish/export release gates.`,
      input.item.href
        ? `Open ${input.item.href} for the affected source.`
        : "Attach release evidence before promotion.",
    ],
    rollbackNote:
      "Rollback release movement by withholding publish/export promotion and restoring the last approved release packet.",
    auditEvidence: createEvidence({
      auditLogIds: findAuditLogIds(input.input.auditLogs, sourceIds),
      packetIds: [input.input.publishExportReleaseGates.releasePacket.fileName],
      sourceIds,
    }),
    reportSummary: `${input.gate.description} ${input.item.detail}`,
  });
}

function createReleaseOverrideCommands(
  input: ProductionCommandRunnerInput,
): ProductionCommand[] {
  return input.publishExportReleaseGates.overrideRequests
    .filter((request) => request.status !== "approved")
    .map((request, index) =>
      createReleaseOverrideCommand(input, request, index),
    );
}

function createReleaseOverrideCommand(
  input: ProductionCommandRunnerInput,
  request: PublishExportOverrideRequest,
  index: number,
): ProductionCommand {
  const status =
    request.status === "requested"
      ? "review"
      : request.severity === "blocked"
        ? "blocked"
        : "review";

  return createCommand({
    area: "release",
    sourceKind: "release-override",
    sourceId: request.id,
    title: `Request override: ${request.title}`,
    detail: request.detail,
    status,
    mode: "dry-run",
    phase: "approval",
    risk: request.approvalRequired ? "high" : "medium",
    sequence: 1_000 + index,
    dryRunPlan: [
      `Prepare release override form for ${request.affectedItemKind} ${request.affectedItemId}.`,
      `Confirm ${request.sourcePolicyDomain} exception evidence before request submission.`,
    ],
    applyPlan: [
      request.status === "needed"
        ? `Submit auditable override request for ${request.title}.`
        : `Track requested override for ${request.title} until approval.`,
      "Block release promotion until the override is approved or the exception is resolved.",
    ],
    rollbackNote:
      "Rollback the override path by withdrawing the request and resolving the original policy exception.",
    auditEvidence: createEvidence({
      auditLogIds: [
        ...request.auditLogIds,
        ...findAuditLogIds(input.auditLogs, request.sourceIds),
      ],
      packetIds: [input.publishExportReleaseGates.releasePacket.fileName],
      sourceIds: [request.id, request.affectedItemId, ...request.sourceIds],
    }),
    reportSummary: `${request.status} override for ${request.sourcePolicyDomain}.`,
  });
}

function createAutomationCommands(
  input: ProductionCommandRunnerInput,
): ProductionCommand[] {
  return input.automationRunHistory.recoveryPackets.map((packet, index) =>
    createAutomationCommand(input, packet, index),
  );
}

function createAutomationCommand(
  input: ProductionCommandRunnerInput,
  packet: AutomationRecoveryPacket,
  index: number,
): ProductionCommand {
  const retryLabel = packet.retry.available
    ? packet.retry.label
    : `Review ${packet.recipeId} recovery packet`;
  const status: ProductionCommandRunnerStatus = packet.retry.available
    ? "review"
    : packet.status === "failed"
      ? "blocked"
      : packet.status;
  const sourceIds = [packet.id, packet.runId, packet.targetId];

  return createCommand({
    area: "automation",
    sourceKind: "automation-recovery",
    sourceId: packet.id,
    title: retryLabel,
    detail: packet.summary,
    status,
    mode: packet.retry.available ? "apply" : "dry-run",
    phase: packet.retry.available ? "apply" : "report",
    risk: packet.status === "failed" ? "high" : "medium",
    sequence: index,
    dryRunPlan: unique([
      ...packet.diagnostics.map(
        (diagnostic) => `${diagnostic.title}: ${diagnostic.detail}`,
      ),
      `Validate retry target ${packet.targetId} for ${packet.recipeId}.`,
    ]),
    applyPlan: packet.retry.available
      ? [
          packet.retry.label,
          `Attach ${packet.download.fileName} to the retry evidence trail.`,
        ]
      : ["Keep the recovery packet for manual review."],
    rollbackNote:
      "Rollback automation retry by cancelling the scheduled rerun and preserving the recovery packet.",
    auditEvidence: createEvidence({
      auditLogIds: [
        ...packet.auditLogIds,
        ...findAuditLogIds(input.auditLogs, sourceIds),
      ],
      packetIds: [packet.id],
      sourceIds,
    }),
    reportSummary: `${packet.recipeId} recovery status: ${packet.status}.`,
  });
}

function createAdminCommands(
  input: ProductionCommandRunnerInput,
): ProductionCommand[] {
  return input.advancedAdminAutomation.recipes
    .filter((recipe) => recipe.status !== "ready")
    .map((recipe, index) => createAdminCommand(input, recipe, index));
}

function createAdminCommand(
  input: ProductionCommandRunnerInput,
  recipe: AdvancedAdminAutomationRecipePlan,
  index: number,
): ProductionCommand {
  const sourceIds = unique([
    recipe.id,
    ...recipe.targets.map((target) => target.id),
    ...recipe.targets.flatMap((target) => target.sourceIds),
  ]);

  return createCommand({
    area: "admin",
    sourceKind: "admin-recipe",
    sourceId: recipe.id,
    title: recipe.title,
    detail: recipe.description,
    status: recipe.status,
    mode: "dry-run",
    phase: "dry-run",
    risk: recipe.status === "blocked" ? "high" : "medium",
    sequence: index,
    dryRunPlan: unique([
      ...recipe.plannedActions,
      `Validate ${recipe.targetLabel.toLowerCase()} before admin automation runs.`,
    ]),
    applyPlan: [
      recipe.disabledReason
        ? `Resolve blocker: ${recipe.disabledReason}`
        : `Queue ${recipe.actionLabel.toLowerCase()}.`,
      "Attach the advanced admin audit packet to the execution report.",
    ],
    rollbackNote:
      "Rollback admin automation by using the referenced policy, retention, and recovery packets before applying any mutation.",
    auditEvidence: createEvidence({
      auditLogIds: [
        ...recipe.auditLogIds,
        ...findAuditLogIds(input.auditLogs, sourceIds),
      ],
      packetIds: [
        input.advancedAdminAutomation.auditPacket.id,
        ...recipe.packetIds,
      ],
      sourceIds,
    }),
    reportSummary: `${recipe.targetLabel}; ${recipe.actionLabel}.`,
  });
}

function createBackupCommands(
  input: ProductionCommandRunnerInput,
): ProductionCommand[] {
  return [
    ...input.workspaceBackupRestore.integrityChecks
      .filter((check) => check.status !== "ready")
      .map((check, index) => createBackupIntegrityCommand(input, check, index)),
    ...input.workspaceBackupRestore.dryRun.projects
      .filter((project) => project.status !== "ready")
      .map((project, index) =>
        createBackupDryRunCommand(input, project, 500 + index),
      ),
    ...input.workspaceBackupRestore.rollbackPlaybooks
      .filter((playbook) => playbook.targets > 0)
      .map((playbook, index) =>
        createBackupRollbackCommand(input, playbook, 1_000 + index),
      ),
  ];
}

function createBackupIntegrityCommand(
  input: ProductionCommandRunnerInput,
  check: WorkspaceBackupIntegrityCheck,
  index: number,
): ProductionCommand {
  const sourceIds = [check.id, ...check.affectedNames];

  return createCommand({
    area: "backup",
    sourceKind: "backup-integrity",
    sourceId: check.id,
    title: check.title,
    detail: check.detail,
    status: check.status,
    mode: "dry-run",
    phase: "validate",
    risk: check.status === "blocked" ? "high" : "medium",
    sequence: index,
    dryRunPlan: [
      `Run ${check.title} integrity check for ${check.scope}.`,
      check.detail,
    ],
    applyPlan: [check.remediation],
    rollbackNote:
      "Rollback backup remediation by restoring the previous manifest snapshot before retrying integrity checks.",
    auditEvidence: createEvidence({
      auditLogIds: findAuditLogIds(input.auditLogs, sourceIds),
      packetIds: [input.workspaceBackupRestore.manifestDownload.fileName],
      sourceIds,
    }),
    reportSummary: `${check.affectedCount} affected in ${check.scope}.`,
  });
}

function createBackupDryRunCommand(
  input: ProductionCommandRunnerInput,
  project: WorkspaceRestoreProjectDryRun,
  sequence: number,
): ProductionCommand {
  const sourceIds = [
    project.projectId,
    project.latestVersionId,
    project.latestCompletedExportId,
  ].filter((value): value is string => Boolean(value));

  return createCommand({
    area: "backup",
    sourceKind: "backup-restore-dry-run",
    sourceId: project.projectId,
    title: `Restore dry-run: ${project.name}`,
    detail: project.reason,
    status: project.status,
    mode: "dry-run",
    phase: "dry-run",
    risk: project.status === "blocked" ? "high" : "medium",
    sequence,
    dryRunPlan: [
      `Validate restore order ${project.restoreOrder} for ${project.name}.`,
      project.reason,
    ],
    applyPlan: [
      "Create missing snapshots or export artifacts before restore apply.",
      "Re-run workspace backup restore dry-run after remediation.",
    ],
    rollbackNote:
      "Rollback restore preparation by preserving the current manifest and skipping destructive restore operations.",
    auditEvidence: createEvidence({
      auditLogIds: findAuditLogIds(input.auditLogs, sourceIds),
      packetIds: [input.workspaceBackupRestore.manifestDownload.fileName],
      sourceIds,
    }),
    reportSummary: `Restore dry-run status for ${project.name}: ${project.status}.`,
  });
}

function createBackupRollbackCommand(
  input: ProductionCommandRunnerInput,
  playbook: WorkspaceRollbackPlaybook,
  sequence: number,
): ProductionCommand {
  const sourceIds = [playbook.id, playbook.title];

  return createCommand({
    area: "backup",
    sourceKind: "backup-rollback",
    sourceId: playbook.id,
    title: playbook.title,
    detail: playbook.detail,
    status: playbook.status,
    mode: playbook.status === "blocked" ? "dry-run" : "apply",
    phase: "rollback",
    risk: playbook.status === "blocked" ? "high" : "medium",
    sequence,
    dryRunPlan: playbook.steps,
    applyPlan: [playbook.nextAction, ...playbook.steps],
    rollbackNote: `Rollback uses the ${playbook.title} playbook and stops if post-restore verification fails.`,
    auditEvidence: createEvidence({
      auditLogIds: findAuditLogIds(input.auditLogs, sourceIds),
      packetIds: [input.workspaceBackupRestore.manifestDownload.fileName],
      sourceIds,
    }),
    reportSummary: `${playbook.targets} targets in ${playbook.title}.`,
  });
}

function createMarketplaceCommands(
  input: ProductionCommandRunnerInput,
): ProductionCommand[] {
  return input.marketplaceCreatorOperations.moderationRoutes
    .filter((route) => route.status !== "ready")
    .map((route, index) => createMarketplaceCommand(input, route, index));
}

function createMarketplaceCommand(
  input: ProductionCommandRunnerInput,
  route: MarketplaceCreatorModerationRoute,
  index: number,
): ProductionCommand {
  const sourceIds = [route.id, route.templateId, ...route.relatedTaskIds];

  return createCommand({
    area: "marketplace",
    sourceKind: "marketplace-moderation",
    sourceId: route.id,
    title: `${route.queueLabel}: ${route.templateName}`,
    detail: route.reason,
    status: route.status,
    mode: "dry-run",
    phase: "approval",
    risk: route.priority === "high" ? "high" : "medium",
    sequence: index,
    dryRunPlan: [
      `Confirm ${route.templateName} belongs in ${route.queueLabel}.`,
      route.reason,
      route.dueAt ? `Route before ${route.dueAt}.` : "No due date is set.",
    ],
    applyPlan: [
      `Assign ${route.owner} owner to ${route.queueLabel}.`,
      `Resolve ${route.relatedTaskIds.length} related moderation task${route.relatedTaskIds.length === 1 ? "" : "s"}.`,
    ],
    rollbackNote:
      "Rollback marketplace release by keeping the template unpublished or restoring the previous submission state.",
    auditEvidence: createEvidence({
      auditLogIds: findAuditLogIds(input.auditLogs, sourceIds),
      packetIds: [],
      sourceIds,
    }),
    reportSummary: `${route.priority} priority ${route.queueLabel}.`,
  });
}

function createCommand(
  input: Omit<ProductionCommand, "id">,
): ProductionCommand {
  return {
    ...input,
    id: `${input.area}-${input.sourceKind}-${slugify(input.sourceId)}-${input.sequence}`,
    dryRunPlan: unique(input.dryRunPlan).slice(0, 8),
    applyPlan: unique(input.applyPlan).slice(0, 8),
    auditEvidence: createEvidence(input.auditEvidence),
  };
}

function createBatches(
  commands: ProductionCommand[],
): ProductionCommandBatch[] {
  return areaOrder.flatMap((area) => {
    const areaCommands = commands.filter((command) => command.area === area);

    if (!areaCommands.length) return [];

    const mode = batchMode(areaCommands);

    return [
      {
        id: `${area}-${mode}-batch`,
        area,
        title: areaTitles[area],
        status: aggregateStatus(areaCommands),
        mode,
        commands: areaCommands,
        dryRunPlan: unique(
          areaCommands.flatMap((command) => command.dryRunPlan),
        ).slice(0, 10),
        applyPlan: unique(
          areaCommands.flatMap((command) => command.applyPlan),
        ).slice(0, 10),
        rollbackNotes: unique(
          areaCommands.map((command) => command.rollbackNote),
        ).slice(0, 8),
        auditEvidence: mergeEvidence(
          areaCommands.map((command) => command.auditEvidence),
        ),
      },
    ];
  });
}

function createExecutionReport(input: {
  batch: ProductionCommandBatch;
  generatedAt: string;
}): ProductionCommandExecutionReport {
  const payload = {
    kind: "essence-studio.production-command-runner.execution-report",
    version: 1,
    generatedAt: input.generatedAt,
    batch: {
      id: input.batch.id,
      area: input.batch.area,
      status: input.batch.status,
      mode: input.batch.mode,
    },
    commands: input.batch.commands.map((command) => ({
      id: command.id,
      sourceKind: command.sourceKind,
      sourceId: command.sourceId,
      title: command.title,
      status: command.status,
      mode: command.mode,
      phase: command.phase,
      risk: command.risk,
      dryRunPlan: command.dryRunPlan,
      applyPlan: command.applyPlan,
      rollbackNote: command.rollbackNote,
      auditEvidence: command.auditEvidence,
    })),
    dryRunSteps: input.batch.dryRunPlan,
    applySteps: input.batch.applyPlan,
    rollbackNotes: input.batch.rollbackNotes,
    auditEvidence: input.batch.auditEvidence,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `${input.batch.id}-execution-report`,
    batchId: input.batch.id,
    status: input.batch.status,
    generatedAt: input.generatedAt,
    commandIds: input.batch.commands.map((command) => command.id),
    dryRunSteps: input.batch.dryRunPlan,
    applySteps: input.batch.applyPlan,
    rollbackNotes: input.batch.rollbackNotes,
    auditEvidence: input.batch.auditEvidence,
    download: {
      fileName: `production-command-runner-${input.batch.id}.json`,
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createNextActions(commands: ProductionCommand[]) {
  return commands
    .filter((command) => command.status !== "ready")
    .slice(0, 6)
    .map((command) => {
      const prefix = command.mode === "apply" ? "Apply" : "Dry-run";

      return `${prefix} ${command.area} command: ${command.title}`;
    });
}

function createEvidence(
  evidence: ProductionCommandAuditEvidence,
): ProductionCommandAuditEvidence {
  return {
    auditLogIds: unique(evidence.auditLogIds),
    packetIds: unique(evidence.packetIds),
    sourceIds: unique(evidence.sourceIds),
  };
}

function mergeEvidence(
  evidenceItems: ProductionCommandAuditEvidence[],
): ProductionCommandAuditEvidence {
  return createEvidence({
    auditLogIds: evidenceItems.flatMap((evidence) => evidence.auditLogIds),
    packetIds: evidenceItems.flatMap((evidence) => evidence.packetIds),
    sourceIds: evidenceItems.flatMap((evidence) => evidence.sourceIds),
  });
}

function findAuditLogIds(
  auditLogs: WorkspaceAuditLogSummary[],
  sourceIds: string[],
) {
  const normalizedSourceIds = new Set(sourceIds.filter(Boolean));

  return auditLogs
    .filter((log) => {
      const metadataValues = Object.values(log.metadata).flatMap((value) =>
        Array.isArray(value) ? value.map(String) : [String(value ?? "")],
      );

      return (
        (log.targetId && normalizedSourceIds.has(log.targetId)) ||
        metadataValues.some((value) => normalizedSourceIds.has(value))
      );
    })
    .map((log) => log.id);
}

function countEvidenceLinks(commands: ProductionCommand[]) {
  const evidence = mergeEvidence(
    commands.map((command) => command.auditEvidence),
  );

  return (
    evidence.auditLogIds.length +
    evidence.packetIds.length +
    evidence.sourceIds.length
  );
}

function aggregateStatus(
  items: Array<{ status: ProductionCommandRunnerStatus }>,
): ProductionCommandRunnerStatus {
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "review")) return "review";

  return "ready";
}

function average(values: number[]) {
  if (!values.length) return 100;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function batchMode(commands: ProductionCommand[]): ProductionCommandBatchMode {
  const modes = new Set(commands.map((command) => command.mode));

  if (modes.size > 1) return "mixed";

  return commands[0]?.mode ?? "dry-run";
}

function compareCommands(left: ProductionCommand, right: ProductionCommand) {
  const areaDelta =
    areaOrder.indexOf(left.area) - areaOrder.indexOf(right.area);

  if (areaDelta !== 0) return areaDelta;
  if (left.sequence !== right.sequence) return left.sequence - right.sequence;

  return left.id.localeCompare(right.id);
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "command"
  );
}
