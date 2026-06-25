import type {
  BoardAuditEvidenceAttachment,
  BoardAuditEvidenceAttachmentManifest,
  BoardAuditEvidenceManifestRow,
} from "@/features/projects/board-audit-evidence-manifest";
import type { SignedAuditEvidencePacketVerificationRow } from "@/features/projects/signed-audit-evidence-packets";

export type BoardAuditEvidenceVerificationCheckKind = "duplicate-attachment" | "missing-file" | "stale-hash" | "unsigned-export";
export type BoardAuditEvidenceVerificationStatus = "blocked" | "ready" | "watch";

export interface BoardAuditEvidenceVerificationCheck {
  detail: string;
  kind: BoardAuditEvidenceVerificationCheckKind;
  status: BoardAuditEvidenceVerificationStatus;
}

export interface BoardAuditEvidenceVerificationRow {
  checks: BoardAuditEvidenceVerificationCheck[];
  duplicateAttachmentCount: number;
  missingFileCount: number;
  nextAction: string;
  score: number;
  staleHashCount: number;
  status: BoardAuditEvidenceVerificationStatus;
  taskId: string;
  title: string;
  unsignedExportCount: number;
}

export interface BoardAuditEvidenceVerificationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardAuditEvidenceVerificationRow[];
  summary: {
    duplicateAttachmentCount: number;
    missingFileCount: number;
    readyRowCount: number;
    staleHashCount: number;
    status: BoardAuditEvidenceVerificationStatus;
    taskCount: number;
    unsignedExportCount: number;
    verificationScore: number;
    watchRowCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardAuditEvidenceVerificationReportInput {
  generatedAt?: string;
  manifest: BoardAuditEvidenceAttachmentManifest;
  signedPacketVerification?: {
    rows: Pick<SignedAuditEvidencePacketVerificationRow, "contentHash" | "status" | "verificationState">[];
  } | null;
  sourceFreshness?: Map<string, "fresh" | "stale" | "unknown">;
  workspaceId?: string;
}

const statusRank: Record<BoardAuditEvidenceVerificationStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
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

function exportedFiles(row: BoardAuditEvidenceManifestRow) {
  return row.attachments.filter((attachment) => attachment.kind === "exported-file");
}

function missingFileChecks(row: BoardAuditEvidenceManifestRow): BoardAuditEvidenceVerificationCheck[] {
  if (row.linkedFileCount > 0) {
    return [];
  }

  return [
    {
      detail: `Attach exported evidence file for ${row.title}.`,
      kind: "missing-file",
      status: "blocked",
    },
  ];
}

function staleHashChecks(row: BoardAuditEvidenceManifestRow, sourceFreshness: Map<string, "fresh" | "stale" | "unknown">): BoardAuditEvidenceVerificationCheck[] {
  const freshness = sourceFreshness.get(row.taskId) ?? "unknown";

  if (freshness !== "stale") {
    return [];
  }

  return [
    {
      detail: `Refresh stale source hash for ${row.title}.`,
      kind: "stale-hash",
      status: "watch",
    },
  ];
}

function duplicateChecks(row: BoardAuditEvidenceManifestRow, duplicateHashes: Set<string>): BoardAuditEvidenceVerificationCheck[] {
  const duplicates = exportedFiles(row).filter((attachment) => duplicateHashes.has(attachment.contentHash));

  return duplicates.map((attachment) => ({
    detail: `Resolve duplicate exported attachment hash for ${attachment.label}.`,
    kind: "duplicate-attachment" as const,
    status: "watch" as const,
  }));
}

function unsignedExportChecks(
  row: BoardAuditEvidenceManifestRow,
  signedRowsByHash: Map<string, Pick<SignedAuditEvidencePacketVerificationRow, "contentHash" | "status" | "verificationState">>,
): BoardAuditEvidenceVerificationCheck[] {
  return exportedFiles(row)
    .filter((attachment) => signedRowsByHash.get(attachment.contentHash)?.status !== "ready")
    .map((attachment) => {
      const signedRow = signedRowsByHash.get(attachment.contentHash);

      return {
        detail: signedRow
          ? `Resolve ${signedRow.verificationState} signature state for ${attachment.label}.`
          : `Attach a verified signature for ${attachment.label}.`,
        kind: "unsigned-export" as const,
        status: "blocked" as const,
      };
    });
}

function duplicateHashes(rows: BoardAuditEvidenceManifestRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const attachment of exportedFiles(row)) {
      counts.set(attachment.contentHash, (counts.get(attachment.contentHash) ?? 0) + 1);
    }
  }

  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([hash]) => hash));
}

function checkCount(checks: BoardAuditEvidenceVerificationCheck[], kind: BoardAuditEvidenceVerificationCheckKind) {
  return checks.filter((check) => check.kind === kind).length;
}

function rowStatus(checks: BoardAuditEvidenceVerificationCheck[]): BoardAuditEvidenceVerificationStatus {
  if (checks.some((check) => check.status === "blocked")) {
    return "blocked";
  }

  return checks.some((check) => check.status === "watch") ? "watch" : "ready";
}

function rowScore(checks: BoardAuditEvidenceVerificationCheck[]) {
  return Math.max(
    0,
    Math.min(
      100,
      100 -
        checkCount(checks, "missing-file") * 35 -
        checkCount(checks, "unsigned-export") * 30 -
        checkCount(checks, "stale-hash") * 12 -
        checkCount(checks, "duplicate-attachment") * 9,
    ),
  );
}

function rowNextAction(row: BoardAuditEvidenceManifestRow, checks: BoardAuditEvidenceVerificationCheck[]) {
  const firstBlocked = checks.find((check) => check.status === "blocked") ?? null;
  const firstWatch = checks.find((check) => check.status === "watch") ?? null;

  return firstBlocked?.detail ?? firstWatch?.detail ?? `Evidence verification is ready for ${row.title}.`;
}

function createRows(input: CreateBoardAuditEvidenceVerificationReportInput): BoardAuditEvidenceVerificationRow[] {
  const duplicateHashSet = duplicateHashes(input.manifest.rows);
  const sourceFreshness = input.sourceFreshness ?? new Map<string, "fresh" | "stale" | "unknown">();
  const signedRowsByHash = new Map((input.signedPacketVerification?.rows ?? []).map((row) => [row.contentHash, row]));

  return input.manifest.rows
    .map((row) => {
      const checks = [
        ...missingFileChecks(row),
        ...staleHashChecks(row, sourceFreshness),
        ...duplicateChecks(row, duplicateHashSet),
        ...unsignedExportChecks(row, signedRowsByHash),
      ];

      return {
        checks,
        duplicateAttachmentCount: checkCount(checks, "duplicate-attachment"),
        missingFileCount: checkCount(checks, "missing-file"),
        nextAction: rowNextAction(row, checks),
        score: rowScore(checks),
        staleHashCount: checkCount(checks, "stale-hash"),
        status: rowStatus(checks),
        taskId: row.taskId,
        title: row.title,
        unsignedExportCount: checkCount(checks, "unsigned-export"),
      };
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.score - second.score || first.title.localeCompare(second.title));
}

function summarize(rows: BoardAuditEvidenceVerificationRow[]): BoardAuditEvidenceVerificationReport["summary"] {
  const missingFileCount = rows.reduce((sum, row) => sum + row.missingFileCount, 0);
  const staleHashCount = rows.reduce((sum, row) => sum + row.staleHashCount, 0);
  const duplicateAttachmentCount = rows.reduce((sum, row) => sum + row.duplicateAttachmentCount, 0);
  const unsignedExportCount = rows.reduce((sum, row) => sum + row.unsignedExportCount, 0);
  const blockedRow = rows.find((row) => row.status === "blocked") ?? null;
  const watchRow = rows.find((row) => row.status === "watch") ?? null;

  return {
    duplicateAttachmentCount,
    missingFileCount,
    nextAction: blockedRow?.nextAction ?? watchRow?.nextAction ?? "Board audit evidence verification is ready for reviewer acceptance.",
    readyRowCount: rows.filter((row) => row.status === "ready").length,
    staleHashCount,
    status: blockedRow ? "blocked" : watchRow ? "watch" : "ready",
    taskCount: rows.length,
    unsignedExportCount,
    verificationScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    watchRowCount: rows.filter((row) => row.status === "watch").length,
  };
}

function createCsv(rows: BoardAuditEvidenceVerificationRow[]) {
  const header = ["task_id", "status", "score", "missing_files", "stale_hashes", "duplicates", "unsigned_exports", "next_action"];
  const body = rows.map((row) =>
    [
      row.taskId,
      row.status,
      row.score,
      row.missingFileCount,
      row.staleHashCount,
      row.duplicateAttachmentCount,
      row.unsignedExportCount,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardAuditEvidenceVerificationReport(input: CreateBoardAuditEvidenceVerificationReportInput): BoardAuditEvidenceVerificationReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.manifest.workspaceId;
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-audit-evidence-verification-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary,
    workspaceId,
  };
}
