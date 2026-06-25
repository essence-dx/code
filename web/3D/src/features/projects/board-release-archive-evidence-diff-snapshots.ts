import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveEvidenceRetentionVaultKind,
  BoardReleaseArchiveEvidenceRetentionVaultManifest,
  BoardReleaseArchiveEvidenceRetentionVaultReport,
} from "@/features/projects/board-release-archive-evidence-retention-vault";

export type BoardReleaseArchiveEvidenceDiffSnapshotChange = "added" | "changed" | "missing" | "unchanged";
export type BoardReleaseArchiveEvidenceDiffSnapshotStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveEvidenceDiffSnapshotRow {
  byteDelta: number;
  change: BoardReleaseArchiveEvidenceDiffSnapshotChange;
  currentEvidenceHash: string | null;
  currentStatus: string | null;
  currentVaultHash: string | null;
  fileName: string;
  id: string;
  kind: BoardReleaseArchiveEvidenceRetentionVaultKind;
  nextAction: string;
  previousEvidenceHash: string | null;
  previousStatus: string | null;
  previousVaultHash: string | null;
  recordDelta: number;
  status: BoardReleaseArchiveEvidenceDiffSnapshotStatus;
  title: string;
}

export interface BoardReleaseArchiveEvidenceDiffSnapshotReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveEvidenceDiffSnapshotRow[];
  summary: {
    addedCount: number;
    blockedCount: number;
    changedCount: number;
    currentVaultHash: string;
    missingCount: number;
    nextAction: string;
    previousVaultHash: string | null;
    snapshotHash: string;
    snapshotScore: number;
    status: BoardReleaseArchiveEvidenceDiffSnapshotStatus;
    totalCount: number;
    unchangedCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveEvidenceDiffSnapshotReportInput {
  currentVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
  generatedAt?: string;
  previousVault?: BoardReleaseArchiveEvidenceRetentionVaultReport | null;
  workspaceId?: string;
}

const changeRank: Record<BoardReleaseArchiveEvidenceDiffSnapshotChange, number> = {
  missing: 0,
  changed: 1,
  added: 2,
  unchanged: 3,
};

const kindRank: Record<BoardReleaseArchiveEvidenceRetentionVaultKind, number> = {
  packet: 0,
  digest: 1,
  approval: 2,
  notification: 3,
  "command-center": 4,
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

function csvCell(value: string | number | null) {
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

function byKind(manifests: BoardReleaseArchiveEvidenceRetentionVaultManifest[]) {
  return new Map(manifests.map((manifest) => [manifest.kind, manifest]));
}

function changeFor(
  current: BoardReleaseArchiveEvidenceRetentionVaultManifest | null,
  previous: BoardReleaseArchiveEvidenceRetentionVaultManifest | null,
): BoardReleaseArchiveEvidenceDiffSnapshotChange {
  if (current && !previous) {
    return "added";
  }

  if (!current && previous) {
    return "missing";
  }

  if (!current || !previous) {
    return "missing";
  }

  return current.vaultHash === previous.vaultHash && current.evidenceHash === previous.evidenceHash ? "unchanged" : "changed";
}

function statusFor(
  change: BoardReleaseArchiveEvidenceDiffSnapshotChange,
  current: BoardReleaseArchiveEvidenceRetentionVaultManifest | null,
): BoardReleaseArchiveEvidenceDiffSnapshotStatus {
  if (change === "missing") {
    return "blocked";
  }

  if (change === "added" || change === "changed") {
    return current?.status === "blocked" ? "blocked" : "watch";
  }

  return current?.status === "sealed" ? "ready" : current?.status === "blocked" ? "blocked" : "watch";
}

function nextActionFor(input: {
  change: BoardReleaseArchiveEvidenceDiffSnapshotChange;
  current: BoardReleaseArchiveEvidenceRetentionVaultManifest | null;
  previous: BoardReleaseArchiveEvidenceRetentionVaultManifest | null;
}) {
  if (input.change === "missing") {
    return `Restore or supersede the missing saved vault bundle for ${input.previous?.title ?? "archive evidence"}.`;
  }

  if (input.change === "added") {
    return `Save ${input.current?.title ?? "this evidence bundle"} as the new vault baseline before closeout.`;
  }

  if (input.change === "changed") {
    return `Review hash, record, and size drift for ${input.current?.title ?? "this evidence bundle"} before approving archive evidence.`;
  }

  return `Keep ${input.current?.title ?? "this evidence bundle"} attached to the saved vault baseline.`;
}

function createRows(input: {
  currentVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
  generatedAt: string;
  previousVault: BoardReleaseArchiveEvidenceRetentionVaultReport | null;
  workspaceId: string;
}): BoardReleaseArchiveEvidenceDiffSnapshotRow[] {
  const currentByKind = byKind(input.currentVault.manifests);
  const previousByKind = byKind(input.previousVault?.manifests ?? []);
  const kinds = [...new Set([...currentByKind.keys(), ...previousByKind.keys()])].sort((first, second) => kindRank[first] - kindRank[second]);

  if (!input.previousVault) {
    return input.currentVault.manifests
      .map((manifest) => ({
        byteDelta: manifest.byteSize,
        change: "added" as const,
        currentEvidenceHash: manifest.evidenceHash,
        currentStatus: manifest.status,
        currentVaultHash: manifest.vaultHash,
        fileName: manifest.fileName,
        id: `archive-evidence-diff:${slug(input.workspaceId)}:${manifest.kind}:${dateStamp(input.generatedAt)}`,
        kind: manifest.kind,
        nextAction: `Save ${manifest.title} as the first vault baseline before board archive closeout.`,
        previousEvidenceHash: null,
        previousStatus: null,
        previousVaultHash: null,
        recordDelta: manifest.recordCount,
        status: manifest.status === "blocked" ? ("blocked" as const) : ("watch" as const),
        title: manifest.title,
      }))
      .sort((first, second) => changeRank[first.change] - changeRank[second.change] || kindRank[first.kind] - kindRank[second.kind]);
  }

  return kinds
    .map((kind) => {
      const current = currentByKind.get(kind) ?? null;
      const previous = previousByKind.get(kind) ?? null;
      const change = changeFor(current, previous);

      return {
        byteDelta: (current?.byteSize ?? 0) - (previous?.byteSize ?? 0),
        change,
        currentEvidenceHash: current?.evidenceHash ?? null,
        currentStatus: current?.status ?? null,
        currentVaultHash: current?.vaultHash ?? null,
        fileName: current?.fileName ?? previous?.fileName ?? "missing-vault-bundle",
        id: `archive-evidence-diff:${slug(input.workspaceId)}:${kind}:${dateStamp(input.generatedAt)}`,
        kind,
        nextAction: nextActionFor({ change, current, previous }),
        previousEvidenceHash: previous?.evidenceHash ?? null,
        previousStatus: previous?.status ?? null,
        previousVaultHash: previous?.vaultHash ?? null,
        recordDelta: (current?.recordCount ?? 0) - (previous?.recordCount ?? 0),
        status: statusFor(change, current),
        title: current?.title ?? previous?.title ?? kind,
      };
    })
    .sort((first, second) => changeRank[first.change] - changeRank[second.change] || kindRank[first.kind] - kindRank[second.kind]);
}

function createCsv(rows: BoardReleaseArchiveEvidenceDiffSnapshotRow[]) {
  const header = [
    "snapshot_id",
    "kind",
    "title",
    "change",
    "status",
    "current_status",
    "previous_status",
    "record_delta",
    "byte_delta",
    "file_name",
    "current_evidence_hash",
    "previous_evidence_hash",
    "current_vault_hash",
    "previous_vault_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.id,
      row.kind,
      row.title,
      row.change,
      row.status,
      row.currentStatus,
      row.previousStatus,
      row.recordDelta,
      row.byteDelta,
      row.fileName,
      row.currentEvidenceHash,
      row.previousEvidenceHash,
      row.currentVaultHash,
      row.previousVaultHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(input: {
  currentVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
  previousVault: BoardReleaseArchiveEvidenceRetentionVaultReport | null;
  rows: BoardReleaseArchiveEvidenceDiffSnapshotRow[];
}): BoardReleaseArchiveEvidenceDiffSnapshotReport["summary"] {
  const addedCount = input.rows.filter((row) => row.change === "added").length;
  const changedCount = input.rows.filter((row) => row.change === "changed").length;
  const missingCount = input.rows.filter((row) => row.change === "missing").length;
  const unchangedCount = input.rows.filter((row) => row.change === "unchanged").length;
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const watchCount = input.rows.filter((row) => row.status === "watch").length;
  const status: BoardReleaseArchiveEvidenceDiffSnapshotStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const snapshotScore = Math.max(0, Math.round(100 - missingCount * 24 - changedCount * 10 - addedCount * 6 - blockedCount * 8 - watchCount * 3));

  return {
    addedCount,
    blockedCount,
    changedCount,
    currentVaultHash: input.currentVault.summary.vaultHash,
    missingCount,
    nextAction:
      status === "ready"
        ? "Saved vault baseline matches the current archive evidence automation state."
        : input.previousVault
          ? "Review changed, added, or missing archive evidence bundles before release archive closeout."
          : "Save the current archive evidence retention vault as the first diff baseline.",
    previousVaultHash: input.previousVault?.summary.vaultHash ?? null,
    snapshotHash: sha256(input.rows.map((row) => [row.kind, row.change, row.currentVaultHash, row.previousVaultHash, row.recordDelta, row.byteDelta])),
    snapshotScore,
    status,
    totalCount: input.rows.length,
    unchangedCount,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveEvidenceDiffSnapshotRow[];
  summary: BoardReleaseArchiveEvidenceDiffSnapshotReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveEvidenceDiffSnapshotReport(
  input: CreateBoardReleaseArchiveEvidenceDiffSnapshotReportInput,
): BoardReleaseArchiveEvidenceDiffSnapshotReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.currentVault.workspaceId;
  const previousVault = input.previousVault ?? null;
  const rows = createRows({
    currentVault: input.currentVault,
    generatedAt,
    previousVault,
    workspaceId,
  });
  const summary = summarize({
    currentVault: input.currentVault,
    previousVault,
    rows,
  });
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-evidence-diff-snapshots-${dateStamp(generatedAt)}`;

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
