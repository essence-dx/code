import type { AdminCollaborationEventIngestionReport } from "@/features/admin/admin-collaboration-event-ingestion";
import type { AdminDataLossPreventionReport } from "@/features/admin/admin-data-loss-prevention";
import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";
import type { AdminRealtimeHealthReport } from "@/features/admin/admin-realtime-health-monitor";
import type { AdminReleaseArchiveRetentionReport } from "@/features/admin/admin-release-archive-retention";
import type { ScopedPublicationApprovalReport } from "@/features/admin/admin-scoped-publication-approvals";
import type { SelfHostedSyncDiagnosticReport } from "@/features/admin/admin-self-hosted-sync-diagnostics";
import type { DeployEnvironmentPreflightReport } from "@/features/admin/deploy-environment-preflight";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export type AdminAutomationRunbookStatus = "ready" | "review" | "blocked";

export type AdminAutomationRunbookCategory =
  | "evidence-bundle"
  | "incident-drill"
  | "repair-action"
  | "scheduled-health";

export type AdminAutomationRunbookRow = {
  id: string;
  category: AdminAutomationRunbookCategory;
  status: AdminAutomationRunbookStatus;
  label: string;
  cadence: string;
  owner: string;
  evidence: string;
  command: string;
  latestAt: string | null;
};

export type AdminAutomationRunbook = {
  id: string;
  category: AdminAutomationRunbookCategory;
  status: AdminAutomationRunbookStatus;
  title: string;
  objective: string;
  cadence: string;
  owner: string;
  rowCount: number;
  commandCount: number;
  blockedSignalCount: number;
  reviewSignalCount: number;
  evidenceBundle: string;
  rows: AdminAutomationRunbookRow[];
  commands: string[];
};

export type AdminAutomationRunbookCenterReport = {
  generatedAt: string;
  status: AdminAutomationRunbookStatus;
  score: number;
  scheduledHealthCount: number;
  repairActionCount: number;
  incidentDrillCount: number;
  evidenceBundleCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  commandCount: number;
  runbooks: AdminAutomationRunbook[];
  rows: AdminAutomationRunbookRow[];
  commands: string[];
};

export type AdminAutomationRunbookCenterInput = {
  collaborationEventIngestion: AdminCollaborationEventIngestionReport;
  dataLossPrevention: AdminDataLossPreventionReport;
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  generatedAt?: string;
  operatorRehearsals: AdminOperatorRehearsalReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  realtimeHealth: AdminRealtimeHealthReport;
  releaseArchiveRetention: AdminReleaseArchiveRetentionReport;
  scopedPublicationApprovals: ScopedPublicationApprovalReport;
  selfHostedSyncDiagnostics: SelfHostedSyncDiagnosticReport;
};

export function getAdminAutomationRunbookCenterReport({
  collaborationEventIngestion,
  dataLossPrevention,
  deployEnvironmentPreflight,
  generatedAt = new Date().toISOString(),
  operatorRehearsals,
  productionDeploySmoke,
  realtimeHealth,
  releaseArchiveRetention,
  scopedPublicationApprovals,
  selfHostedSyncDiagnostics,
}: AdminAutomationRunbookCenterInput): AdminAutomationRunbookCenterReport {
  const runbooks = [
    getScheduledHealthRunbook({
      deployEnvironmentPreflight,
      productionDeploySmoke,
      realtimeHealth,
    }),
    getRepairActionRunbook({
      dataLossPrevention,
      scopedPublicationApprovals,
      selfHostedSyncDiagnostics,
    }),
    getIncidentDrillRunbook({
      collaborationEventIngestion,
      operatorRehearsals,
      realtimeHealth,
    }),
    getEvidenceBundleRunbook({
      dataLossPrevention,
      releaseArchiveRetention,
      selfHostedSyncDiagnostics,
    }),
  ];
  const rows = runbooks.flatMap((runbook) => runbook.rows).sort(sortRows);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const commands = uniqueStrings(runbooks.flatMap((runbook) => runbook.commands));

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 6),
    scheduledHealthCount: runbooks.filter(
      (runbook) => runbook.category === "scheduled-health",
    ).length,
    repairActionCount: runbooks.filter(
      (runbook) => runbook.category === "repair-action",
    ).length,
    incidentDrillCount: runbooks.filter(
      (runbook) => runbook.category === "incident-drill",
    ).length,
    evidenceBundleCount: runbooks.filter(
      (runbook) => runbook.category === "evidence-bundle",
    ).length,
    readyCount,
    reviewCount,
    blockedCount,
    commandCount: commands.length,
    runbooks,
    rows,
    commands,
  };
}

function getScheduledHealthRunbook({
  deployEnvironmentPreflight,
  productionDeploySmoke,
  realtimeHealth,
}: {
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  realtimeHealth: AdminRealtimeHealthReport;
}): AdminAutomationRunbook {
  return createRunbook({
    category: "scheduled-health",
    title: "Scheduled health checks",
    objective:
      "Keep deployment, route smoke, and realtime health evidence fresh before operators approve external publication.",
    cadence: "Every deployment and daily",
    owner: "Release operator",
    evidenceBundle: "health-check-evidence",
    rows: [
      createRow({
        id: "scheduled-env-preflight",
        category: "scheduled-health",
        status: deployEnvironmentPreflight.status,
        label: "Environment preflight",
        cadence: "Daily",
        owner: "Platform operator",
        evidence: `${deployEnvironmentPreflight.readyCount} ready, ${deployEnvironmentPreflight.reviewCount} review, and ${deployEnvironmentPreflight.blockedCount} blocked environment rows.`,
        command:
          deployEnvironmentPreflight.commands.find((command) =>
            command.includes("env-preflight"),
          ) ?? "bun run ops:env-preflight",
        latestAt: deployEnvironmentPreflight.generatedAt,
      }),
      createRow({
        id: "scheduled-route-smoke",
        category: "scheduled-health",
        status: productionDeploySmoke.status,
        label: "Route smoke",
        cadence: "After deploy",
        owner: "Release operator",
        evidence: `${productionDeploySmoke.readyCount}/${productionDeploySmoke.routeCount} route checks are ready across ${productionDeploySmoke.requiredRouteCount} required routes.`,
        command:
          productionDeploySmoke.commands.find((command) =>
            command.includes("post-deploy-smoke"),
          ) ?? "bun run ops:post-deploy-smoke",
        latestAt: productionDeploySmoke.generatedAt,
      }),
      createRow({
        id: "scheduled-realtime-health",
        category: "scheduled-health",
        status: realtimeHealth.status,
        label: "Realtime health monitor",
        cadence: "Every 15 minutes",
        owner: "Collaboration operator",
        evidence: `${realtimeHealth.monitoredRoomCount} rooms, ${realtimeHealth.offlineReplayQueueCount} offline replay items, and realtime score ${realtimeHealth.score}.`,
        command: realtimeHealth.commands[0] ?? "Export realtime health JSON.",
        latestAt: realtimeHealth.generatedAt,
      }),
    ],
  });
}

function getRepairActionRunbook({
  dataLossPrevention,
  scopedPublicationApprovals,
  selfHostedSyncDiagnostics,
}: {
  dataLossPrevention: AdminDataLossPreventionReport;
  scopedPublicationApprovals: ScopedPublicationApprovalReport;
  selfHostedSyncDiagnostics: SelfHostedSyncDiagnosticReport;
}): AdminAutomationRunbook {
  return createRunbook({
    category: "repair-action",
    title: "Repair action queue",
    objective:
      "Turn blocked governance signals into repeatable operator repair actions with exportable evidence.",
    cadence: "Every 30 minutes while review is open",
    owner: "Governance operator",
    evidenceBundle: "repair-action-evidence",
    rows: [
      createRow({
        id: "repair-self-hosted-sync",
        category: "repair-action",
        status: selfHostedSyncDiagnostics.status,
        label: "Self-hosted sync repair",
        cadence: "Before self-hosted cutover",
        owner: "Self-hosted operator",
        evidence: `${selfHostedSyncDiagnostics.blockedCount} blocked and ${selfHostedSyncDiagnostics.reviewCount} review sync diagnostics with ${selfHostedSyncDiagnostics.repairCommandCount} repair commands.`,
        command:
          selfHostedSyncDiagnostics.repairCommands.find(
            (command) => command.category !== "operator",
          )?.command ?? "Export self-hosted sync diagnostics Markdown.",
        latestAt: selfHostedSyncDiagnostics.generatedAt,
      }),
      createRow({
        id: "repair-dlp",
        category: "repair-action",
        status: dataLossPrevention.status,
        label: "Data-loss prevention repair",
        cadence: "Before external export",
        owner: "Security reviewer",
        evidence: `${dataLossPrevention.blockedCount} blocked and ${dataLossPrevention.reviewCount} review DLP rows across ${dataLossPrevention.sensitiveFindingCount} sensitive findings.`,
        command:
          dataLossPrevention.commands[0] ??
          "Export data-loss prevention evidence.",
        latestAt: dataLossPrevention.generatedAt,
      }),
      createRow({
        id: "repair-publication-approvals",
        category: "repair-action",
        status: scopedPublicationApprovals.status,
        label: "Publication approval repair",
        cadence: "Before channel publish",
        owner: "Publication reviewer",
        evidence: `${scopedPublicationApprovals.missingApprovalCount} missing, ${scopedPublicationApprovals.staleApprovalCount} stale, and ${scopedPublicationApprovals.overdueScopeCount} overdue scoped approvals.`,
        command:
          scopedPublicationApprovals.commands[0] ??
          "Export scoped publication approval evidence.",
        latestAt: scopedPublicationApprovals.generatedAt,
      }),
    ],
  });
}

function getIncidentDrillRunbook({
  collaborationEventIngestion,
  operatorRehearsals,
  realtimeHealth,
}: {
  collaborationEventIngestion: AdminCollaborationEventIngestionReport;
  operatorRehearsals: AdminOperatorRehearsalReport;
  realtimeHealth: AdminRealtimeHealthReport;
}): AdminAutomationRunbook {
  return createRunbook({
    category: "incident-drill",
    title: "Incident drills",
    objective:
      "Practice recovery for realtime replay, restore, import/export, public share privacy, desktop handoff, and self-hosted recovery.",
    cadence: "Weekly and after incident",
    owner: "Incident commander",
    evidenceBundle: "incident-drill-evidence",
    rows: [
      createRow({
        id: "drill-operator-rehearsals",
        category: "incident-drill",
        status: operatorRehearsals.status,
        label: "Operator rehearsals",
        cadence: "Weekly",
        owner: "Release operator",
        evidence: `${operatorRehearsals.readyRunCount}/${operatorRehearsals.runCount} rehearsals ready with ${operatorRehearsals.commandCount} commands and ${operatorRehearsals.blockedStepCount} blocked steps.`,
        command:
          operatorRehearsals.commands[0] ??
          "Export operator rehearsals Markdown.",
        latestAt: operatorRehearsals.generatedAt,
      }),
      createRow({
        id: "drill-collaboration-replay",
        category: "incident-drill",
        status: collaborationEventIngestion.status,
        label: "Collaboration replay drill",
        cadence: "After collaboration incident",
        owner: "Collaboration operator",
        evidence: `${collaborationEventIngestion.durableEventCount} retained collaboration events, ${collaborationEventIngestion.incidentCount} incidents, and ${collaborationEventIngestion.purgeCandidateCount} purge candidates.`,
        command:
          collaborationEventIngestion.commands[0] ??
          "Export collaboration event ingestion evidence.",
        latestAt: collaborationEventIngestion.generatedAt,
      }),
      createRow({
        id: "drill-realtime-reconnect",
        category: "incident-drill",
        status: realtimeHealth.status,
        label: "Realtime reconnect drill",
        cadence: "After reconnect anomaly",
        owner: "Realtime operator",
        evidence: `${realtimeHealth.eventDriftCount} drift events, ${realtimeHealth.pendingSaveSignalCount} pending save signals, and reconnect quality ${realtimeHealth.reconnectQualityScore}.`,
        command:
          realtimeHealth.commands[1] ??
          realtimeHealth.commands[0] ??
          "Export realtime health evidence.",
        latestAt: realtimeHealth.generatedAt,
      }),
    ],
  });
}

function getEvidenceBundleRunbook({
  dataLossPrevention,
  releaseArchiveRetention,
  selfHostedSyncDiagnostics,
}: {
  dataLossPrevention: AdminDataLossPreventionReport;
  releaseArchiveRetention: AdminReleaseArchiveRetentionReport;
  selfHostedSyncDiagnostics: SelfHostedSyncDiagnosticReport;
}): AdminAutomationRunbook {
  return createRunbook({
    category: "evidence-bundle",
    title: "Evidence bundles",
    objective:
      "Keep release archive, DLP, and self-hosted sync evidence exportable for audits and future operators.",
    cadence: "Before release approval",
    owner: "Release evidence owner",
    evidenceBundle: "release-evidence-bundle",
    rows: [
      createRow({
        id: "bundle-release-archive",
        category: "evidence-bundle",
        status: releaseArchiveRetention.status,
        label: "Release archive bundle",
        cadence: "Before release approval",
        owner: "Release evidence owner",
        evidence: `${releaseArchiveRetention.itemCount} archive items, ${releaseArchiveRetention.expiredCount} expired items, and ${releaseArchiveRetention.searchableCount} searchable evidence records.`,
        command:
          releaseArchiveRetention.commands[0] ??
          "Export release archive retention evidence.",
        latestAt: releaseArchiveRetention.generatedAt,
      }),
      createRow({
        id: "bundle-dlp",
        category: "evidence-bundle",
        status: dataLossPrevention.status,
        label: "DLP evidence bundle",
        cadence: "Before external handoff",
        owner: "Security reviewer",
        evidence: `${dataLossPrevention.rows.length} DLP rows and ${dataLossPrevention.workflows.length} workflows available for export.`,
        command: "Export Admin > Governance data-loss prevention Markdown.",
        latestAt: dataLossPrevention.generatedAt,
      }),
      createRow({
        id: "bundle-self-hosted-sync",
        category: "evidence-bundle",
        status: selfHostedSyncDiagnostics.status,
        label: "Self-hosted sync bundle",
        cadence: "Before self-hosted package handoff",
        owner: "Self-hosted operator",
        evidence: `${selfHostedSyncDiagnostics.rows.length} sync diagnostics and ${selfHostedSyncDiagnostics.repairCommandCount} repair commands available for export.`,
        command: "Export Admin > Governance self-hosted sync diagnostics JSON.",
        latestAt: selfHostedSyncDiagnostics.generatedAt,
      }),
    ],
  });
}

function createRunbook({
  category,
  cadence,
  evidenceBundle,
  objective,
  owner,
  rows,
  title,
}: {
  category: AdminAutomationRunbookCategory;
  cadence: string;
  evidenceBundle: string;
  objective: string;
  owner: string;
  rows: AdminAutomationRunbookRow[];
  title: string;
}): AdminAutomationRunbook {
  const blockedSignalCount = rows.filter((row) => row.status === "blocked").length;
  const reviewSignalCount = rows.filter((row) => row.status === "review").length;
  const commands = uniqueStrings(rows.map((row) => row.command));

  return {
    id: `${category}-runbook`,
    category,
    status:
      blockedSignalCount > 0
        ? "blocked"
        : reviewSignalCount > 0
          ? "review"
          : "ready",
    title,
    objective,
    cadence,
    owner,
    rowCount: rows.length,
    commandCount: commands.length,
    blockedSignalCount,
    reviewSignalCount,
    evidenceBundle,
    rows,
    commands,
  };
}

function createRow(input: AdminAutomationRunbookRow) {
  return input;
}

function sortRows(
  first: AdminAutomationRunbookRow,
  second: AdminAutomationRunbookRow,
) {
  return (
    getStatusWeight(first.status) - getStatusWeight(second.status) ||
    first.category.localeCompare(second.category)
  );
}

function getStatusWeight(status: AdminAutomationRunbookStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => Boolean(item))));
}
