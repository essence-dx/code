import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind } from "@/features/projects/board-release-archive-custody-executive-closeout-digest";
import type {
  BoardReleaseArchiveOversightExceptionRenewalCalendarReport,
  BoardReleaseArchiveOversightExceptionRenewalCalendarRow,
} from "@/features/projects/board-release-archive-oversight-exception-renewal-calendar";

export type BoardReleaseArchiveOversightEvidenceQualityStatus = "blocked" | "healthy" | "watch";

export interface BoardReleaseArchiveOversightEvidenceQualityOverride {
  attestationHash: string | null;
  expectedReviewer: string;
  kind: BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind;
  observedAt: string;
  reviewer: string;
}

export interface BoardReleaseArchiveOversightEvidenceQualityMonitorRow {
  attestationHash: string | null;
  expectedReviewer: string;
  id: string;
  kind: BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind;
  missingAttestation: boolean;
  nextAction: string;
  observedAt: string;
  qualityHash: string;
  qualityScore: number;
  renewalHash: string;
  reviewer: string;
  reviewerDrift: boolean;
  staleHash: boolean;
  status: BoardReleaseArchiveOversightEvidenceQualityStatus;
  title: string;
}

export interface BoardReleaseArchiveOversightEvidenceQualityMonitorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveOversightEvidenceQualityMonitorRow[];
  summary: {
    blockedCount: number;
    healthyCount: number;
    missingAttestationCount: number;
    nextAction: string;
    qualityMonitorHash: string;
    qualityScore: number;
    reviewerDriftCount: number;
    rowCount: number;
    staleHashCount: number;
    status: BoardReleaseArchiveOversightEvidenceQualityStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveOversightEvidenceQualityMonitorInput {
  generatedAt?: string;
  qualityOverrides?: BoardReleaseArchiveOversightEvidenceQualityOverride[];
  renewalCalendar: BoardReleaseArchiveOversightExceptionRenewalCalendarReport;
  staleAfterDays?: number;
  workspaceId?: string;
}

const reviewerByKind: Record<BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind, string> = {
  "access-review": "Board archive chair",
  "chain-of-control": "Release archive owner",
  "release-recommendation": "Board secretary",
  "restore-rehearsal": "Restore rehearsal owner",
  "retention-lock": "Records retention owner",
};

const kindRank: Record<BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind, number> = {
  "access-review": 0,
  "restore-rehearsal": 1,
  "chain-of-control": 2,
  "release-recommendation": 3,
  "retention-lock": 4,
};

const statusRank: Record<BoardReleaseArchiveOversightEvidenceQualityStatus, number> = {
  blocked: 0,
  watch: 1,
  healthy: 2,
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

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: boolean | string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function ageInDays(input: { generatedAt: string; observedAt: string }) {
  const generatedAt = new Date(input.generatedAt).getTime();
  const observedAt = new Date(input.observedAt).getTime();

  if (Number.isNaN(generatedAt) || Number.isNaN(observedAt)) {
    return 0;
  }

  return Math.floor((generatedAt - observedAt) / (24 * 60 * 60 * 1000));
}

function defaultQualitySignal(input: {
  generatedAt: string;
  row: BoardReleaseArchiveOversightExceptionRenewalCalendarRow;
}) {
  const expectedReviewer = reviewerByKind[input.row.kind];

  return {
    attestationHash: input.row.renewalEvidenceHash ?? input.row.renewalHash,
    expectedReviewer,
    kind: input.row.kind,
    observedAt: input.generatedAt,
    reviewer: expectedReviewer,
  } satisfies BoardReleaseArchiveOversightEvidenceQualityOverride;
}

function statusFor(input: {
  missingAttestation: boolean;
  reviewerDrift: boolean;
  staleHash: boolean;
}) {
  if (input.missingAttestation && (input.reviewerDrift || input.staleHash)) {
    return "blocked" satisfies BoardReleaseArchiveOversightEvidenceQualityStatus;
  }

  if (input.missingAttestation || input.reviewerDrift || input.staleHash) {
    return "watch" satisfies BoardReleaseArchiveOversightEvidenceQualityStatus;
  }

  return "healthy" satisfies BoardReleaseArchiveOversightEvidenceQualityStatus;
}

function nextActionFor(input: {
  missingAttestation: boolean;
  reviewerDrift: boolean;
  staleHash: boolean;
  title: string;
}) {
  if (input.missingAttestation && (input.reviewerDrift || input.staleHash)) {
    return `Repair blocked archive oversight evidence quality for ${input.title}.`;
  }

  if (input.missingAttestation) {
    return `Attach missing archive oversight attestation for ${input.title}.`;
  }

  if (input.reviewerDrift) {
    return `Reassign archive oversight reviewer for ${input.title}.`;
  }

  if (input.staleHash) {
    return `Refresh stale archive oversight evidence hash for ${input.title}.`;
  }

  return `Keep archive oversight evidence quality healthy for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveOversightEvidenceQualityMonitorInput & { generatedAt: string; staleAfterDays: number; workspaceId: string }) {
  const overrides = new Map((input.qualityOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.renewalCalendar.rows
    .map((entry) => {
      const signal = overrides.get(entry.kind) ?? defaultQualitySignal({ generatedAt: input.generatedAt, row: entry });
      const staleHash = ageInDays({ generatedAt: input.generatedAt, observedAt: signal.observedAt }) > input.staleAfterDays;
      const missingAttestation = !signal.attestationHash?.startsWith("sha256:");
      const reviewerDrift = signal.reviewer !== signal.expectedReviewer;
      const status = statusFor({
        missingAttestation,
        reviewerDrift,
        staleHash,
      });
      const qualityScore = Math.max(0, 100 - (staleHash ? 18 : 0) - (missingAttestation ? 34 : 0) - (reviewerDrift ? 24 : 0));
      const qualityHash = sha256({
        attestationHash: signal.attestationHash,
        expectedReviewer: signal.expectedReviewer,
        kind: entry.kind,
        observedAt: signal.observedAt,
        qualityScore,
        renewalHash: entry.renewalHash,
        reviewer: signal.reviewer,
        status,
      });

      return {
        attestationHash: signal.attestationHash,
        expectedReviewer: signal.expectedReviewer,
        id: `archive-oversight-evidence-quality:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        missingAttestation,
        nextAction: nextActionFor({
          missingAttestation,
          reviewerDrift,
          staleHash,
          title: entry.title,
        }),
        observedAt: signal.observedAt,
        qualityHash,
        qualityScore,
        renewalHash: entry.renewalHash,
        reviewer: signal.reviewer,
        reviewerDrift,
        staleHash,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveOversightEvidenceQualityMonitorRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveOversightEvidenceQualityMonitorRow[]) {
  const header = [
    "quality_id",
    "kind",
    "title",
    "status",
    "quality_score",
    "stale_hash",
    "missing_attestation",
    "reviewer_drift",
    "reviewer",
    "expected_reviewer",
    "attestation_hash",
    "renewal_hash",
    "quality_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.qualityScore,
      entry.staleHash,
      entry.missingAttestation,
      entry.reviewerDrift,
      entry.reviewer,
      entry.expectedReviewer,
      entry.attestationHash,
      entry.renewalHash,
      entry.qualityHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveOversightEvidenceQualityMonitorRow[]): BoardReleaseArchiveOversightEvidenceQualityMonitorReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const healthyCount = rows.filter((entry) => entry.status === "healthy").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const staleHashCount = rows.filter((entry) => entry.staleHash).length;
  const missingAttestationCount = rows.filter((entry) => entry.missingAttestation).length;
  const reviewerDriftCount = rows.filter((entry) => entry.reviewerDrift).length;
  const status: BoardReleaseArchiveOversightEvidenceQualityStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "healthy";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    healthyCount,
    missingAttestationCount,
    nextAction:
      status === "healthy"
        ? "Archive oversight evidence quality monitor is healthy."
        : (nextRow?.nextAction ?? "Review archive oversight evidence quality monitor."),
    qualityMonitorHash: sha256(rows.map((entry) => entry.qualityHash)),
    qualityScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.qualityScore, 0) / rows.length) : 100,
    reviewerDriftCount,
    rowCount: rows.length,
    staleHashCount,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveOversightEvidenceQualityMonitorRow[];
  summary: BoardReleaseArchiveOversightEvidenceQualityMonitorReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveOversightEvidenceQualityMonitor(
  input: CreateBoardReleaseArchiveOversightEvidenceQualityMonitorInput,
): BoardReleaseArchiveOversightEvidenceQualityMonitorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const staleAfterDays = input.staleAfterDays ?? 14;
  const workspaceId = input.workspaceId ?? input.renewalCalendar.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
    staleAfterDays,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-oversight-evidence-quality-monitor-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
