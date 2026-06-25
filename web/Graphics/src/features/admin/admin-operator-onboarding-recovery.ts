import type {
  AdminAuditRow,
  AdminFileRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";
import type { AdminAutomationRunbookCenterReport } from "@/features/admin/admin-automation-runbook-center";
import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";
import type { AdminOrganizationAuditIntelligenceReport } from "@/features/admin/admin-organization-audit-intelligence";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminSelfHostedBackupReadinessReport } from "@/features/admin/admin-self-hosted-backup-readiness";
import type { DeployEnvironmentPreflightReport } from "@/features/admin/deploy-environment-preflight";
import { redactOperatorOnboardingRecoveryText } from "@/features/admin/admin-operator-onboarding-recovery-export";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export type AdminOperatorOnboardingRecoveryStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminOperatorOnboardingRecoveryTrack =
  | "handoff-exports"
  | "prerequisites"
  | "restore-drills"
  | "sample-data";

export type AdminOperatorOnboardingRecoveryStep = {
  id: string;
  status: AdminOperatorOnboardingRecoveryStatus;
  label: string;
  owner: string;
  evidence: string;
  expectedResult: string;
  command: string | null;
  latestAt: string | null;
};

export type AdminOperatorOnboardingRecoveryPlaybook = {
  id: string;
  track: AdminOperatorOnboardingRecoveryTrack;
  status: AdminOperatorOnboardingRecoveryStatus;
  title: string;
  owner: string;
  objective: string;
  handoffExportId: string;
  stepCount: number;
  readyStepCount: number;
  reviewStepCount: number;
  blockedStepCount: number;
  steps: AdminOperatorOnboardingRecoveryStep[];
};

export type AdminOperatorOnboardingRecoveryHandoffExport = {
  id: string;
  status: AdminOperatorOnboardingRecoveryStatus;
  label: string;
  sourcePlaybookId: string;
  format: "csv" | "json" | "markdown";
  filename: string;
  summary: string;
  command: string;
};

export type AdminOperatorOnboardingRecoveryReport = {
  generatedAt: string;
  status: AdminOperatorOnboardingRecoveryStatus;
  score: number;
  playbookCount: number;
  readyPlaybookCount: number;
  reviewPlaybookCount: number;
  blockedPlaybookCount: number;
  stepCount: number;
  readyStepCount: number;
  reviewStepCount: number;
  blockedStepCount: number;
  handoffExportCount: number;
  prerequisiteBlockedCount: number;
  sampleDataIssueCount: number;
  restoreDrillIssueCount: number;
  commands: string[];
  playbooks: AdminOperatorOnboardingRecoveryPlaybook[];
  handoffExports: AdminOperatorOnboardingRecoveryHandoffExport[];
};

export type AdminOperatorOnboardingRecoveryInput = {
  generatedAt?: string;
  auditEvents: AdminAuditRow[];
  users: AdminUserRow[];
  files: AdminFileRow[];
  shares: AdminShareRow[];
  automationRunbookCenter: Pick<
    AdminAutomationRunbookCenterReport,
    | "blockedCount"
    | "commandCount"
    | "commands"
    | "generatedAt"
    | "readyCount"
    | "reviewCount"
    | "score"
    | "status"
  >;
  deployEnvironmentPreflight: Pick<
    DeployEnvironmentPreflightReport,
    | "appOrigin"
    | "blockedCount"
    | "commands"
    | "generatedAt"
    | "readyCount"
    | "requiredCount"
    | "reviewCount"
    | "score"
    | "status"
    | "vercelEnv"
  >;
  operatorRehearsals: Pick<
    AdminOperatorRehearsalReport,
    | "blockedRunCount"
    | "blockedStepCount"
    | "commandCount"
    | "commands"
    | "generatedAt"
    | "readyRunCount"
    | "readyStepCount"
    | "reviewRunCount"
    | "reviewStepCount"
    | "rows"
    | "runCount"
    | "score"
    | "status"
    | "stepCount"
  >;
  organizationAuditIntelligence: Pick<
    AdminOrganizationAuditIntelligenceReport,
    | "clusterCount"
    | "commands"
    | "generatedAt"
    | "highSeverityCount"
    | "packetCount"
    | "reviewerQueueCount"
    | "score"
    | "status"
  >;
  productionDeploySmoke: Pick<
    ProductionDeploySmokeReport,
    | "baseUrl"
    | "blockedCount"
    | "commands"
    | "generatedAt"
    | "readyCount"
    | "requiredRouteCount"
    | "reviewCount"
    | "routeCount"
    | "score"
    | "status"
  >;
  rollbackReadiness: Pick<
    AdminRollbackReadinessReport,
    | "blockedCount"
    | "deploymentLinkCount"
    | "elevatedShareCount"
    | "filesWithoutVersions"
    | "generatedAt"
    | "readyCount"
    | "reviewCount"
    | "rows"
    | "score"
    | "staleShareCount"
    | "status"
    | "versionAnchorCount"
  >;
  selfHostedBackupReadiness: Pick<
    AdminSelfHostedBackupReadinessReport,
    | "activeShareCount"
    | "backupCommandConfigured"
    | "backupScheduleConfigured"
    | "backupTargetConfigured"
    | "blockedCount"
    | "commands"
    | "databaseAuthReady"
    | "databaseConfigured"
    | "elevatedShareCount"
    | "filesWithoutVersions"
    | "generatedAt"
    | "readyCount"
    | "reviewCount"
    | "score"
    | "staleShareCount"
    | "status"
    | "versionAnchorCount"
  >;
};

export function getAdminOperatorOnboardingRecoveryReport({
  auditEvents,
  automationRunbookCenter,
  deployEnvironmentPreflight,
  files,
  generatedAt = new Date().toISOString(),
  operatorRehearsals,
  organizationAuditIntelligence,
  productionDeploySmoke,
  rollbackReadiness,
  selfHostedBackupReadiness,
  shares,
  users,
}: AdminOperatorOnboardingRecoveryInput): AdminOperatorOnboardingRecoveryReport {
  const playbooks = [
    getPrerequisitePlaybook({
      automationRunbookCenter,
      deployEnvironmentPreflight,
      productionDeploySmoke,
    }),
    getSampleDataPlaybook({ auditEvents, files, shares, users }),
    getRestoreDrillPlaybook({
      operatorRehearsals,
      rollbackReadiness,
      selfHostedBackupReadiness,
    }),
    getHandoffExportPlaybook({
      automationRunbookCenter,
      organizationAuditIntelligence,
      productionDeploySmoke,
      selfHostedBackupReadiness,
    }),
  ];
  const handoffExports = playbooks.map((playbook) =>
    createHandoffExport(playbook, generatedAt),
  );
  const steps = playbooks.flatMap((playbook) => playbook.steps);
  const readyPlaybookCount = playbooks.filter(
    (playbook) => playbook.status === "ready",
  ).length;
  const reviewPlaybookCount = playbooks.filter(
    (playbook) => playbook.status === "review",
  ).length;
  const blockedPlaybookCount = playbooks.filter(
    (playbook) => playbook.status === "blocked",
  ).length;
  const readyStepCount = steps.filter((step) => step.status === "ready").length;
  const reviewStepCount = steps.filter((step) => step.status === "review")
    .length;
  const blockedStepCount = steps.filter((step) => step.status === "blocked")
    .length;
  const commands = uniqueStrings([
    "bun run admin:operator-onboarding-smoke",
    "bun run ops:env-preflight",
    "bun run ops:post-deploy-smoke",
    ...deployEnvironmentPreflight.commands,
    ...productionDeploySmoke.commands,
    ...automationRunbookCenter.commands,
    ...operatorRehearsals.commands,
    ...selfHostedBackupReadiness.commands,
    ...organizationAuditIntelligence.commands,
  ]);

  return {
    generatedAt,
    status:
      blockedPlaybookCount > 0
        ? "blocked"
        : reviewPlaybookCount > 0
          ? "review"
          : "ready",
    score: Math.max(0, 100 - blockedPlaybookCount * 18 - reviewPlaybookCount * 7),
    playbookCount: playbooks.length,
    readyPlaybookCount,
    reviewPlaybookCount,
    blockedPlaybookCount,
    stepCount: steps.length,
    readyStepCount,
    reviewStepCount,
    blockedStepCount,
    handoffExportCount: handoffExports.length,
    prerequisiteBlockedCount: playbooks
      .filter((playbook) => playbook.track === "prerequisites")
      .flatMap((playbook) => playbook.steps)
      .filter((step) => step.status === "blocked").length,
    sampleDataIssueCount: playbooks
      .filter((playbook) => playbook.track === "sample-data")
      .flatMap((playbook) => playbook.steps)
      .filter((step) => step.status !== "ready").length,
    restoreDrillIssueCount: playbooks
      .filter((playbook) => playbook.track === "restore-drills")
      .flatMap((playbook) => playbook.steps)
      .filter((step) => step.status !== "ready").length,
    commands,
    playbooks,
    handoffExports,
  };
}

function getPrerequisitePlaybook({
  automationRunbookCenter,
  deployEnvironmentPreflight,
  productionDeploySmoke,
}: {
  automationRunbookCenter: AdminOperatorOnboardingRecoveryInput["automationRunbookCenter"];
  deployEnvironmentPreflight: AdminOperatorOnboardingRecoveryInput["deployEnvironmentPreflight"];
  productionDeploySmoke: AdminOperatorOnboardingRecoveryInput["productionDeploySmoke"];
}): AdminOperatorOnboardingRecoveryPlaybook {
  return createPlaybook({
    id: "operator-prerequisites",
    track: "prerequisites",
    title: "Operator prerequisite checks",
    owner: "Platform operator",
    objective:
      "Confirm environment, deployment smoke, and scheduled runbook evidence before a new operator starts recovery work.",
    steps: [
      {
        id: "operator-env-preflight",
        status: deployEnvironmentPreflight.status,
        label: "Environment preflight",
        owner: "Platform operator",
        evidence: `${deployEnvironmentPreflight.readyCount}/${deployEnvironmentPreflight.requiredCount} required rows are ready for ${deployEnvironmentPreflight.vercelEnv} at ${deployEnvironmentPreflight.appOrigin}. ${deployEnvironmentPreflight.blockedCount} blocked and ${deployEnvironmentPreflight.reviewCount} review rows remain.`,
        expectedResult:
          "All required database, auth, email, URL, and runtime settings are ready.",
        command:
          deployEnvironmentPreflight.commands.find((command) =>
            command.includes("env-preflight"),
          ) ?? "bun run ops:env-preflight",
        latestAt: deployEnvironmentPreflight.generatedAt,
      },
      {
        id: "operator-route-smoke",
        status: productionDeploySmoke.status,
        label: "Deployment route smoke",
        owner: "Release operator",
        evidence: `${productionDeploySmoke.readyCount}/${productionDeploySmoke.requiredRouteCount} required routes are ready at ${productionDeploySmoke.baseUrl}.`,
        expectedResult:
          "Auth, editor, admin, share, prototype, embed, and release handoff routes are smoke-tested.",
        command:
          productionDeploySmoke.commands.find((command) =>
            command.includes("deploy-smoke"),
          ) ?? "bun run visual:deploy-smoke",
        latestAt: productionDeploySmoke.generatedAt,
      },
      {
        id: "operator-runbook-center",
        status: automationRunbookCenter.status,
        label: "Runbook center readiness",
        owner: "Operations lead",
        evidence: `${automationRunbookCenter.readyCount} ready, ${automationRunbookCenter.reviewCount} review, and ${automationRunbookCenter.blockedCount} blocked runbook rows with ${automationRunbookCenter.commandCount} commands.`,
        expectedResult:
          "Scheduled health, repair, incident, and evidence bundle runbooks are available.",
        command: automationRunbookCenter.commands[0] ?? null,
        latestAt: automationRunbookCenter.generatedAt,
      },
    ],
  });
}

function getSampleDataPlaybook({
  auditEvents,
  files,
  shares,
  users,
}: {
  auditEvents: AdminAuditRow[];
  files: AdminFileRow[];
  shares: AdminShareRow[];
  users: AdminUserRow[];
}): AdminOperatorOnboardingRecoveryPlaybook {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const verifiedUsers = users.filter((user) => user.emailVerified);
  const activeShares = shares.filter((share) => !share.disabledAt);
  const riskyShares = activeShares.filter(
    (share) => share.allowDownload || !share.expiresAt,
  );
  const recentAuditEvents = auditEvents.filter((event) =>
    /restore|disable|approval|revoke|policy|share/i.test(event.action),
  );

  return createPlaybook({
    id: "operator-sample-data-health",
    track: "sample-data",
    title: "Sample data health",
    owner: "Design ops reviewer",
    objective:
      "Make sure the onboarding workspace has safe sample users, files, shares, and audit evidence without leaking live secrets.",
    steps: [
      {
        id: "operator-sample-users",
        status: verifiedUsers.length > 0 ? "ready" : "blocked",
        label: "Verified operator account",
        owner: "Access reviewer",
        evidence:
          verifiedUsers.length > 0
            ? `${verifiedUsers.length}/${users.length} users are verified.`
            : `No verified users are available among ${users.length} loaded users, including ${redactOperatorOnboardingRecoveryText(users[0]?.email ?? "no user email")}.`,
        expectedResult:
          "At least one verified operator account can sign in before recovery drills.",
        command: null,
        latestAt: users[0]?.createdAt ?? null,
      },
      {
        id: "operator-sample-files",
        status: activeFiles.length > 0 ? "ready" : "blocked",
        label: "Sample design workspace",
        owner: "Design ops reviewer",
        evidence:
          activeFiles.length > 0
            ? `${activeFiles.length} active files are available, including ${redactOperatorOnboardingRecoveryText(activeFiles[0]?.name ?? "sample file")}.`
            : "No active sample design files are available.",
        expectedResult:
          "Operators can practice file review, version, export, and recovery flows on safe sample data.",
        command: null,
        latestAt: activeFiles[0]?.updatedAt ?? null,
      },
      {
        id: "operator-sample-share-safety",
        status:
          riskyShares.length > 0
            ? "review"
            : activeShares.length > 0
              ? "ready"
              : "review",
        label: "Sample public link safety",
        owner: "Publication reviewer",
        evidence:
          activeShares.length > 0
            ? `${activeShares.length} active shares and ${riskyShares.length} review shares exist for onboarding.`
            : "No sample public share exists for publication and rollback drills.",
        expectedResult:
          "Sample links are intentionally scoped and safe to disable, restore, and audit.",
        command: null,
        latestAt: activeShares[0]?.createdAt ?? null,
      },
      {
        id: "operator-sample-audit-trail",
        status: recentAuditEvents.length > 0 ? "ready" : "review",
        label: "Recovery audit trail",
        owner: "Admin lead",
        evidence:
          recentAuditEvents.length > 0
            ? `${recentAuditEvents.length} relevant audit events are available; latest target ${redactOperatorOnboardingRecoveryText(recentAuditEvents[0]?.targetLabel ?? "unknown")}.`
            : "No restore, share, policy, approval, or session audit events are available for onboarding review.",
        expectedResult:
          "Operators can inspect a recent safe audit trail before touching production evidence.",
        command: null,
        latestAt: recentAuditEvents[0]?.createdAt ?? null,
      },
    ],
  });
}

function getRestoreDrillPlaybook({
  operatorRehearsals,
  rollbackReadiness,
  selfHostedBackupReadiness,
}: {
  operatorRehearsals: AdminOperatorOnboardingRecoveryInput["operatorRehearsals"];
  rollbackReadiness: AdminOperatorOnboardingRecoveryInput["rollbackReadiness"];
  selfHostedBackupReadiness: AdminOperatorOnboardingRecoveryInput["selfHostedBackupReadiness"];
}): AdminOperatorOnboardingRecoveryPlaybook {
  const restoreRows = operatorRehearsals.rows.filter(
    (row) => row.kind === "restore",
  );
  const restoreStatus =
    restoreRows.length > 0
      ? getWorstStatus(restoreRows.map((row) => row.status))
      : "review";
  const backupStatus: AdminOperatorOnboardingRecoveryStatus =
    selfHostedBackupReadiness.databaseConfigured &&
    selfHostedBackupReadiness.databaseAuthReady &&
    selfHostedBackupReadiness.backupCommandConfigured
      ? selfHostedBackupReadiness.backupScheduleConfigured &&
        selfHostedBackupReadiness.backupTargetConfigured
        ? "ready"
        : "review"
      : "blocked";

  return createPlaybook({
    id: "operator-restore-drills",
    track: "restore-drills",
    title: "Restore drill rehearsal",
    owner: "Recovery operator",
    objective:
      "Bundle the restore rehearsal, rollback anchors, backup command, and deployment link checks into one operator drill.",
    steps: [
      {
        id: "operator-restore-rehearsal",
        status: restoreStatus,
        label: "Restore rehearsal steps",
        owner: "Recovery operator",
        evidence:
          restoreRows.length > 0
            ? `${restoreRows.length} restore rehearsal rows are present with status ${restoreStatus}.`
            : "No restore rehearsal row is available in operator rehearsals.",
        expectedResult:
          "Restore drill steps are assigned, repeatable, and backed by evidence.",
        command: restoreRows[0]?.command ?? operatorRehearsals.commands[0] ?? null,
        latestAt: operatorRehearsals.generatedAt,
      },
      {
        id: "operator-rollback-anchors",
        status: rollbackReadiness.status,
        label: "Rollback anchors",
        owner: "Release operator",
        evidence: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.filesWithoutVersions} files without versions, ${rollbackReadiness.deploymentLinkCount} deployment links.`,
        expectedResult:
          "Every active recovery file has a named version anchor and deployment link evidence.",
        command: null,
        latestAt: rollbackReadiness.generatedAt,
      },
      {
        id: "operator-backup-command",
        status: backupStatus,
        label: "Backup restore command",
        owner: "Platform operator",
        evidence: `${selfHostedBackupReadiness.commands.length} backup commands, database configured ${selfHostedBackupReadiness.databaseConfigured}, auth ready ${selfHostedBackupReadiness.databaseAuthReady}.`,
        expectedResult:
          "A runnable backup or dump command is documented with target and schedule ownership.",
        command: selfHostedBackupReadiness.commands[0] ?? null,
        latestAt: selfHostedBackupReadiness.generatedAt,
      },
      {
        id: "operator-share-restore-safety",
        status:
          rollbackReadiness.staleShareCount > 0 ||
          rollbackReadiness.elevatedShareCount > 0
            ? "review"
            : "ready",
        label: "Share restore safety",
        owner: "Publication reviewer",
        evidence: `${rollbackReadiness.staleShareCount} stale shares and ${rollbackReadiness.elevatedShareCount} elevated shares need recovery review.`,
        expectedResult:
          "Restored public links are intentionally preserved, disabled, or reissued.",
        command: null,
        latestAt: rollbackReadiness.generatedAt,
      },
    ],
  });
}

function getHandoffExportPlaybook({
  automationRunbookCenter,
  organizationAuditIntelligence,
  productionDeploySmoke,
  selfHostedBackupReadiness,
}: {
  automationRunbookCenter: AdminOperatorOnboardingRecoveryInput["automationRunbookCenter"];
  organizationAuditIntelligence: AdminOperatorOnboardingRecoveryInput["organizationAuditIntelligence"];
  productionDeploySmoke: AdminOperatorOnboardingRecoveryInput["productionDeploySmoke"];
  selfHostedBackupReadiness: AdminOperatorOnboardingRecoveryInput["selfHostedBackupReadiness"];
}): AdminOperatorOnboardingRecoveryPlaybook {
  return createPlaybook({
    id: "operator-handoff-exports",
    track: "handoff-exports",
    title: "Operator handoff exports",
    owner: "Operations lead",
    objective:
      "Package onboarding, audit, smoke, backup, and runbook evidence so recovery handoffs are exportable.",
    steps: [
      {
        id: "operator-audit-packets",
        status: organizationAuditIntelligence.status,
        label: "Audit investigation packets",
        owner: "Security reviewer",
        evidence: `${organizationAuditIntelligence.packetCount} packets from ${organizationAuditIntelligence.clusterCount} clusters across ${organizationAuditIntelligence.reviewerQueueCount} reviewer queues.`,
        expectedResult:
          "Redacted investigation packets can be attached to recovery handoffs.",
        command: organizationAuditIntelligence.commands[0] ?? null,
        latestAt: organizationAuditIntelligence.generatedAt,
      },
      {
        id: "operator-runbook-exports",
        status: automationRunbookCenter.status,
        label: "Runbook export commands",
        owner: "Operations lead",
        evidence: `${automationRunbookCenter.commandCount} runbook commands are available with score ${automationRunbookCenter.score}.`,
        expectedResult:
          "Scheduled health, repair, incident, and evidence bundle exports are ready.",
        command: automationRunbookCenter.commands[0] ?? null,
        latestAt: automationRunbookCenter.generatedAt,
      },
      {
        id: "operator-smoke-exports",
        status: productionDeploySmoke.status,
        label: "Deploy smoke export",
        owner: "Release operator",
        evidence: `${productionDeploySmoke.routeCount} smoke routes at ${productionDeploySmoke.baseUrl} with score ${productionDeploySmoke.score}.`,
        expectedResult:
          "The route smoke checklist can travel with the recovery packet.",
        command: productionDeploySmoke.commands[0] ?? null,
        latestAt: productionDeploySmoke.generatedAt,
      },
      {
        id: "operator-backup-exports",
        status: selfHostedBackupReadiness.status,
        label: "Backup handoff export",
        owner: "Platform operator",
        evidence: `${selfHostedBackupReadiness.commands.length} backup commands; ${selfHostedBackupReadiness.versionAnchorCount} version anchors; ${selfHostedBackupReadiness.filesWithoutVersions} files missing anchors.`,
        expectedResult:
          "Self-hosted backup evidence is attached to recovery onboarding.",
        command: selfHostedBackupReadiness.commands[0] ?? null,
        latestAt: selfHostedBackupReadiness.generatedAt,
      },
    ],
  });
}

function createPlaybook({
  id,
  objective,
  owner,
  steps,
  title,
  track,
}: {
  id: string;
  track: AdminOperatorOnboardingRecoveryTrack;
  title: string;
  owner: string;
  objective: string;
  steps: AdminOperatorOnboardingRecoveryStep[];
}): AdminOperatorOnboardingRecoveryPlaybook {
  const readyStepCount = steps.filter((step) => step.status === "ready").length;
  const reviewStepCount = steps.filter((step) => step.status === "review")
    .length;
  const blockedStepCount = steps.filter((step) => step.status === "blocked")
    .length;

  return {
    id,
    track,
    status: getWorstStatus(steps.map((step) => step.status)),
    title,
    owner,
    objective,
    handoffExportId: `${id}-handoff`,
    stepCount: steps.length,
    readyStepCount,
    reviewStepCount,
    blockedStepCount,
    steps,
  };
}

function createHandoffExport(
  playbook: AdminOperatorOnboardingRecoveryPlaybook,
  generatedAt: string,
): AdminOperatorOnboardingRecoveryHandoffExport {
  const summary = redactOperatorOnboardingRecoveryText(
    `${playbook.title}: ${playbook.readyStepCount} ready, ${playbook.reviewStepCount} review, ${playbook.blockedStepCount} blocked. ${playbook.steps
      .map((step) => step.evidence)
      .join(" ")}`,
  );

  return {
    id: playbook.handoffExportId,
    status: playbook.status,
    label: `${playbook.title} handoff`,
    sourcePlaybookId: playbook.id,
    format: "markdown",
    filename: `${playbook.id}-${generatedAt.slice(0, 10)}.md`,
    summary,
    command: "Export Admin > Operator onboarding recovery Markdown.",
  };
}

function getWorstStatus(
  statuses: AdminOperatorOnboardingRecoveryStatus[],
): AdminOperatorOnboardingRecoveryStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export {
  getAdminOperatorOnboardingRecoveryCsv,
  getAdminOperatorOnboardingRecoveryJson,
  getAdminOperatorOnboardingRecoveryMarkdown,
} from "@/features/admin/admin-operator-onboarding-recovery-export";
