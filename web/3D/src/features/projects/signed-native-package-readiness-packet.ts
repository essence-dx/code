import { createHash } from "node:crypto";
import type { DesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import type { SignedNativeArtifactProvenanceLedgerReport, SignedNativeArtifactProvenanceStatus } from "@/features/projects/signed-native-artifact-provenance-ledger";

export type SignedNativePackageReadinessKind = "artifact-provenance" | "release-recommendation" | "signing-evidence" | "updater-metadata";
export type SignedNativePackageReadinessStatus = "blocked" | "ready" | "review";

export interface SignedNativePackageReadinessRow {
  evidence: string;
  evidenceHash: string;
  id: string;
  kind: SignedNativePackageReadinessKind;
  nextAction: string;
  status: SignedNativePackageReadinessStatus;
  title: string;
}

export interface SignedNativePackageReadinessPacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: SignedNativePackageReadinessRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    packetHash: string;
    readinessScore: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: SignedNativePackageReadinessStatus;
  };
  workspaceId: string;
}

export interface CreateSignedNativePackageReadinessPacketInput {
  artifactProvenance: SignedNativeArtifactProvenanceLedgerReport;
  generatedAt?: string;
  releaseRecommendationStatus?: SignedNativePackageReadinessStatus;
  signingPlan: DesktopSigningPlan;
  updaterMetadataStatus?: SignedNativePackageReadinessStatus;
  workspaceId?: string;
}

const kindRank: Record<SignedNativePackageReadinessKind, number> = {
  "artifact-provenance": 0,
  "signing-evidence": 1,
  "updater-metadata": 2,
  "release-recommendation": 3,
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

function statusFromProvenance(status: SignedNativeArtifactProvenanceStatus): SignedNativePackageReadinessStatus {
  return status;
}

function signingStatus(signingPlan: DesktopSigningPlan): SignedNativePackageReadinessStatus {
  if (signingPlan.ready) {
    return "ready";
  }

  const readyCount = signingPlan.platforms.filter((platform) => platform.ready).length;

  return readyCount > 0 ? "review" : "blocked";
}

function nextActionFor(input: { kind: SignedNativePackageReadinessKind; status: SignedNativePackageReadinessStatus }) {
  if (input.status === "blocked") {
    return `Resolve signed native package blockers for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review signed native package readiness evidence for ${input.kind}.`;
  }

  return `Keep signed native package readiness evidence current for ${input.kind}.`;
}

function createRow(input: {
  evidence: string;
  id: string;
  kind: SignedNativePackageReadinessKind;
  status: SignedNativePackageReadinessStatus;
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
  } satisfies SignedNativePackageReadinessRow;
}

function createRows(input: Required<Pick<CreateSignedNativePackageReadinessPacketInput, "releaseRecommendationStatus" | "updaterMetadataStatus">> & {
  artifactProvenance: SignedNativeArtifactProvenanceLedgerReport;
  signingPlan: DesktopSigningPlan;
  workspaceId: string;
}) {
  const signingReadyCount = input.signingPlan.platforms.filter((platform) => platform.ready).length;

  return [
    createRow({
      evidence: `${input.artifactProvenance.summary.provenanceScore}/100 provenance, ${input.artifactProvenance.summary.provenanceHash}`,
      id: `signed-native-package-readiness:${slug(input.workspaceId)}:artifact-provenance`,
      kind: "artifact-provenance",
      status: statusFromProvenance(input.artifactProvenance.summary.status),
      title: "Artifact provenance",
    }),
    createRow({
      evidence: `${signingReadyCount}/${input.signingPlan.platforms.length} signing workflows ready; ${input.signingPlan.missingRequiredSecrets.length} required secrets missing.`,
      id: `signed-native-package-readiness:${slug(input.workspaceId)}:signing-evidence`,
      kind: "signing-evidence",
      status: signingStatus(input.signingPlan),
      title: "Signing evidence",
    }),
    createRow({
      evidence: "Updater metadata requires signed manifest, updater signature, version target, platform architecture, and channel promotion evidence.",
      id: `signed-native-package-readiness:${slug(input.workspaceId)}:updater-metadata`,
      kind: "updater-metadata",
      status: input.updaterMetadataStatus,
      title: "Updater metadata",
    }),
    createRow({
      evidence: "Release recommendation combines provenance status, signing evidence, updater metadata, and channel promotion readiness.",
      id: `signed-native-package-readiness:${slug(input.workspaceId)}:release-recommendation`,
      kind: "release-recommendation",
      status: input.releaseRecommendationStatus,
      title: "Release recommendation",
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: SignedNativePackageReadinessRow[]): SignedNativePackageReadinessPacketReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: SignedNativePackageReadinessStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const readinessScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 12 - blockedCount * 18));

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve signed native package blockers before release promotion."
        : status === "review"
          ? "Review signed native package readiness evidence before release promotion."
          : "Signed native package readiness packet is ready.",
    packetHash: sha256(rows.map((row) => row.evidenceHash)),
    readinessScore,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: SignedNativePackageReadinessRow[]) {
  const header = ["section_id", "kind", "title", "status", "evidence_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.title, row.status, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: SignedNativePackageReadinessRow[];
  summary: SignedNativePackageReadinessPacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createSignedNativePackageReadinessPacket(input: CreateSignedNativePackageReadinessPacketInput): SignedNativePackageReadinessPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.artifactProvenance.workspaceId ?? "workspace";
  const rows = createRows({
    artifactProvenance: input.artifactProvenance,
    releaseRecommendationStatus: input.releaseRecommendationStatus ?? "ready",
    signingPlan: input.signingPlan,
    updaterMetadataStatus: input.updaterMetadataStatus ?? "ready",
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
  const fileBase = `${slug(workspaceId)}-signed-native-package-readiness-packet-${dateStamp(generatedAt)}`;

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
