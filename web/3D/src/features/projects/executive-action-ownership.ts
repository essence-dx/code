import type { ExecutiveReleaseIntelligenceDomain, ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceSignal } from "@/features/projects/executive-release-intelligence";
import type { WorkspaceReleaseRunbookRecord, WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarMilestone, WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

export type ExecutiveActionOwnershipEvidenceKind = "calendar" | "executive" | "runbook";
export type ExecutiveActionOwnershipStatus = "blocked" | "overdue" | "ready" | "watch";

export interface ExecutiveActionOwnershipEvidenceLink {
  href: string;
  kind: ExecutiveActionOwnershipEvidenceKind;
  label: string;
  sourceId: string;
}

export interface ExecutiveActionOwnershipRow {
  action: string;
  detail: string;
  domain: ExecutiveReleaseIntelligenceDomain;
  dueAt: string;
  dueWindowLabel: string;
  evidenceLinks: ExecutiveActionOwnershipEvidenceLink[];
  id: string;
  ownerEmail: string | null;
  ownerName: string;
  ownerSource: "hint" | "runbook";
  projectName: string | null;
  riskScore: number;
  signalLabel: string;
  status: ExecutiveActionOwnershipStatus;
}

export interface ExecutiveActionOwnershipMatrix {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: ExecutiveActionOwnershipRow[];
  summary: {
    blockedCount: number;
    dueSoonCount: number;
    nextAction: string;
    overdueCount: number;
    ownerCoveragePercent: number;
    ownershipScore: number;
    readyCount: number;
    status: ExecutiveActionOwnershipStatus;
    totalCount: number;
    unassignedCount: number;
    watchCount: number;
  };
}

export interface CreateExecutiveActionOwnershipMatrixInput {
  executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport;
  generatedAt?: string;
  releaseCalendar: WorkspaceReleaseCalendarReport;
  releaseRunbook: WorkspaceReleaseRunbookReport;
  workspaceId?: string;
}

const statusRank: Record<ExecutiveActionOwnershipStatus, number> = {
  blocked: 0,
  overdue: 1,
  watch: 2,
  ready: 3,
};

const runbookStatusRank: Record<WorkspaceReleaseRunbookRecord["status"], number> = {
  blocked: 0,
  "in-progress": 1,
  scheduled: 2,
  complete: 3,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
      .slice(0, 64) || "workspace"
  );
}

function toTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function addHours(value: string, hours: number) {
  return new Date(toTime(value) + hours * 60 * 60 * 1000).toISOString();
}

function dueAtForSignal(signal: ExecutiveReleaseIntelligenceSignal, generatedAt: string) {
  if (signal.updatedAt && toTime(signal.updatedAt) > 0) {
    return addHours(signal.updatedAt, signal.status === "blocked" ? 24 : 72);
  }

  return addHours(generatedAt, signal.status === "blocked" ? 24 : 72);
}

function formatDueWindow(dueAt: string, generatedAt: string) {
  const deltaMs = toTime(dueAt) - toTime(generatedAt);
  const absHours = Math.max(1, Math.round(Math.abs(deltaMs) / (60 * 60 * 1000)));
  const unitValue = absHours >= 48 ? Math.round(absHours / 24) : absHours;
  const unit = absHours >= 48 ? "d" : "h";

  return deltaMs < 0 ? `Overdue by ${unitValue}${unit}` : `Due in ${unitValue}${unit}`;
}

function isAssigned(record: WorkspaceReleaseRunbookRecord | null | undefined, ownerEmail: string | null) {
  return Boolean(record?.ownerUserId || ownerEmail);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasTextMatch(record: Pick<WorkspaceReleaseRunbookRecord, "detail" | "sourceKey" | "title">, signal: ExecutiveReleaseIntelligenceSignal) {
  const haystack = normalize([record.sourceKey, record.title, record.detail].join(" "));
  const labelWords = normalize(signal.label)
    .split(" ")
    .filter((word) => word.length > 4);

  return labelWords.length > 0 && labelWords.some((word) => haystack.includes(word));
}

function findRunbookRecord(signal: ExecutiveReleaseIntelligenceSignal, report: WorkspaceReleaseRunbookReport) {
  const records = report.records
    .filter((record) => record.status !== "complete")
    .sort((first, second) => runbookStatusRank[first.status] - runbookStatusRank[second.status] || toTime(first.dueAt) - toTime(second.dueAt));

  return (
    records.find((record) => record.sourceKey === signal.id || record.milestoneId === signal.id) ??
    records.find((record) => hasTextMatch(record, signal)) ??
    null
  );
}

function findMilestone(signal: ExecutiveReleaseIntelligenceSignal, report: WorkspaceReleaseCalendarReport) {
  return report.milestones.find((milestone) => milestone.sourceKey === signal.id || milestone.id === signal.id) ?? null;
}

function executiveHref(workspaceId: string) {
  return `/projects?workspaceId=${encodeURIComponent(workspaceId)}#executive-release-intelligence`;
}

function calendarHref(workspaceId: string, milestone: WorkspaceReleaseCalendarMilestone | null) {
  const params = new URLSearchParams({ workspaceId });

  if (milestone?.sourceKey) {
    params.set("calendarSource", milestone.sourceKey);
  }

  return `/projects?${params.toString()}#release-calendar`;
}

function runbookHref(workspaceId: string, record: WorkspaceReleaseRunbookRecord | null) {
  if (record?.auditLogHref) {
    return record.auditLogHref;
  }

  return `/projects?workspaceId=${encodeURIComponent(workspaceId)}#release-runbook`;
}

function evidenceLinks(input: {
  record: WorkspaceReleaseRunbookRecord | null;
  signal: ExecutiveReleaseIntelligenceSignal;
  milestone: WorkspaceReleaseCalendarMilestone | null;
  workspaceId: string;
}): ExecutiveActionOwnershipEvidenceLink[] {
  const links: ExecutiveActionOwnershipEvidenceLink[] = [
    {
      href: executiveHref(input.workspaceId),
      kind: "executive",
      label: "Executive signal",
      sourceId: input.signal.id,
    },
  ];

  if (input.record) {
    links.push({
      href: runbookHref(input.workspaceId, input.record),
      kind: "runbook",
      label: "Runbook evidence",
      sourceId: input.record.sourceKey,
    });
  }

  if (input.milestone) {
    links.push({
      href: calendarHref(input.workspaceId, input.milestone),
      kind: "calendar",
      label: "Release calendar",
      sourceId: input.milestone.sourceKey,
    });
  }

  return links;
}

function rowStatus(input: {
  assigned: boolean;
  dueAt: string;
  generatedAt: string;
  record: WorkspaceReleaseRunbookRecord | null;
  signalStatus: ExecutiveReleaseIntelligenceSignal["status"];
}) {
  if (toTime(input.dueAt) < toTime(input.generatedAt)) {
    return "overdue";
  }

  if (input.signalStatus === "blocked" || input.record?.status === "blocked") {
    return "blocked";
  }

  if (!input.assigned || input.signalStatus === "watch" || input.record?.status === "in-progress" || input.record?.status === "scheduled") {
    return "watch";
  }

  return "ready";
}

function riskScore(status: ExecutiveActionOwnershipStatus, assigned: boolean, evidenceCount: number) {
  const statusScore: Record<ExecutiveActionOwnershipStatus, number> = {
    blocked: 35,
    overdue: 25,
    ready: 100,
    watch: 70,
  };

  return clampScore(statusScore[status] - (assigned ? 0 : 18) + Math.min(8, evidenceCount * 2));
}

function createExecutiveRow(input: {
  generatedAt: string;
  record: WorkspaceReleaseRunbookRecord | null;
  milestone: WorkspaceReleaseCalendarMilestone | null;
  signal: ExecutiveReleaseIntelligenceSignal;
  workspaceId: string;
}): ExecutiveActionOwnershipRow {
  const ownerEmail = input.record?.ownerEmail ?? null;
  const assigned = isAssigned(input.record, ownerEmail);
  const dueAt = input.record?.dueAt ?? input.milestone?.dueAt ?? dueAtForSignal(input.signal, input.generatedAt);
  const links = evidenceLinks(input);
  const status = rowStatus({
    assigned,
    dueAt,
    generatedAt: input.generatedAt,
    record: input.record,
    signalStatus: input.signal.status,
  });

  return {
    action: input.record?.status === "blocked" ? input.record.checklistEvidence[0] ?? input.signal.nextAction : input.signal.nextAction,
    detail: input.record?.detail ?? input.signal.detail,
    domain: input.signal.domain,
    dueAt,
    dueWindowLabel: formatDueWindow(dueAt, input.generatedAt),
    evidenceLinks: links,
    id: `executive:${input.signal.id}`,
    ownerEmail,
    ownerName: input.record?.ownerName && input.record.ownerName !== "Unassigned" ? input.record.ownerName : input.signal.ownerHint,
    ownerSource: input.record ? "runbook" : "hint",
    projectName: input.record?.projectName ?? input.milestone?.projectName ?? null,
    riskScore: riskScore(status, assigned, links.length),
    signalLabel: input.signal.label,
    status,
  };
}

function domainForRunbookRecord(record: WorkspaceReleaseRunbookRecord): ExecutiveReleaseIntelligenceDomain {
  if (/webhook|automation|delivery/i.test(`${record.title} ${record.detail} ${record.sourceKey}`)) {
    return "automation";
  }

  if (/policy|governance|review/i.test(`${record.title} ${record.detail} ${record.sourceKey}`)) {
    return "governance";
  }

  if (/risk|incident/i.test(`${record.title} ${record.detail} ${record.sourceKey}`)) {
    return "risk";
  }

  return "launch";
}

function createRunbookOnlyRow(input: {
  generatedAt: string;
  record: WorkspaceReleaseRunbookRecord;
  workspaceId: string;
}): ExecutiveActionOwnershipRow {
  const assigned = isAssigned(input.record, input.record.ownerEmail);
  const status = rowStatus({
    assigned,
    dueAt: input.record.dueAt,
    generatedAt: input.generatedAt,
    record: input.record,
    signalStatus: input.record.status === "blocked" ? "blocked" : "watch",
  });
  const links: ExecutiveActionOwnershipEvidenceLink[] = [
    {
      href: runbookHref(input.workspaceId, input.record),
      kind: "runbook",
      label: "Runbook evidence",
      sourceId: input.record.sourceKey,
    },
    {
      href: calendarHref(input.workspaceId, null),
      kind: "calendar",
      label: "Release calendar",
      sourceId: input.record.milestoneId,
    },
  ];

  return {
    action: input.record.checklistEvidence[0] ?? input.record.detail,
    detail: input.record.detail,
    domain: domainForRunbookRecord(input.record),
    dueAt: input.record.dueAt,
    dueWindowLabel: formatDueWindow(input.record.dueAt, input.generatedAt),
    evidenceLinks: links,
    id: `runbook:${input.record.sourceKey}`,
    ownerEmail: input.record.ownerEmail,
    ownerName: input.record.ownerName,
    ownerSource: "runbook",
    projectName: input.record.projectName,
    riskScore: riskScore(status, assigned, links.length),
    signalLabel: input.record.title,
    status,
  };
}

function createCsv(rows: ExecutiveActionOwnershipRow[]) {
  const header = ["owner_name", "owner_email", "domain", "status", "due_at", "due_window", "action", "evidence_links"];
  const csvRows = rows.map((row) =>
    [
      row.ownerName,
      row.ownerEmail,
      row.domain,
      row.status,
      row.dueAt,
      row.dueWindowLabel,
      row.action,
      row.evidenceLinks.map((link) => `${link.label}: ${link.href}`).join(" | "),
    ]
      .map((value) => escapeCsvValue(value))
      .join(","),
  );

  return [header.join(","), ...csvRows].join("\n");
}

function sortRows(first: ExecutiveActionOwnershipRow, second: ExecutiveActionOwnershipRow) {
  return statusRank[first.status] - statusRank[second.status] || first.riskScore - second.riskScore || toTime(first.dueAt) - toTime(second.dueAt) || first.signalLabel.localeCompare(second.signalLabel);
}

function summarizeRows(rows: ExecutiveActionOwnershipRow[]): ExecutiveActionOwnershipMatrix["summary"] {
  const unassignedCount = rows.filter((row) => !row.ownerEmail).length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const overdueCount = rows.filter((row) => row.status === "overdue").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const dueSoonCount = rows.filter((row) => row.status !== "ready" && row.dueWindowLabel.startsWith("Due in")).length;
  const ownerCoveragePercent = rows.length > 0 ? Math.round(((rows.length - unassignedCount) / rows.length) * 100) : 100;
  const ownershipScore = clampScore(100 - blockedCount * 18 - overdueCount * 22 - unassignedCount * 13 - watchCount * 6);
  const status: ExecutiveActionOwnershipStatus = blockedCount > 0 ? "blocked" : overdueCount > 0 ? "overdue" : watchCount > 0 || unassignedCount > 0 ? "watch" : "ready";

  return {
    blockedCount,
    dueSoonCount,
    nextAction:
      unassignedCount > 0
        ? "Assign owners to every executive action and attach runbook evidence before the release window."
        : blockedCount > 0 || overdueCount > 0
          ? rows[0]?.action ?? "Resolve blocked executive actions."
          : watchCount > 0
            ? "Review watched owner actions before promotion."
            : "Owner accountability is ready for executive sign-off.",
    overdueCount,
    ownerCoveragePercent,
    ownershipScore,
    readyCount,
    status,
    totalCount: rows.length,
    unassignedCount,
    watchCount,
  };
}

export function createExecutiveActionOwnershipMatrix(input: CreateExecutiveActionOwnershipMatrixInput): ExecutiveActionOwnershipMatrix {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const actionSignals = input.executiveReleaseIntelligence.signals.filter((signal) => signal.status !== "ready");
  const executiveRows = actionSignals.map((signal) =>
    createExecutiveRow({
      generatedAt,
      milestone: findMilestone(signal, input.releaseCalendar),
      record: findRunbookRecord(signal, input.releaseRunbook),
      signal,
      workspaceId,
    }),
  );
  const coveredRunbookKeys = new Set(
    executiveRows.flatMap((row) => row.evidenceLinks.filter((link) => link.kind === "runbook").map((link) => link.sourceId)),
  );
  const runbookRows = input.releaseRunbook.records
    .filter((record) => record.status !== "complete" && !coveredRunbookKeys.has(record.sourceKey))
    .map((record) =>
      createRunbookOnlyRow({
        generatedAt,
        record,
        workspaceId,
      }),
    );
  const rows = [...executiveRows, ...runbookRows].sort(sortRows);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-executive-action-ownership.csv`,
    generatedAt,
    rows,
    summary: summarizeRows(rows),
  };
}
