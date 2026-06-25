import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCustodyAccessReviewQueueReport } from "@/features/projects/board-release-archive-custody-access-review-queue";
import type {
  BoardReleaseArchiveCustodyRetentionLockRow,
  BoardReleaseArchiveCustodyRetentionLockWorkflowReport,
} from "@/features/projects/board-release-archive-custody-retention-lock-workflow";

export type BoardReleaseArchiveCustodyRestoreRehearsalStatus = "drift" | "missing" | "restored";

export interface BoardReleaseArchiveCustodyRestoreEvidence {
  artifact: string;
  reconstructedHash: string | null;
  sourceHash: string;
}

export interface BoardReleaseArchiveCustodyRestoreRehearsalPacketRow {
  artifact: string;
  id: string;
  nextAction: string;
  reconstructedHash: string | null;
  restoreHash: string;
  sourceHash: string;
  status: BoardReleaseArchiveCustodyRestoreRehearsalStatus;
}

export interface BoardReleaseArchiveCustodyRestoreRehearsalPacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCustodyRestoreRehearsalPacketRow[];
  summary: {
    driftCount: number;
    missingCount: number;
    nextAction: string;
    restorePacketHash: string;
    restoreScore: number;
    restoredCount: number;
    rowCount: number;
    status: "blocked" | "restored" | "watch";
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCustodyRestoreRehearsalPacketInput {
  accessReviewQueue: BoardReleaseArchiveCustodyAccessReviewQueueReport;
  generatedAt?: string;
  restoreEvidence?: BoardReleaseArchiveCustodyRestoreEvidence[];
  retentionLockWorkflow: BoardReleaseArchiveCustodyRetentionLockWorkflowReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveCustodyRestoreRehearsalStatus, number> = {
  missing: 0,
  drift: 1,
  restored: 2,
};

const artifactRank: Record<string, number> = {
  "final acceptance packet": 0,
  "distribution proof bundle": 1,
  "readiness timeline export": 2,
  "executive recommendation": 3,
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

function defaultRestoreEvidence(rows: BoardReleaseArchiveCustodyRetentionLockRow[]) {
  return rows.map((entry) => ({
    artifact: entry.artifact,
    reconstructedHash: entry.evidenceHash,
    sourceHash: entry.evidenceHash,
  })) satisfies BoardReleaseArchiveCustodyRestoreEvidence[];
}

function statusFor(input: BoardReleaseArchiveCustodyRestoreEvidence): BoardReleaseArchiveCustodyRestoreRehearsalStatus {
  if (!input.reconstructedHash) {
    return "missing";
  }

  return input.reconstructedHash === input.sourceHash ? "restored" : "drift";
}

function nextActionFor(input: {
  artifact: string;
  status: BoardReleaseArchiveCustodyRestoreRehearsalStatus;
}) {
  if (input.status === "missing") {
    return `Reconstruct missing archive custody evidence for ${input.artifact}.`;
  }

  if (input.status === "drift") {
    return `Resolve reconstructed hash drift for ${input.artifact}.`;
  }

  return `Keep ${input.artifact} restore rehearsal evidence attached to custody closeout.`;
}

function createRows(input: CreateBoardReleaseArchiveCustodyRestoreRehearsalPacketInput & { workspaceId: string }) {
  const evidence = input.restoreEvidence && input.restoreEvidence.length > 0 ? input.restoreEvidence : defaultRestoreEvidence(input.retentionLockWorkflow.rows ?? []);

  return evidence
    .map((entry) => {
      const status = statusFor(entry);
      const restoreHash = sha256({
        accessReviewHash: input.accessReviewQueue.summary.accessReviewHash,
        artifact: entry.artifact,
        reconstructedHash: entry.reconstructedHash,
        sourceHash: entry.sourceHash,
        status,
      });

      return {
        artifact: entry.artifact,
        id: `archive-custody-restore-rehearsal:${slug(input.workspaceId)}:${slug(entry.artifact)}`,
        nextAction: nextActionFor({
          artifact: entry.artifact,
          status,
        }),
        reconstructedHash: entry.reconstructedHash,
        restoreHash,
        sourceHash: entry.sourceHash,
        status,
      } satisfies BoardReleaseArchiveCustodyRestoreRehearsalPacketRow;
    })
    .sort((first, second) => (artifactRank[first.artifact] ?? 99) - (artifactRank[second.artifact] ?? 99) || statusRank[first.status] - statusRank[second.status] || first.artifact.localeCompare(second.artifact));
}

function createCsv(rows: BoardReleaseArchiveCustodyRestoreRehearsalPacketRow[]) {
  const header = ["restore_rehearsal_id", "artifact", "status", "source_hash", "reconstructed_hash", "restore_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.artifact, entry.status, entry.sourceHash, entry.reconstructedHash, entry.restoreHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCustodyRestoreRehearsalPacketRow[]): BoardReleaseArchiveCustodyRestoreRehearsalPacketReport["summary"] {
  const restoredCount = rows.filter((entry) => entry.status === "restored").length;
  const missingCount = rows.filter((entry) => entry.status === "missing").length;
  const driftCount = rows.filter((entry) => entry.status === "drift").length;
  const status: BoardReleaseArchiveCustodyRestoreRehearsalPacketReport["summary"]["status"] =
    missingCount > 0 ? "blocked" : driftCount > 0 ? "watch" : "restored";
  const nextRow = rows.find((entry) => entry.status === "missing") ?? rows.find((entry) => entry.status === "drift") ?? rows[0] ?? null;

  return {
    driftCount,
    missingCount,
    nextAction: status === "restored" ? "Archive custody restore rehearsal packet is reconstructed." : (nextRow?.nextAction ?? "Review archive custody restore rehearsal packet."),
    restorePacketHash: sha256(rows.map((entry) => entry.restoreHash)),
    restoreScore: rows.length > 0 ? Math.max(0, Math.round((restoredCount / rows.length) * 100 - missingCount * 28 - driftCount * 18)) : 100,
    restoredCount,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCustodyRestoreRehearsalPacketRow[];
  summary: BoardReleaseArchiveCustodyRestoreRehearsalPacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCustodyRestoreRehearsalPacket(
  input: CreateBoardReleaseArchiveCustodyRestoreRehearsalPacketInput,
): BoardReleaseArchiveCustodyRestoreRehearsalPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.retentionLockWorkflow.workspaceId;
  const rows = createRows({
    ...input,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-custody-restore-rehearsal-packet-${dateStamp(generatedAt)}`;

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
