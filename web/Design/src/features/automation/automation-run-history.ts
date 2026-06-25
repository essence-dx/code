import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  AutomationRecipeId,
  AutomationRecipeSummary,
} from "@/features/automation/automation-recipes";
import { normalizeAutomationRecipeId } from "@/features/automation/automation-recipes";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";

export type AutomationRunHistoryStatus = "ready" | "review" | "blocked";
export type AutomationRunStatus = "ready" | "review" | "failed";
export type AutomationRunDiagnosticSeverity = "review" | "blocked";

export type AutomationRunDiagnostic = {
  id: string;
  severity: AutomationRunDiagnosticSeverity;
  title: string;
  detail: string;
};

export type AutomationRunScheduleVisibility = {
  id: string;
  title: string;
  status: ContentScheduleSummary["status"];
  scheduledAt: string;
  channel: string;
};

export type AutomationRunRetry = {
  available: boolean;
  recipeId: AutomationRecipeId | null;
  targetId: string | null;
  scheduledFor: string | null;
  cadenceDays: number | null;
  label: string;
};

export type AutomationRunHistoryItem = {
  id: string;
  recipeId: AutomationRecipeId;
  recipeTitle: string;
  targetId: string;
  ownerEmail: string | null;
  createdAt: string;
  summary: string;
  createdCount: number;
  status: AutomationRunStatus;
  retry: AutomationRunRetry;
  diagnostics: AutomationRunDiagnostic[];
  scheduleVisibility: AutomationRunScheduleVisibility[];
  auditLog: WorkspaceAuditLogSummary;
};

export type AutomationRecoveryPacket = {
  id: string;
  runId: string;
  recipeId: AutomationRecipeId;
  targetId: string;
  status: AutomationRunStatus;
  summary: string;
  auditLogIds: string[];
  diagnostics: AutomationRunDiagnostic[];
  retry: AutomationRunRetry;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type AutomationRunHistoryCenter = {
  status: AutomationRunHistoryStatus;
  score: number;
  runs: AutomationRunHistoryItem[];
  recoveryPackets: AutomationRecoveryPacket[];
  nextActions: string[];
  totals: {
    runs: number;
    failedRuns: number;
    reviewRuns: number;
    retryableRuns: number;
    scheduledItems: number;
    recoveryPackets: number;
  };
};

export type AutomationRunHistoryInput = {
  automationRecipes: AutomationRecipeSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  serverExportJobs: ServerExportJobSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  now?: string;
};

export function createAutomationRunHistoryCenter(
  input: AutomationRunHistoryInput,
): AutomationRunHistoryCenter {
  const recipeById = new Map(
    input.automationRecipes.map((recipe) => [recipe.id, recipe]),
  );
  const runs = input.auditLogs
    .filter((log) => log.action === "automation.recipe.applied")
    .map((log) =>
      createRunHistoryItem({
        log,
        recipeById,
        exportJobs: input.serverExportJobs,
        scheduleItems: input.contentScheduleItems,
      }),
    )
    .filter((run): run is AutomationRunHistoryItem => Boolean(run))
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    .slice(0, 12);
  const recoveryPackets = runs
    .filter((run) => run.status !== "ready")
    .map(createRecoveryPacket);
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const reviewRuns = runs.filter((run) => run.status === "review").length;
  const retryableRuns = runs.filter((run) => run.retry.available).length;
  const status = failedRuns ? "blocked" : reviewRuns ? "review" : "ready";

  return {
    status,
    score: scoreRunHistory({ failedRuns, reviewRuns, retryableRuns }),
    runs,
    recoveryPackets,
    nextActions: recoveryPackets.slice(0, 5).map((packet) => {
      const run = runs.find((item) => item.id === packet.runId);

      return `${run?.recipeTitle ?? packet.recipeId}: ${packet.retry.label}`;
    }),
    totals: {
      runs: runs.length,
      failedRuns,
      reviewRuns,
      retryableRuns,
      scheduledItems: runs.reduce(
        (total, run) => total + run.scheduleVisibility.length,
        0,
      ),
      recoveryPackets: recoveryPackets.length,
    },
  };
}

function createRunHistoryItem(input: {
  log: WorkspaceAuditLogSummary;
  recipeById: Map<AutomationRecipeId, AutomationRecipeSummary>;
  exportJobs: ServerExportJobSummary[];
  scheduleItems: ContentScheduleSummary[];
}): AutomationRunHistoryItem | null {
  const recipeId = normalizeRecipeId(
    input.log.metadata.recipeId ?? input.log.targetId,
  );

  if (!recipeId) return null;

  const recipe = input.recipeById.get(recipeId);
  const targetId = String(input.log.metadata.targetId ?? "");

  if (!targetId) return null;

  const diagnostics = createDiagnostics({
    recipeId,
    targetId,
    log: input.log,
    exportJobs: input.exportJobs,
    scheduleItems: input.scheduleItems,
  });
  const status = createRunStatus(diagnostics);
  const scheduleVisibility = createScheduleVisibility({
    recipeId,
    targetId,
    scheduleItems: input.scheduleItems,
  });
  const retry = createRetry({
    recipeId,
    targetId,
    status,
    log: input.log,
    recipe,
  });

  return {
    id: input.log.id,
    recipeId,
    recipeTitle: recipe?.title ?? humanizeRecipeId(recipeId),
    targetId,
    ownerEmail: input.log.actorEmail,
    createdAt: input.log.createdAt,
    summary: input.log.summary,
    createdCount: readNumber(input.log.metadata.createdCount),
    status,
    retry,
    diagnostics,
    scheduleVisibility,
    auditLog: input.log,
  };
}

function createDiagnostics(input: {
  recipeId: AutomationRecipeId;
  targetId: string;
  log: WorkspaceAuditLogSummary;
  exportJobs: ServerExportJobSummary[];
  scheduleItems: ContentScheduleSummary[];
}): AutomationRunDiagnostic[] {
  const diagnostics: AutomationRunDiagnostic[] = [];
  const createdCount = readNumber(input.log.metadata.createdCount);

  if (createdCount <= 0) {
    diagnostics.push({
      id: `${input.log.id}-empty`,
      severity: "blocked",
      title: "No artifacts created",
      detail: "The automation audit event did not create any downstream work.",
    });
  }

  if (input.recipeId === "scheduled-export") {
    const relatedExports = input.exportJobs.filter(
      (job) => job.projectId === input.targetId,
    );
    const failedExports = relatedExports.filter(
      (job) => job.status === "failed",
    );

    if (failedExports.length) {
      diagnostics.push(
        ...failedExports.slice(0, 3).map((job) => ({
          id: job.id,
          severity: "blocked" as const,
          title: `${job.formatLabel} export failed`,
          detail:
            job.failureMessage ??
            `${job.fileName} failed and needs an export retry.`,
        })),
      );
    }

    if (!relatedExports.length) {
      diagnostics.push({
        id: `${input.log.id}-missing-export`,
        severity: "review",
        title: "Export job missing",
        detail: "No durable export job is visible for this automation target.",
      });
    }
  }

  if (input.recipeId === "publishing-reminder") {
    const visibleSchedule = input.scheduleItems.some(
      (item) => item.projectId === input.targetId,
    );

    if (!visibleSchedule) {
      diagnostics.push({
        id: `${input.log.id}-missing-schedule`,
        severity: "review",
        title: "Schedule visibility missing",
        detail:
          "No content planner item is visible for this publishing reminder.",
      });
    }
  }

  return diagnostics;
}

function createScheduleVisibility(input: {
  recipeId: AutomationRecipeId;
  targetId: string;
  scheduleItems: ContentScheduleSummary[];
}): AutomationRunScheduleVisibility[] {
  if (
    input.recipeId === "scheduled-export" ||
    input.recipeId === "review-nudge"
  ) {
    return input.scheduleItems
      .filter((item) => item.projectId === input.targetId)
      .slice(0, 3)
      .map(toScheduleVisibility);
  }

  if (input.recipeId === "publishing-reminder") {
    return input.scheduleItems
      .filter((item) => item.projectId === input.targetId)
      .slice(0, 5)
      .map(toScheduleVisibility);
  }

  return input.scheduleItems
    .filter((item) => item.caption.toLowerCase().includes("automation cadence"))
    .slice(0, 5)
    .map(toScheduleVisibility);
}

function createRetry(input: {
  recipeId: AutomationRecipeId;
  targetId: string;
  status: AutomationRunStatus;
  log: WorkspaceAuditLogSummary;
  recipe: AutomationRecipeSummary | undefined;
}): AutomationRunRetry {
  const available = input.status !== "ready";

  return {
    available,
    recipeId: available ? input.recipeId : null,
    targetId: available ? input.targetId : null,
    scheduledFor:
      stringOrNull(input.log.metadata.startAt) ??
      stringOrNull(input.log.metadata.scheduledFor) ??
      input.recipe?.defaultStartAt ??
      null,
    cadenceDays: numberOrNull(input.log.metadata.cadenceDays),
    label: available
      ? `Retry ${input.recipe?.title ?? humanizeRecipeId(input.recipeId)} for ${input.targetId}.`
      : "No retry needed.",
  };
}

function createRecoveryPacket(
  run: AutomationRunHistoryItem,
): AutomationRecoveryPacket {
  const summary = `${run.recipeTitle}: ${run.summary}`;
  const payload = {
    kind: "essence-studio.automation-recovery-packet",
    version: 1,
    runId: run.id,
    recipeId: run.recipeId,
    targetId: run.targetId,
    ownerEmail: run.ownerEmail,
    status: run.status,
    summary,
    auditLogIds: [run.auditLog.id],
    diagnostics: run.diagnostics,
    retry: run.retry,
    scheduleVisibility: run.scheduleVisibility,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `recovery-${run.id}`,
    runId: run.id,
    recipeId: run.recipeId,
    targetId: run.targetId,
    status: run.status,
    summary,
    auditLogIds: [run.auditLog.id],
    diagnostics: run.diagnostics,
    retry: run.retry,
    download: {
      fileName: `automation-recovery-${slugify(run.recipeId)}-${slugify(
        run.targetId,
      )}.json`,
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function toScheduleVisibility(
  item: ContentScheduleSummary,
): AutomationRunScheduleVisibility {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    scheduledAt: item.scheduledAt,
    channel: item.channel,
  };
}

function createRunStatus(
  diagnostics: AutomationRunDiagnostic[],
): AutomationRunStatus {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "blocked")) {
    return "failed";
  }

  if (diagnostics.length) return "review";

  return "ready";
}

function scoreRunHistory(input: {
  failedRuns: number;
  reviewRuns: number;
  retryableRuns: number;
}) {
  const penalty =
    input.failedRuns * 24 + input.reviewRuns * 10 + input.retryableRuns * 5;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function normalizeRecipeId(value: unknown): AutomationRecipeId | null {
  return normalizeAutomationRecipeId(value);
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: unknown) {
  const stringValue = String(value ?? "").trim();

  return stringValue || null;
}

function humanizeRecipeId(value: AutomationRecipeId) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "automation"
  );
}
