import { createHash } from "node:crypto";
import type { ExecutiveActionOwnershipMatrix, ExecutiveActionOwnershipRow, ExecutiveActionOwnershipStatus } from "@/features/projects/executive-action-ownership";
import type {
  ExecutiveReleaseIntelligenceDomain,
  ExecutiveReleaseIntelligenceReport,
  ExecutiveReleaseIntelligenceSignal,
  ExecutiveReleaseIntelligenceStatus,
} from "@/features/projects/executive-release-intelligence";
import type { ExecutiveReleaseSnapshotHistoryReport } from "@/features/projects/executive-release-snapshots";
import type { ReleaseControlRoomTimelineReport, ReleaseControlRoomTimelineRow, ReleaseControlRoomTimelineStatus } from "@/features/projects/release-control-room-timeline";
import type { ReleaseScenarioComparisonReport, ReleaseScenarioComparisonStatus } from "@/features/projects/release-scenario-comparison";

export type BoardApprovalPacketStatus = "blocked" | "ready" | "watch";
export type BoardApprovalPacketCriticalPathSource = "control-room" | "executive" | "ownership" | "scenario";
export type BoardApprovalPacketSignOffRole = ExecutiveReleaseIntelligenceDomain;

export interface BoardApprovalPacketCriticalPathRow {
  action: string;
  evidence: string;
  evidenceHash: string;
  id: string;
  label: string;
  ownerName: string;
  source: BoardApprovalPacketCriticalPathSource;
  status: BoardApprovalPacketStatus;
}

export interface BoardApprovalPacketSignOffRow {
  action: string;
  dueAt: string | null;
  evidenceHash: string;
  evidenceLinks: string[];
  ownerEmail: string | null;
  ownerName: string;
  required: boolean;
  role: BoardApprovalPacketSignOffRole;
  status: BoardApprovalPacketStatus;
}

export interface BoardApprovalPacketSourceChecksum {
  contentHash: string;
  id: string;
  label: string;
  sourceRecordCount: number;
  verified: boolean;
}

export interface BoardApprovalPacketChecksums {
  packetHash: string;
  sources: BoardApprovalPacketSourceChecksum[];
}

export interface BoardApprovalPacketReport {
  checksums: BoardApprovalPacketChecksums;
  criticalPath: BoardApprovalPacketCriticalPathRow[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  packetId: string;
  redactedSummary: string;
  signOffs: BoardApprovalPacketSignOffRow[];
  summary: {
    approvalScore: number;
    blockedSignOffCount: number;
    checksumCount: number;
    criticalPathCount: number;
    nextAction: string;
    readySignOffCount: number;
    redactionCount: number;
    status: BoardApprovalPacketStatus;
    watchSignOffCount: number;
  };
}

export interface CreateBoardApprovalPacketInput {
  executiveActionOwnership: ExecutiveActionOwnershipMatrix | null;
  executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport;
  executiveReleaseSnapshotHistory?: ExecutiveReleaseSnapshotHistoryReport | null;
  generatedAt?: string;
  releaseControlRoomTimeline: ReleaseControlRoomTimelineReport | null;
  releaseScenarioComparison: ReleaseScenarioComparisonReport | null;
  workspaceId?: string;
}

const roles: BoardApprovalPacketSignOffRole[] = ["launch", "governance", "automation", "cost", "risk", "incident", "evidence"];

const statusRank: Record<BoardApprovalPacketStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<BoardApprovalPacketStatus, number> = {
  blocked: 35,
  ready: 100,
  watch: 72,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function canonicalJson(value: unknown) {
  return JSON.stringify(JSON.parse(stableJson(value)), null, 2);
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 100;
}

function parseTime(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : Number.NaN;

  return Number.isNaN(time) ? 0 : time;
}

function earliestDate(values: Array<string | null | undefined>) {
  const time = values.map(parseTime).filter((value) => value > 0).sort((first, second) => first - second)[0];

  return time ? new Date(time).toISOString() : null;
}

function escapeCsvValue(value: string | number | boolean | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function normalizeStatus(
  status: ExecutiveActionOwnershipStatus | ExecutiveReleaseIntelligenceStatus | ReleaseControlRoomTimelineStatus | ReleaseScenarioComparisonStatus,
): BoardApprovalPacketStatus {
  return status === "overdue" ? "blocked" : status;
}

function worstStatus(statuses: BoardApprovalPacketStatus[]) {
  return statuses.reduce<BoardApprovalPacketStatus>((worst, status) => (statusRank[status] < statusRank[worst] ? status : worst), "ready");
}

function sourceChecksum(input: { id: string; label: string; sourceRecordCount: number; value: unknown }): BoardApprovalPacketSourceChecksum {
  const contentHash = sha256(input.value);

  return {
    contentHash,
    id: input.id,
    label: input.label,
    sourceRecordCount: input.sourceRecordCount,
    verified: contentHash === sha256(input.value),
  };
}

function createRedactor() {
  let count = 0;

  return {
    redact(value: string | null | undefined) {
      const text = value ?? "";
      const withUrls = text.replace(/\bhttps?:\/\/[^\s),]+/gi, () => {
        count += 1;

        return "[redacted-url]";
      });

      return withUrls.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, () => {
        count += 1;

        return "[redacted-email]";
      });
    },
    redactionCount() {
      return count;
    },
  };
}

function executiveCriticalPathRows(input: {
  redactor: ReturnType<typeof createRedactor>;
  report: ExecutiveReleaseIntelligenceReport;
}): BoardApprovalPacketCriticalPathRow[] {
  const signals = input.report.criticalPath.length > 0 ? input.report.criticalPath : input.report.signals.filter((signal) => signal.status !== "ready");

  return signals.slice(0, 5).map((signal) => ({
    action: input.redactor.redact(signal.nextAction),
    evidence: input.redactor.redact(signal.evidence),
    evidenceHash: sha256({ action: signal.nextAction, evidence: signal.evidence, id: signal.id }),
    id: `executive:${signal.id}`,
    label: input.redactor.redact(signal.label),
    ownerName: input.redactor.redact(signal.ownerHint),
    source: "executive",
    status: normalizeStatus(signal.status),
  }));
}

function ownershipCriticalPathRows(input: {
  matrix: ExecutiveActionOwnershipMatrix | null;
  redactor: ReturnType<typeof createRedactor>;
}): BoardApprovalPacketCriticalPathRow[] {
  return (
    input.matrix?.rows
      .filter((row) => row.status !== "ready")
      .slice(0, 6)
      .map((row) => ({
        action: input.redactor.redact(row.action),
        evidence: input.redactor.redact(row.evidenceLinks.map((link) => `${link.label}: ${link.href}`).join(" | ") || row.detail),
        evidenceHash: sha256({ action: row.action, dueAt: row.dueAt, evidenceLinks: row.evidenceLinks, id: row.id }),
        id: `ownership:${row.id}`,
        label: input.redactor.redact(row.signalLabel),
        ownerName: input.redactor.redact(row.ownerName),
        source: "ownership" as const,
        status: normalizeStatus(row.status),
      })) ?? []
  );
}

function timelineCriticalPathRows(input: {
  redactor: ReturnType<typeof createRedactor>;
  timeline: ReleaseControlRoomTimelineReport | null;
}): BoardApprovalPacketCriticalPathRow[] {
  return (
    input.timeline?.rows
      .filter((row) => row.status !== "ready")
      .slice(0, 6)
      .map((row) => ({
        action: input.redactor.redact(row.nextAction),
        evidence: input.redactor.redact(row.evidence),
        evidenceHash: sha256({ evidence: row.evidence, id: row.id, nextAction: row.nextAction }),
        id: `control-room:${row.id}`,
        label: input.redactor.redact(row.title),
        ownerName: input.redactor.redact(row.ownerName ?? "Release owner"),
        source: "control-room" as const,
        status: normalizeStatus(row.status),
      })) ?? []
  );
}

function scenarioCriticalPathRows(input: {
  redactor: ReturnType<typeof createRedactor>;
  report: ReleaseScenarioComparisonReport | null;
}): BoardApprovalPacketCriticalPathRow[] {
  if (!input.report || input.report.recommendedScenario.status === "ready") {
    return [];
  }

  return [
    {
      action: input.redactor.redact(input.report.recommendedScenario.nextAction),
      evidence: input.redactor.redact(input.report.recommendedScenario.description),
      evidenceHash: sha256(input.report.recommendedScenario),
      id: `scenario:${input.report.recommendedScenario.id}`,
      label: input.redactor.redact(input.report.recommendedScenario.label),
      ownerName: "Release board",
      source: "scenario",
      status: normalizeStatus(input.report.recommendedScenario.status),
    },
  ];
}

function criticalPathSort(first: BoardApprovalPacketCriticalPathRow, second: BoardApprovalPacketCriticalPathRow) {
  return statusRank[first.status] - statusRank[second.status] || first.source.localeCompare(second.source) || first.label.localeCompare(second.label);
}

function signOffStatus(input: {
  ownerRows: ExecutiveActionOwnershipRow[];
  signal: ExecutiveReleaseIntelligenceSignal | null;
}): BoardApprovalPacketStatus {
  const ownerStatuses = input.ownerRows.map((row) => normalizeStatus(row.status));

  if (ownerStatuses.includes("blocked") || input.signal?.status === "blocked") {
    return "blocked";
  }

  if (ownerStatuses.includes("watch") || input.ownerRows.some((row) => !row.ownerEmail) || input.signal?.status === "watch" || !input.signal) {
    return "watch";
  }

  return "ready";
}

function createSignOffs(input: {
  matrix: ExecutiveActionOwnershipMatrix | null;
  redactor: ReturnType<typeof createRedactor>;
  report: ExecutiveReleaseIntelligenceReport;
}): BoardApprovalPacketSignOffRow[] {
  return roles
    .map((role) => {
      const signal = input.report.signals.find((row) => row.domain === role) ?? null;
      const ownerRows = input.matrix?.rows.filter((row) => row.domain === role) ?? [];
      const primaryOwnerRow = ownerRows.find((row) => row.ownerEmail) ?? ownerRows[0] ?? null;
      const status = signOffStatus({ ownerRows, signal });
      const evidenceLinks = ownerRows.flatMap((row) => row.evidenceLinks.map((link) => input.redactor.redact(link.href)));
      const action = primaryOwnerRow?.action ?? signal?.nextAction ?? `Attach ${role} sign-off evidence.`;
      const evidencePayload = {
        action,
        evidenceLinks: ownerRows.flatMap((row) => row.evidenceLinks),
        role,
        signalId: signal?.id ?? null,
        status,
      };

      return {
        action: input.redactor.redact(action),
        dueAt: earliestDate(ownerRows.map((row) => row.dueAt)),
        evidenceHash: sha256(evidencePayload),
        evidenceLinks,
        ownerEmail: primaryOwnerRow?.ownerEmail ? input.redactor.redact(primaryOwnerRow.ownerEmail) : null,
        ownerName: input.redactor.redact(primaryOwnerRow?.ownerName ?? signal?.ownerHint ?? `${role} owner`),
        required: status !== "ready" || input.report.criticalPath.some((row) => row.domain === role),
        role,
        status,
      };
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.role.localeCompare(second.role));
}

function createSourceChecksums(input: CreateBoardApprovalPacketInput): BoardApprovalPacketSourceChecksum[] {
  const checksums = [
    sourceChecksum({
      id: "executive-release-intelligence",
      label: "Executive release intelligence",
      sourceRecordCount: input.executiveReleaseIntelligence.signals.length,
      value: input.executiveReleaseIntelligence,
    }),
  ];

  if (input.executiveActionOwnership) {
    checksums.push(
      sourceChecksum({
        id: "executive-action-ownership",
        label: "Executive action ownership",
        sourceRecordCount: input.executiveActionOwnership.rows.length,
        value: input.executiveActionOwnership,
      }),
    );
  }

  if (input.releaseScenarioComparison) {
    checksums.push(
      sourceChecksum({
        id: "release-scenario-comparison",
        label: "Release scenario comparison",
        sourceRecordCount: Math.max(input.releaseScenarioComparison.rows.length, 1),
        value: input.releaseScenarioComparison,
      }),
    );
  }

  if (input.releaseControlRoomTimeline) {
    checksums.push(
      sourceChecksum({
        id: "release-control-room-timeline",
        label: "Release control-room timeline",
        sourceRecordCount: input.releaseControlRoomTimeline.rows.length,
        value: input.releaseControlRoomTimeline,
      }),
    );
  }

  if (input.executiveReleaseSnapshotHistory) {
    checksums.push(
      sourceChecksum({
        id: "executive-release-snapshot-history",
        label: "Executive release snapshot history",
        sourceRecordCount: input.executiveReleaseSnapshotHistory.snapshots.length,
        value: input.executiveReleaseSnapshotHistory,
      }),
    );
  }

  return checksums;
}

function createRedactedSummary(input: {
  executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport;
  redactor: ReturnType<typeof createRedactor>;
  releaseControlRoomTimeline: ReleaseControlRoomTimelineReport | null;
  releaseScenarioComparison: ReleaseScenarioComparisonReport | null;
}) {
  return [
    `Approval status: ${input.executiveReleaseIntelligence.summary.status}.`,
    `Executive memo: ${input.redactor.redact(input.executiveReleaseIntelligence.executiveMemo)}`,
    `Critical action: ${input.redactor.redact(input.executiveReleaseIntelligence.summary.topAction)}`,
    input.releaseScenarioComparison
      ? `Scenario recommendation: ${input.redactor.redact(input.releaseScenarioComparison.summary.nextAction)}`
      : "Scenario recommendation: No scenario comparison attached.",
    input.releaseControlRoomTimeline
      ? `Control-room state: ${input.releaseControlRoomTimeline.summary.status}; ${input.redactor.redact(input.releaseControlRoomTimeline.summary.nextAction)}`
      : "Control-room state: No timeline attached.",
  ].join("\n");
}

function createExecutiveMemo(input: {
  criticalPath: BoardApprovalPacketCriticalPathRow[];
  executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport;
  redactor: ReturnType<typeof createRedactor>;
  signOffs: BoardApprovalPacketSignOffRow[];
}) {
  const blockedSignOffCount = input.signOffs.filter((row) => row.status === "blocked").length;
  const watchSignOffCount = input.signOffs.filter((row) => row.status === "watch").length;

  if (blockedSignOffCount > 0) {
    return input.redactor.redact(
      `Board approval is blocked by ${blockedSignOffCount} sign-off ${blockedSignOffCount === 1 ? "gap" : "gaps"}. ${input.criticalPath[0]?.action ?? input.executiveReleaseIntelligence.summary.topAction}`,
    );
  }

  if (watchSignOffCount > 0) {
    return input.redactor.redact(
      `Board approval is in watch state with ${watchSignOffCount} sign-off ${watchSignOffCount === 1 ? "review" : "reviews"} pending. ${input.criticalPath[0]?.action ?? input.executiveReleaseIntelligence.summary.topAction}`,
    );
  }

  return input.redactor.redact("Board approval packet is ready. Keep checksums and sign-off evidence attached to the release record.");
}

function timelineScore(report: ReleaseControlRoomTimelineReport | null) {
  if (!report) {
    return 72;
  }

  return clampScore(100 - report.summary.blockedCount * 18 - report.summary.watchCount * 7);
}

function createSummary(input: {
  criticalPathCount: number;
  executiveActionOwnership: ExecutiveActionOwnershipMatrix | null;
  executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport;
  redactionCount: number;
  releaseControlRoomTimeline: ReleaseControlRoomTimelineReport | null;
  releaseScenarioComparison: ReleaseScenarioComparisonReport | null;
  signOffs: BoardApprovalPacketSignOffRow[];
  sourceChecksumCount: number;
}): BoardApprovalPacketReport["summary"] {
  const blockedSignOffCount = input.signOffs.filter((row) => row.status === "blocked").length;
  const watchSignOffCount = input.signOffs.filter((row) => row.status === "watch").length;
  const readySignOffCount = input.signOffs.filter((row) => row.status === "ready").length;
  const signOffScore = average(input.signOffs.map((row) => statusScore[row.status]));
  const approvalScore = clampScore(
    average([
      input.executiveReleaseIntelligence.summary.executiveScore,
      input.executiveActionOwnership?.summary.ownershipScore ?? signOffScore,
      input.releaseScenarioComparison?.summary.scenarioScore ?? signOffScore,
      timelineScore(input.releaseControlRoomTimeline),
      signOffScore,
    ]),
  );
  const status = worstStatus([
    normalizeStatus(input.executiveReleaseIntelligence.summary.status),
    input.executiveActionOwnership ? normalizeStatus(input.executiveActionOwnership.summary.status) : "ready",
    input.releaseScenarioComparison ? normalizeStatus(input.releaseScenarioComparison.summary.status) : "ready",
    input.releaseControlRoomTimeline ? normalizeStatus(input.releaseControlRoomTimeline.summary.status) : "ready",
    ...input.signOffs.map((row) => row.status),
  ]);
  const nextSignOff = input.signOffs.find((row) => row.status === "blocked") ?? input.signOffs.find((row) => row.status === "watch") ?? null;

  return {
    approvalScore,
    blockedSignOffCount,
    checksumCount: input.sourceChecksumCount + 1,
    criticalPathCount: input.criticalPathCount,
    nextAction: nextSignOff?.action ?? input.executiveReleaseIntelligence.summary.topAction,
    readySignOffCount,
    redactionCount: input.redactionCount,
    status,
    watchSignOffCount,
  };
}

function createCsv(signOffs: BoardApprovalPacketSignOffRow[]) {
  const header = ["role", "status", "required", "owner", "due_at", "evidence_hash", "action"];
  const rows = signOffs.map((row) =>
    [row.role, row.status, row.required, row.ownerName, row.dueAt, row.evidenceHash, row.action].map((value) => escapeCsvValue(value)).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function createPacketId(workspaceId: string, generatedAt: string) {
  return `board-approval-${slug(workspaceId)}-${generatedAt.slice(0, 10).replaceAll("-", "")}-${shortHash(`${workspaceId}:${generatedAt}`)}`;
}

export function createBoardApprovalPacket(input: CreateBoardApprovalPacketInput): BoardApprovalPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const redactor = createRedactor();
  const packetId = createPacketId(input.workspaceId ?? "workspace", generatedAt);
  const criticalPath = [
    ...executiveCriticalPathRows({ redactor, report: input.executiveReleaseIntelligence }),
    ...ownershipCriticalPathRows({ matrix: input.executiveActionOwnership, redactor }),
    ...timelineCriticalPathRows({ redactor, timeline: input.releaseControlRoomTimeline }),
    ...scenarioCriticalPathRows({ redactor, report: input.releaseScenarioComparison }),
  ]
    .sort(criticalPathSort)
    .slice(0, 12);
  const signOffs = createSignOffs({
    matrix: input.executiveActionOwnership,
    redactor,
    report: input.executiveReleaseIntelligence,
  });
  const redactedSummary = createRedactedSummary({
    executiveReleaseIntelligence: input.executiveReleaseIntelligence,
    redactor,
    releaseControlRoomTimeline: input.releaseControlRoomTimeline,
    releaseScenarioComparison: input.releaseScenarioComparison,
  });
  const executiveMemo = createExecutiveMemo({
    criticalPath,
    executiveReleaseIntelligence: input.executiveReleaseIntelligence,
    redactor,
    signOffs,
  });
  const sourceChecksums = createSourceChecksums(input);
  const summary = createSummary({
    criticalPathCount: criticalPath.length,
    executiveActionOwnership: input.executiveActionOwnership,
    executiveReleaseIntelligence: input.executiveReleaseIntelligence,
    redactionCount: redactor.redactionCount(),
    releaseControlRoomTimeline: input.releaseControlRoomTimeline,
    releaseScenarioComparison: input.releaseScenarioComparison,
    signOffs,
    sourceChecksumCount: sourceChecksums.length,
  });
  const packetPayload = {
    criticalPath,
    executiveMemo,
    generatedAt,
    packetId,
    redactedSummary,
    schemaVersion: 1,
    signOffs,
    sourceChecksums,
    summary,
  };
  const checksums: BoardApprovalPacketChecksums = {
    packetHash: sha256(packetPayload),
    sources: sourceChecksums,
  };
  const jsonContent = canonicalJson({
    ...packetPayload,
    checksums,
  });
  const csvContent = createCsv(signOffs);
  const filePrefix = `${slug(input.workspaceId ?? "workspace")}-board-approval-packet`;

  return {
    checksums,
    criticalPath,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${filePrefix}.csv`,
    executiveMemo,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${filePrefix}.json`,
    packetId,
    redactedSummary,
    signOffs,
    summary,
  };
}

export function isBoardApprovalPacketReport(value: unknown): value is BoardApprovalPacketReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<BoardApprovalPacketReport>;

  return (
    typeof report.generatedAt === "string" &&
    typeof report.packetId === "string" &&
    typeof report.redactedSummary === "string" &&
    typeof report.executiveMemo === "string" &&
    typeof report.jsonContent === "string" &&
    typeof report.csvContent === "string" &&
    Array.isArray(report.criticalPath) &&
    Array.isArray(report.signOffs) &&
    !!report.checksums &&
    typeof report.checksums.packetHash === "string" &&
    Array.isArray(report.checksums.sources) &&
    !!report.summary &&
    typeof report.summary.approvalScore === "number" &&
    typeof report.summary.blockedSignOffCount === "number" &&
    typeof report.summary.watchSignOffCount === "number" &&
    typeof report.summary.readySignOffCount === "number" &&
    typeof report.summary.nextAction === "string" &&
    (report.summary.status === "blocked" || report.summary.status === "ready" || report.summary.status === "watch")
  );
}
