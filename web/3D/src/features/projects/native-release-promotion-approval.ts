import { createHash } from "node:crypto";
import type { CadRuntimeAcceptancePacketReport, CadRuntimeAcceptanceStatus } from "@/features/projects/cad-runtime-acceptance-packet";
import type {
  SignedNativePackageReadinessPacketReport,
  SignedNativePackageReadinessStatus,
} from "@/features/projects/signed-native-package-readiness-packet";

export type NativeReleasePromotionApprovalKind =
  | "cad-runtime-acceptance"
  | "operator-approval"
  | "rollback-evidence"
  | "signed-package-readiness";
export type NativeReleasePromotionApprovalStatus = "blocked" | "ready" | "review";

export interface NativeReleasePromotionApprovalRow {
  evidence: string;
  evidenceHash: string;
  id: string;
  kind: NativeReleasePromotionApprovalKind;
  nextAction: string;
  status: NativeReleasePromotionApprovalStatus;
  title: string;
}

export interface NativeReleasePromotionApprovalReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: NativeReleasePromotionApprovalRow[];
  summary: {
    approvalHash: string;
    approvalScore: number;
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeReleasePromotionApprovalStatus;
  };
  workspaceId: string;
}

export interface CreateNativeReleasePromotionApprovalInput {
  cadRuntimeAcceptance: CadRuntimeAcceptancePacketReport;
  generatedAt?: string;
  operatorApprovalStatus?: NativeReleasePromotionApprovalStatus;
  operatorName?: string;
  rollbackEvidenceStatus?: NativeReleasePromotionApprovalStatus;
  rollbackPlanHash?: string | null;
  signedPackageReadiness: SignedNativePackageReadinessPacketReport;
  workspaceId?: string;
}

const kindRank: Record<NativeReleasePromotionApprovalKind, number> = {
  "signed-package-readiness": 0,
  "cad-runtime-acceptance": 1,
  "operator-approval": 2,
  "rollback-evidence": 3,
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

function statusFromSignedPacket(status: SignedNativePackageReadinessStatus): NativeReleasePromotionApprovalStatus {
  return status;
}

function statusFromCadAcceptance(status: CadRuntimeAcceptanceStatus): NativeReleasePromotionApprovalStatus {
  return status;
}

function nextActionFor(input: { kind: NativeReleasePromotionApprovalKind; status: NativeReleasePromotionApprovalStatus }) {
  if (input.status === "blocked") {
    return `Resolve native release promotion blockers for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review native release promotion approval evidence for ${input.kind}.`;
  }

  return `Keep native release promotion approval evidence current for ${input.kind}.`;
}

function createRow(input: {
  evidence: string;
  id: string;
  kind: NativeReleasePromotionApprovalKind;
  status: NativeReleasePromotionApprovalStatus;
  title: string;
}) {
  const nextAction = nextActionFor({
    kind: input.kind,
    status: input.status,
  });
  const evidenceHash = sha256({
    evidence: input.evidence,
    id: input.id,
    kind: input.kind,
    nextAction,
    status: input.status,
    title: input.title,
  });

  return {
    ...input,
    evidenceHash,
    nextAction,
  } satisfies NativeReleasePromotionApprovalRow;
}

function createRows(input: Required<Pick<CreateNativeReleasePromotionApprovalInput, "operatorApprovalStatus" | "rollbackEvidenceStatus">> & {
  cadRuntimeAcceptance: CadRuntimeAcceptancePacketReport;
  operatorName?: string;
  rollbackPlanHash?: string | null;
  signedPackageReadiness: SignedNativePackageReadinessPacketReport;
  workspaceId: string;
}) {
  const operatorName = input.operatorName?.trim() || "unassigned";
  const rollbackPlanHash = input.rollbackPlanHash?.trim() || "pending";

  return [
    createRow({
      evidence: `${input.signedPackageReadiness.summary.readinessScore}/100 signed package, ${input.signedPackageReadiness.summary.packetHash}`,
      id: `native-release-promotion-approval:${slug(input.workspaceId)}:signed-package-readiness`,
      kind: "signed-package-readiness",
      status: statusFromSignedPacket(input.signedPackageReadiness.summary.status),
      title: "Signed package readiness",
    }),
    createRow({
      evidence: `${input.cadRuntimeAcceptance.summary.acceptanceScore}/100 CAD runtime, ${input.cadRuntimeAcceptance.summary.acceptanceHash}`,
      id: `native-release-promotion-approval:${slug(input.workspaceId)}:cad-runtime-acceptance`,
      kind: "cad-runtime-acceptance",
      status: statusFromCadAcceptance(input.cadRuntimeAcceptance.summary.status),
      title: "CAD runtime acceptance",
    }),
    createRow({
      evidence: `Operator approval by ${operatorName}.`,
      id: `native-release-promotion-approval:${slug(input.workspaceId)}:operator-approval`,
      kind: "operator-approval",
      status: input.operatorApprovalStatus,
      title: "Operator approval",
    }),
    createRow({
      evidence: `Rollback plan hash ${rollbackPlanHash}.`,
      id: `native-release-promotion-approval:${slug(input.workspaceId)}:rollback-evidence`,
      kind: "rollback-evidence",
      status: input.rollbackEvidenceStatus,
      title: "Rollback evidence",
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: NativeReleasePromotionApprovalRow[]): NativeReleasePromotionApprovalReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeReleasePromotionApprovalStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const approvalScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 12 - blockedCount * 18));

  return {
    approvalHash: sha256(rows.map((row) => row.evidenceHash)),
    approvalScore,
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve native release promotion blockers before production promotion."
        : status === "review"
          ? "Review native release promotion approval evidence before production promotion."
          : "Native release promotion approval is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeReleasePromotionApprovalRow[]) {
  const header = ["approval_id", "kind", "title", "status", "evidence_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.title, row.status, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: NativeReleasePromotionApprovalRow[];
  summary: NativeReleasePromotionApprovalReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createNativeReleasePromotionApproval(input: CreateNativeReleasePromotionApprovalInput): NativeReleasePromotionApprovalReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.signedPackageReadiness.workspaceId ?? input.cadRuntimeAcceptance.workspaceId ?? "workspace";
  const rows = createRows({
    cadRuntimeAcceptance: input.cadRuntimeAcceptance,
    operatorApprovalStatus: input.operatorApprovalStatus ?? "review",
    operatorName: input.operatorName,
    rollbackEvidenceStatus: input.rollbackEvidenceStatus ?? "review",
    rollbackPlanHash: input.rollbackPlanHash,
    signedPackageReadiness: input.signedPackageReadiness,
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
  const fileBase = `${slug(workspaceId)}-native-release-promotion-approval-${dateStamp(generatedAt)}`;

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
