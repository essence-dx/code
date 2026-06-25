export type BoardOperationsControlStatus = "blocked" | "ready" | "watch";
export type BoardOperationsControlId = "agenda-readiness" | "closeout-report" | "packet-status" | "route-health" | "saved-review-cycles";

export interface BoardOperationsReviewCycle {
  id: string;
  label: string;
  owner: string;
  savedAt: string;
  status: BoardOperationsControlStatus;
}

export interface BoardOperationsControlRow {
  detail: string;
  id: BoardOperationsControlId;
  label: string;
  nextAction: string;
  owner: string;
  score: number;
  status: BoardOperationsControlStatus;
}

export interface BoardOperationsControlCenterReport {
  closeoutReport: string;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardOperationsControlRow[];
  summary: {
    blockedCount: number;
    controlScore: number;
    readyCount: number;
    rowCount: number;
    savedReviewCycleCount: number;
    status: BoardOperationsControlStatus;
    watchCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardOperationsControlCenterInput {
  agenda: {
    summary: {
      blockedItemCount: number;
      estimatedDurationMinutes: number;
      readyItemCount: number;
      status: BoardOperationsControlStatus;
      totalItemCount: number;
      watchItemCount: number;
    };
  } | null;
  auditExport: {
    auditId: string;
    summary: {
      auditScore: number;
      blockedSectionCount: number;
      pendingAcknowledgementCount: number;
      retryNeededCount: number;
      sectionCount: number;
      status: BoardOperationsControlStatus;
      watchSectionCount: number;
    };
  } | null;
  generatedAt?: string;
  packetHistory: {
    summary: {
      activeCount: number;
      blockedPacketCount: number;
      latestSavedAt: string | null;
      readyPacketCount: number;
      revokedCount: number;
      totalCount: number;
      watchPacketCount: number;
    };
  } | null;
  reviewCycles?: BoardOperationsReviewCycle[];
  routing: {
    summary: {
      eligibleRouteCount: number;
      notificationCount: number;
      routingScore: number;
      status: "critical" | "info" | "warning";
      suppressedByPreferenceCount: number;
      suppressedByRoleCount: number;
    };
  } | null;
  scenarioForecast: {
    summary: {
      blockedCount: number;
      forecastScore: number;
      highestRiskPercent: number;
      readyCount: number;
      rowCount: number;
      status: BoardOperationsControlStatus;
      watchCount: number;
    };
  } | null;
  workspaceId?: string;
}

const statusRank: Record<BoardOperationsControlStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const rowPriority: Record<BoardOperationsControlId, number> = {
  "closeout-report": 0,
  "agenda-readiness": 1,
  "packet-status": 2,
  "route-health": 3,
  "saved-review-cycles": 4,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function routeStatus(status: "critical" | "info" | "warning"): BoardOperationsControlStatus {
  if (status === "critical") {
    return "blocked";
  }

  return status === "warning" ? "watch" : "ready";
}

function savedReviewCycleRow(cycles: BoardOperationsReviewCycle[]): BoardOperationsControlRow {
  const blockedCount = cycles.filter((cycle) => cycle.status === "blocked").length;
  const watchCount = cycles.filter((cycle) => cycle.status === "watch").length;
  const status: BoardOperationsControlStatus = cycles.length === 0 || blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";

  return {
    detail:
      cycles.length > 0
        ? `${cycles.length} saved review cycle${cycles.length === 1 ? "" : "s"}, latest ${cycles[0]?.label ?? "cycle"} owned by ${cycles[0]?.owner ?? "board owner"}.`
        : "No saved board review cycle exists for the current closeout.",
    id: "saved-review-cycles",
    label: "Saved review cycles",
    nextAction: cycles.length > 0 ? "Keep saved review cycles refreshed during closeout." : "Create a saved board review cycle before closeout.",
    owner: cycles[0]?.owner ?? "Board operations",
    score: cycles.length > 0 ? clamp(100 - blockedCount * 35 - watchCount * 15) : 40,
    status,
  };
}

function agendaRow(input: CreateBoardOperationsControlCenterInput): BoardOperationsControlRow {
  const summary = input.agenda?.summary;
  const blocked = summary?.blockedItemCount ?? 0;
  const watch = summary?.watchItemCount ?? 0;
  const ready = summary?.readyItemCount ?? 0;
  const score = input.agenda ? clamp(100 - blocked * 16 - watch * 10) : 35;

  return {
    detail: input.agenda
      ? `${ready}/${summary?.totalItemCount ?? 0} agenda items ready, ${blocked} blocked, ${watch} watch, ${summary?.estimatedDurationMinutes ?? 0} minutes.`
      : "No board agenda is attached to the control center.",
    id: "agenda-readiness",
    label: "Agenda readiness",
    nextAction: blocked > 0 ? "Clear blocked agenda items before the board cycle closes." : "Archive the ready agenda with the closeout packet.",
    owner: "Board chair",
    score,
    status: input.agenda?.summary.status ?? "blocked",
  };
}

function packetRow(input: CreateBoardOperationsControlCenterInput): BoardOperationsControlRow {
  const summary = input.packetHistory?.summary;
  const total = summary?.totalCount ?? 0;
  const blocked = summary?.blockedPacketCount ?? 0;
  const active = summary?.activeCount ?? 0;
  const score = input.packetHistory ? clamp(active * 80 - blocked * 35 + (summary?.readyPacketCount ?? 0) * 10 - (summary?.revokedCount ?? 0) * 10) : 30;
  const status: BoardOperationsControlStatus = !summary || total === 0 || blocked > 0 ? "blocked" : (summary.watchPacketCount > 0 ? "watch" : "ready");

  return {
    detail: summary ? `${active} active packet${active === 1 ? "" : "s"}, ${blocked} blocked, latest saved ${summary.latestSavedAt ?? "not saved"}.` : "No saved board packet history exists.",
    id: "packet-status",
    label: "Packet status",
    nextAction: status === "blocked" ? "Save or unblock the board packet before closeout." : "Keep packet status attached to the review cycle.",
    owner: "Packet owner",
    score,
    status,
  };
}

function routeRow(input: CreateBoardOperationsControlCenterInput): BoardOperationsControlRow {
  const summary = input.routing?.summary;
  const suppressed = (summary?.suppressedByPreferenceCount ?? 0) + (summary?.suppressedByRoleCount ?? 0);
  const score = input.routing ? clamp((summary?.routingScore ?? 0) - suppressed * 8) : 35;

  return {
    detail: summary
      ? `${summary.eligibleRouteCount} eligible route${summary.eligibleRouteCount === 1 ? "" : "s"}, ${suppressed} suppressed, ${summary.notificationCount} notification${summary.notificationCount === 1 ? "" : "s"}.`
      : "No board notification routing report is attached.",
    id: "route-health",
    label: "Route health",
    nextAction: routeStatus(summary?.status ?? "critical") === "blocked" ? "Resolve critical board notification routing before closeout." : "Archive route health with the closeout report.",
    owner: "Notification owner",
    score,
    status: routeStatus(summary?.status ?? "critical"),
  };
}

function closeoutRow(input: CreateBoardOperationsControlCenterInput): BoardOperationsControlRow {
  const audit = input.auditExport?.summary;
  const forecast = input.scenarioForecast?.summary;
  const blocked = (audit?.blockedSectionCount ?? 0) + (forecast?.blockedCount ?? 0);
  const watch = (audit?.watchSectionCount ?? 0) + (forecast?.watchCount ?? 0);
  const score = clamp(((audit?.auditScore ?? 40) + (forecast?.forecastScore ?? 40)) / 2 - blocked);

  return {
    detail: audit
      ? `${audit.blockedSectionCount} blocked audit section${audit.blockedSectionCount === 1 ? "" : "s"}, ${audit.pendingAcknowledgementCount} pending acknowledgement${audit.pendingAcknowledgementCount === 1 ? "" : "s"}, ${forecast?.highestRiskPercent ?? 0}% top forecast risk.`
      : "No board assurance audit export is attached.",
    id: "closeout-report",
    label: "Closeout report",
    nextAction: blocked > 0 ? "Close blocked audit export sections and forecast risks before final board closeout." : "Publish the final board operations closeout report.",
    owner: "Board operations",
    score,
    status: !audit || blocked > 0 ? "blocked" : watch > 0 ? "watch" : "ready",
  };
}

function createRows(input: CreateBoardOperationsControlCenterInput) {
  const reviewCycles = [...(input.reviewCycles ?? [])].sort((first, second) => second.savedAt.localeCompare(first.savedAt) || first.id.localeCompare(second.id));
  const rows = [savedReviewCycleRow(reviewCycles), agendaRow(input), packetRow(input), routeRow(input), closeoutRow(input)];

  return rows.sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.score - second.score ||
      rowPriority[first.id] - rowPriority[second.id],
  );
}

function createSummary(rows: BoardOperationsControlRow[], savedReviewCycleCount: number): BoardOperationsControlCenterReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: BoardOperationsControlStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    blockedCount,
    controlScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    nextAction: status === "ready" ? "Archive the board operations control center closeout report." : (nextRow?.nextAction ?? "Review board operations controls before closeout."),
    readyCount,
    rowCount: rows.length,
    savedReviewCycleCount,
    status,
    watchCount,
  };
}

function createCloseoutReport(input: {
  generatedAt: string;
  reviewCycles: BoardOperationsReviewCycle[];
  rows: BoardOperationsControlRow[];
  summary: BoardOperationsControlCenterReport["summary"];
  workspaceId: string;
}) {
  const cycleLine =
    input.reviewCycles.length > 0
      ? input.reviewCycles.map((cycle) => `${cycle.label} (${cycle.status}, owner ${cycle.owner})`).join("; ")
      : "No saved review cycle.";
  const rowLine = input.rows.map((row) => `${row.label}: ${row.status} ${row.score}/100`).join("; ");

  return [
    `Board operations closeout for ${input.workspaceId}`,
    `Generated at ${input.generatedAt}`,
    `Saved cycles: ${cycleLine}`,
    `Overall: ${input.summary.status} ${input.summary.controlScore}/100`,
    `Controls: ${rowLine}`,
    `Next action: ${input.summary.nextAction}`,
  ].join("\n");
}

function createCsv(rows: BoardOperationsControlRow[]) {
  const header = ["control", "status", "score", "owner", "next_action"];
  const body = rows.map((row) => [row.id, row.status, row.score, row.owner, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardOperationsControlCenter(input: CreateBoardOperationsControlCenterInput): BoardOperationsControlCenterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const reviewCycles = [...(input.reviewCycles ?? [])].sort((first, second) => second.savedAt.localeCompare(first.savedAt) || first.id.localeCompare(second.id));
  const rows = createRows({ ...input, reviewCycles });
  const summary = createSummary(rows, reviewCycles.length);
  const closeoutReport = createCloseoutReport({ generatedAt, reviewCycles, rows, summary, workspaceId });
  const csvContent = createCsv(rows);

  return {
    closeoutReport,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-operations-control-center-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary,
    workspaceId,
  };
}
