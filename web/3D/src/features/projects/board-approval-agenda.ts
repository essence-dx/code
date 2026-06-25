import type { BoardApprovalPacketReport, BoardApprovalPacketSignOffRow, BoardApprovalPacketStatus } from "@/features/projects/board-approval-packet";
import type { ExecutiveActionOwnershipMatrix, ExecutiveActionOwnershipRow, ExecutiveActionOwnershipStatus } from "@/features/projects/executive-action-ownership";
import type { ReleaseControlRoomTimelineReport, ReleaseControlRoomTimelineRow, ReleaseControlRoomTimelineStatus } from "@/features/projects/release-control-room-timeline";
import type { ReleaseScenarioComparisonReport, ReleaseScenarioComparisonStatus } from "@/features/projects/release-scenario-comparison";

export type BoardApprovalAgendaStatus = "blocked" | "ready" | "watch";
export type BoardApprovalAgendaItemKind = "decision" | "owner-action" | "risk-review" | "scenario" | "timeline";

export interface BoardApprovalAgendaItem {
  decisionPrompt: string;
  dueAt: string | null;
  durationMinutes: number;
  evidence: string;
  href: string | null;
  id: string;
  kind: BoardApprovalAgendaItemKind;
  nextAction: string;
  ownerEmail: string | null;
  ownerName: string;
  priority: number;
  sourceId: string;
  sourceLabel: string;
  status: BoardApprovalAgendaStatus;
  topic: string;
}

export interface BoardApprovalAgendaAttendee {
  email: string | null;
  itemCount: number;
  name: string;
  required: boolean;
  role: string;
}

export interface BoardApprovalMeetingAgendaReport {
  attendees: BoardApprovalAgendaAttendee[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  items: BoardApprovalAgendaItem[];
  openingMemo: string;
  summary: {
    blockedItemCount: number;
    estimatedDurationMinutes: number;
    readyItemCount: number;
    requiredAttendeeCount: number;
    sourceCount: number;
    status: BoardApprovalAgendaStatus;
    topDecision: string;
    totalItemCount: number;
    watchItemCount: number;
  };
}

export interface CreateBoardApprovalMeetingAgendaInput {
  boardApprovalPacket: BoardApprovalPacketReport | null;
  executiveActionOwnership: ExecutiveActionOwnershipMatrix | null;
  generatedAt?: string;
  releaseControlRoomTimeline: ReleaseControlRoomTimelineReport | null;
  releaseScenarioComparison: ReleaseScenarioComparisonReport | null;
  workspaceId?: string;
}

const statusRank: Record<BoardApprovalAgendaStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const kindRank: Record<BoardApprovalAgendaItemKind, number> = {
  decision: 0,
  scenario: 1,
  timeline: 2,
  "owner-action": 3,
  "risk-review": 4,
};

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

function normalizeStatus(status: BoardApprovalPacketStatus | ExecutiveActionOwnershipStatus | ReleaseControlRoomTimelineStatus | ReleaseScenarioComparisonStatus): BoardApprovalAgendaStatus {
  return status === "overdue" ? "blocked" : status;
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function durationForStatus(status: BoardApprovalAgendaStatus, base: number) {
  if (status === "blocked") {
    return base + 4;
  }

  return status === "watch" ? base + 2 : base;
}

function ownerName(value: string | null | undefined, fallback = "Board owner") {
  const trimmed = value?.trim();

  return trimmed || fallback;
}

function signOffDecisionPrompt(signOff: BoardApprovalPacketSignOffRow) {
  if (signOff.status === "ready") {
    return `Confirm ${signOff.role} evidence remains valid for board sign-off.`;
  }

  return `Can the board approve ${signOff.role} with this gap open, or should approval stay blocked?`;
}

function signOffItem(signOff: BoardApprovalPacketSignOffRow): BoardApprovalAgendaItem {
  const status = normalizeStatus(signOff.status);

  return {
    decisionPrompt: signOffDecisionPrompt(signOff),
    dueAt: signOff.dueAt,
    durationMinutes: durationForStatus(status, signOff.required ? 8 : 5),
    evidence: signOff.evidenceHash,
    href: signOff.evidenceLinks[0] ?? null,
    id: `sign-off:${signOff.role}`,
    kind: "decision",
    nextAction: signOff.action,
    ownerEmail: signOff.ownerEmail,
    ownerName: signOff.ownerName,
    priority: signOff.status === "blocked" ? 0 : signOff.status === "watch" ? 2 : 6,
    sourceId: signOff.role,
    sourceLabel: "Board packet sign-off",
    status,
    topic: `${signOff.role[0].toUpperCase()}${signOff.role.slice(1)} approval sign-off`,
  };
}

function criticalPathItems(packet: BoardApprovalPacketReport | null): BoardApprovalAgendaItem[] {
  return (
    packet?.criticalPath
      .filter((row) => row.status !== "ready")
      .slice(0, 6)
      .map((row, index) => {
        const status = normalizeStatus(row.status);

        return {
          decisionPrompt: `Does ${row.label} block board approval for this release window?`,
          dueAt: null,
          durationMinutes: durationForStatus(status, 6),
          evidence: row.evidence,
          href: null,
          id: `critical-path:${row.id}`,
          kind: "risk-review" as const,
          nextAction: row.action,
          ownerEmail: null,
          ownerName: ownerName(row.ownerName),
          priority: row.status === "blocked" ? 1 + index : 8 + index,
          sourceId: row.id,
          sourceLabel: `Board packet ${row.source}`,
          status,
          topic: row.label,
        };
      }) ?? []
  );
}

function signOffItems(packet: BoardApprovalPacketReport | null): BoardApprovalAgendaItem[] {
  return packet?.signOffs.filter((row) => row.required || row.status !== "ready").map(signOffItem) ?? [];
}

function timelineItems(timeline: ReleaseControlRoomTimelineReport | null): BoardApprovalAgendaItem[] {
  return (
    timeline?.rows
      .filter((row) => row.status !== "ready")
      .slice(0, 6)
      .map((row, index) => {
        const status = normalizeStatus(row.status);

        return {
          decisionPrompt: `Should this ${row.kind} update change the board approval decision?`,
          dueAt: row.occurredAt,
          durationMinutes: durationForStatus(status, 5),
          evidence: row.evidence,
          href: row.href,
          id: `timeline:${row.id}`,
          kind: "timeline" as const,
          nextAction: row.nextAction,
          ownerEmail: row.ownerEmail,
          ownerName: ownerName(row.ownerName, "Release owner"),
          priority: row.status === "blocked" ? 3 + index : 12 + index,
          sourceId: row.id,
          sourceLabel: "Control room",
          status,
          topic: row.title,
        };
      }) ?? []
  );
}

function ownerActionItems(matrix: ExecutiveActionOwnershipMatrix | null): BoardApprovalAgendaItem[] {
  return (
    matrix?.rows
      .filter((row) => row.status !== "ready")
      .slice(0, 8)
      .map((row, index) => {
        const status = normalizeStatus(row.status);

        return {
          decisionPrompt: row.ownerEmail ? `Is ${row.ownerName} accountable for closing this action before approval?` : `Who owns ${row.signalLabel} before board approval can proceed?`,
          dueAt: row.dueAt,
          durationMinutes: durationForStatus(status, row.ownerEmail ? 5 : 7),
          evidence: row.detail,
          href: row.evidenceLinks[0]?.href ?? null,
          id: `owner-action:${row.id}`,
          kind: "owner-action" as const,
          nextAction: row.action,
          ownerEmail: row.ownerEmail,
          ownerName: row.ownerName,
          priority: row.status === "blocked" || row.status === "overdue" ? 4 + index : 16 + index,
          sourceId: row.id,
          sourceLabel: "Owner action",
          status,
          topic: row.signalLabel,
        };
      }) ?? []
  );
}

function scenarioItem(report: ReleaseScenarioComparisonReport | null): BoardApprovalAgendaItem[] {
  if (!report) {
    return [];
  }

  const status = normalizeStatus(report.recommendedScenario.status);

  return [
    {
      decisionPrompt: `Approve ${report.recommendedScenario.label} as the board release path?`,
      dueAt: report.generatedAt,
      durationMinutes: durationForStatus(status, 10),
      evidence: report.recommendedScenario.description,
      href: null,
      id: `scenario:${report.recommendedScenario.id}`,
      kind: "scenario",
      nextAction: report.recommendedScenario.nextAction,
      ownerEmail: null,
      ownerName: "Release board",
      priority: status === "blocked" ? 2 : 10,
      sourceId: report.recommendedScenario.id,
      sourceLabel: "Scenario comparison",
      status,
      topic: "Approve recommended release path",
    },
  ];
}

function dedupeItems(items: BoardApprovalAgendaItem[]) {
  const seen = new Set<string>();
  const unique: BoardApprovalAgendaItem[] = [];

  for (const item of items) {
    const signature = `${item.kind}:${item.topic.toLowerCase()}:${item.ownerName.toLowerCase()}`;

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(item);
    }
  }

  return unique.sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.priority - second.priority ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.topic.localeCompare(second.topic),
  );
}

function attendeeRole(item: BoardApprovalAgendaItem) {
  if (item.kind === "decision") {
    return "Sign-off owner";
  }

  if (item.kind === "scenario") {
    return "Board decision owner";
  }

  return item.sourceLabel;
}

function createAttendees(items: BoardApprovalAgendaItem[]): BoardApprovalAgendaAttendee[] {
  const attendeeMap = new Map<string, BoardApprovalAgendaAttendee>();

  for (const item of items) {
    const key = item.ownerEmail ?? `name:${item.ownerName.toLowerCase()}`;
    const existing = attendeeMap.get(key);

    if (existing) {
      existing.itemCount += 1;
      existing.required = existing.required || item.status !== "ready" || item.kind === "decision";
      continue;
    }

    attendeeMap.set(key, {
      email: item.ownerEmail,
      itemCount: 1,
      name: item.ownerName,
      required: item.status !== "ready" || item.kind === "decision",
      role: attendeeRole(item),
    });
  }

  return [...attendeeMap.values()].sort((first, second) => Number(second.required) - Number(first.required) || second.itemCount - first.itemCount || first.name.localeCompare(second.name));
}

function statusSummary(items: BoardApprovalAgendaItem[]): BoardApprovalMeetingAgendaReport["summary"] {
  const blockedItemCount = items.filter((item) => item.status === "blocked").length;
  const watchItemCount = items.filter((item) => item.status === "watch").length;
  const readyItemCount = items.filter((item) => item.status === "ready").length;
  const status: BoardApprovalAgendaStatus = blockedItemCount > 0 ? "blocked" : watchItemCount > 0 ? "watch" : "ready";
  const topItem = items.find((item) => item.status === "blocked") ?? items.find((item) => item.status === "watch") ?? items[0] ?? null;
  const attendees = createAttendees(items);

  return {
    blockedItemCount,
    estimatedDurationMinutes: Math.max(15, items.reduce((sum, item) => sum + item.durationMinutes, 0)),
    readyItemCount,
    requiredAttendeeCount: attendees.filter((attendee) => attendee.required).length,
    sourceCount: new Set(items.map((item) => item.sourceLabel)).size,
    status,
    topDecision: topItem?.decisionPrompt ?? "Confirm the release approval packet is ready for board sign-off.",
    totalItemCount: items.length,
    watchItemCount,
  };
}

function createOpeningMemo(summary: BoardApprovalMeetingAgendaReport["summary"]) {
  if (summary.status === "blocked") {
    return `Board meeting is blocked by ${summary.blockedItemCount} agenda item${summary.blockedItemCount === 1 ? "" : "s"}. Start with ${summary.topDecision}`;
  }

  if (summary.status === "watch") {
    return `Board meeting has ${summary.watchItemCount} watched agenda item${summary.watchItemCount === 1 ? "" : "s"}. Confirm ${summary.topDecision}`;
  }

  return "Board meeting is ready for approval. Confirm evidence freshness, scenario path, and final sign-off owners.";
}

function createCsv(items: BoardApprovalAgendaItem[]) {
  const header = ["kind", "status", "topic", "owner", "duration_minutes", "decision_prompt", "next_action"];
  const rows = items.map((item) =>
    [item.kind, item.status, item.topic, item.ownerName, item.durationMinutes, item.decisionPrompt, item.nextAction].map((value) => escapeCsvValue(value)).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardApprovalMeetingAgenda(input: CreateBoardApprovalMeetingAgendaInput): BoardApprovalMeetingAgendaReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const items = dedupeItems([
    ...signOffItems(input.boardApprovalPacket),
    ...scenarioItem(input.releaseScenarioComparison),
    ...timelineItems(input.releaseControlRoomTimeline),
    ...ownerActionItems(input.executiveActionOwnership),
    ...criticalPathItems(input.boardApprovalPacket),
  ]);
  const summary = statusSummary(items);
  const csvContent = createCsv(items);

  return {
    attendees: createAttendees(items),
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(input.workspaceId ?? "workspace")}-board-approval-agenda.csv`,
    generatedAt,
    items,
    openingMemo: createOpeningMemo(summary),
    summary,
  };
}
