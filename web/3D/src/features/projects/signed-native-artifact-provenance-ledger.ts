import { createHash } from "node:crypto";

export type SignedNativeArtifactProvenanceKind =
  | "desktop-updater-manifest"
  | "fixture-validation"
  | "os-signing-plan"
  | "release-channel-promotion";

export type SignedNativeArtifactProvenanceStatus = "blocked" | "ready" | "review";

export interface SignedNativeArtifactProvenanceRow {
  evidenceHash: string;
  id: string;
  kind: SignedNativeArtifactProvenanceKind;
  nextAction: string;
  ownerRole: string;
  provenanceHash: string;
  status: SignedNativeArtifactProvenanceStatus;
  title: string;
}

export interface SignedNativeArtifactProvenanceLedgerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: SignedNativeArtifactProvenanceRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    provenanceHash: string;
    provenanceScore: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: SignedNativeArtifactProvenanceStatus;
  };
  workspaceId: string;
}

export interface CreateSignedNativeArtifactProvenanceLedgerInput {
  fixtureValidationStatus?: SignedNativeArtifactProvenanceStatus;
  generatedAt?: string;
  releaseChannelStatus?: SignedNativeArtifactProvenanceStatus;
  signingPlanStatus?: SignedNativeArtifactProvenanceStatus;
  updaterManifestStatus?: SignedNativeArtifactProvenanceStatus;
  workspaceId?: string;
}

const kindRank: Record<SignedNativeArtifactProvenanceKind, number> = {
  "desktop-updater-manifest": 0,
  "os-signing-plan": 1,
  "fixture-validation": 2,
  "release-channel-promotion": 3,
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

function nextActionFor(input: { kind: SignedNativeArtifactProvenanceKind; status: SignedNativeArtifactProvenanceStatus }) {
  if (input.status === "blocked") {
    return `Repair blocked signed native artifact provenance for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review signed native artifact provenance for ${input.kind}.`;
  }

  return `Keep signed native artifact provenance ready for ${input.kind}.`;
}

function createRow(input: {
  kind: SignedNativeArtifactProvenanceKind;
  ownerRole: string;
  status: SignedNativeArtifactProvenanceStatus;
  title: string;
  workspaceId: string;
}) {
  const evidenceHash = sha256({
    kind: input.kind,
    ownerRole: input.ownerRole,
    status: input.status,
    title: input.title,
    workspaceId: input.workspaceId,
  });
  const nextAction = nextActionFor({
    kind: input.kind,
    status: input.status,
  });
  const provenanceHash = sha256({
    evidenceHash,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    status: input.status,
  });

  return {
    evidenceHash,
    id: `signed-native-artifact-provenance:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    provenanceHash,
    status: input.status,
    title: input.title,
  } satisfies SignedNativeArtifactProvenanceRow;
}

function createRows(input: Required<Pick<CreateSignedNativeArtifactProvenanceLedgerInput, "fixtureValidationStatus" | "releaseChannelStatus" | "signingPlanStatus" | "updaterManifestStatus">> & {
  workspaceId: string;
}) {
  return [
    createRow({
      kind: "desktop-updater-manifest",
      ownerRole: "desktop release owner",
      status: input.updaterManifestStatus,
      title: "Desktop updater manifest provenance",
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "os-signing-plan",
      ownerRole: "release signing owner",
      status: input.signingPlanStatus,
      title: "OS signing plan provenance",
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "fixture-validation",
      ownerRole: "release QA owner",
      status: input.fixtureValidationStatus,
      title: "Signed artifact fixture validation",
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "release-channel-promotion",
      ownerRole: "release manager",
      status: input.releaseChannelStatus,
      title: "Release channel promotion evidence",
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: SignedNativeArtifactProvenanceRow[]): SignedNativeArtifactProvenanceLedgerReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: SignedNativeArtifactProvenanceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const provenanceScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 - reviewCount * 8 - blockedCount * 20));
  const nextRow = rows.find((row) => row.status === "blocked") ?? rows.find((row) => row.status === "review") ?? null;

  return {
    blockedCount,
    nextAction: nextRow?.nextAction ?? "Signed native artifact provenance ledger is ready.",
    provenanceHash: sha256(rows.map((row) => row.provenanceHash)),
    provenanceScore,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: SignedNativeArtifactProvenanceRow[]) {
  const header = ["artifact_id", "kind", "title", "status", "owner_role", "evidence_hash", "provenance_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.title, row.status, row.ownerRole, row.evidenceHash, row.provenanceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: SignedNativeArtifactProvenanceRow[];
  summary: SignedNativeArtifactProvenanceLedgerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createSignedNativeArtifactProvenanceLedger(input: CreateSignedNativeArtifactProvenanceLedgerInput = {}): SignedNativeArtifactProvenanceLedgerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows({
    fixtureValidationStatus: input.fixtureValidationStatus ?? "ready",
    releaseChannelStatus: input.releaseChannelStatus ?? "ready",
    signingPlanStatus: input.signingPlanStatus ?? "ready",
    updaterManifestStatus: input.updaterManifestStatus ?? "ready",
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
  const fileBase = `${slug(workspaceId)}-signed-native-artifact-provenance-ledger-${dateStamp(generatedAt)}`;

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
