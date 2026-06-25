import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeArtifactRuntimeRemediationQueueStatus = "blocked" | "ready" | "review";
export type NativeArtifactRuntimeRemediationQueuePriority = "critical" | "high" | "medium";
export type NativeArtifactRuntimeRemediationQueueFileFormat = "csv" | "json";

export interface NativeArtifactRuntimeRemediationQueueItemInput {
  blockerId: string;
  dueAt: string;
  escalationRoute: string;
  evidencePacketHash: string;
  evidencePacketUrl: string;
  owner: string;
  platform: NativeArtifactStorageHandoffPlatform;
  priority: NativeArtifactRuntimeRemediationQueuePriority;
  remediationAction: string;
  unresolvedBlocker: string;
}

export interface NativeArtifactRuntimeRemediationQueueRow {
  blockerId: string;
  dueAt: string;
  dueDateReady: boolean;
  escalationReady: boolean;
  escalationRoute: string;
  evidencePacketHash: string;
  evidencePacketReady: boolean;
  evidencePacketUrl: string;
  nextAction: string;
  owner: string;
  ownerReady: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  priority: NativeArtifactRuntimeRemediationQueuePriority;
  queueHash: string;
  remediationAction: string;
  remediationReady: boolean;
  status: NativeArtifactRuntimeRemediationQueueStatus;
  unresolvedBlocker: string;
  unresolvedBlockerReady: boolean;
}

export interface NativeArtifactRuntimeRemediationQueueFile {
  download: string;
  format: NativeArtifactRuntimeRemediationQueueFileFormat;
  href: string;
  label: string;
}

export interface NativeArtifactRuntimeRemediationQueueReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeArtifactRuntimeRemediationQueueFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeArtifactRuntimeRemediationQueueRow[];
  summary: {
    blockedCount: number;
    criticalCount: number;
    escalationRouteCount: number;
    evidencePacketCount: number;
    nextAction: string;
    queueHash: string;
    queueScore: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeArtifactRuntimeRemediationQueueStatus;
  };
  workspaceId: string;
}

export interface CreateNativeArtifactRuntimeRemediationQueueInput {
  generatedAt?: string;
  items: NativeArtifactRuntimeRemediationQueueItemInput[];
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
  workspaceId?: string;
}

const defaultRequiredPlatforms: NativeArtifactStorageHandoffPlatform[] = ["windows", "macos", "linux"];
const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
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

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function urlReady(value: string) {
  return value.trim().startsWith("https://");
}

function dueDateReady(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function missingItem(platform: NativeArtifactStorageHandoffPlatform): NativeArtifactRuntimeRemediationQueueItemInput {
  return {
    blockerId: `${platform}-artifact-runtime-remediation-missing`,
    dueAt: "",
    escalationRoute: "",
    evidencePacketHash: "",
    evidencePacketUrl: "",
    owner: "",
    platform,
    priority: "critical",
    remediationAction: "",
    unresolvedBlocker: "",
  };
}

function statusFor(input: {
  dueDateReady: boolean;
  escalationReady: boolean;
  evidencePacketReady: boolean;
  ownerReady: boolean;
  priority: NativeArtifactRuntimeRemediationQueuePriority;
  remediationReady: boolean;
  unresolvedBlockerReady: boolean;
}): NativeArtifactRuntimeRemediationQueueStatus {
  if (!input.ownerReady || !input.dueDateReady || !input.escalationReady || !input.evidencePacketReady || !input.remediationReady || !input.unresolvedBlockerReady) {
    return "blocked";
  }

  return input.priority === "medium" ? "review" : "ready";
}

function nextActionFor(
  row: Pick<
    NativeArtifactRuntimeRemediationQueueRow,
    | "dueDateReady"
    | "escalationReady"
    | "evidencePacketReady"
    | "ownerReady"
    | "platform"
    | "remediationReady"
    | "status"
    | "unresolvedBlockerReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native artifact runtime remediation queue for ${row.platform}.`;
  }

  if (!row.ownerReady) {
    return `Assign native artifact runtime remediation owner for ${row.platform}.`;
  }

  if (!row.dueDateReady) {
    return `Set native artifact runtime remediation due date for ${row.platform}.`;
  }

  if (!row.escalationReady) {
    return `Attach native artifact runtime remediation escalation route for ${row.platform}.`;
  }

  if (!row.evidencePacketReady) {
    return `Attach native artifact runtime remediation evidence packet for ${row.platform}.`;
  }

  if (!row.unresolvedBlockerReady) {
    return `Describe unresolved native artifact runtime blocker for ${row.platform}.`;
  }

  if (!row.remediationReady) {
    return `Write concrete native artifact runtime remediation action for ${row.platform}.`;
  }

  return `Keep native artifact runtime remediation evidence current for ${row.platform}.`;
}

function createRow(input: NativeArtifactRuntimeRemediationQueueItemInput): NativeArtifactRuntimeRemediationQueueRow {
  const blockerId = input.blockerId.trim() || `${input.platform}-artifact-runtime-remediation`;
  const dueAt = input.dueAt.trim();
  const escalationRoute = input.escalationRoute.trim();
  const evidencePacketHash = input.evidencePacketHash.trim() || "missing";
  const evidencePacketUrl = input.evidencePacketUrl.trim();
  const owner = input.owner.trim();
  const remediationAction = input.remediationAction.trim();
  const unresolvedBlocker = input.unresolvedBlocker.trim();
  const rowWithoutHash = {
    blockerId,
    dueAt,
    dueDateReady: dueDateReady(dueAt),
    escalationReady: escalationRoute.length > 0,
    escalationRoute,
    evidencePacketHash,
    evidencePacketReady: hasSha256(evidencePacketHash) && urlReady(evidencePacketUrl),
    evidencePacketUrl,
    nextAction: "",
    owner,
    ownerReady: owner.length > 0,
    platform: input.platform,
    priority: input.priority,
    remediationAction,
    remediationReady: remediationAction.length >= 20,
    status: "blocked",
    unresolvedBlocker,
    unresolvedBlockerReady: unresolvedBlocker.length >= 10,
  } satisfies Omit<NativeArtifactRuntimeRemediationQueueRow, "queueHash">;
  const status = statusFor(rowWithoutHash);
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor({ ...rowWithoutHash, status }),
    status,
  };

  return {
    ...row,
    queueHash: sha256(row),
  };
}

function createRows(input: CreateNativeArtifactRuntimeRemediationQueueInput) {
  const itemsByPlatform = new Map(input.items.map((item) => [item.platform, item]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(itemsByPlatform.get(platform) ?? missingItem(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeArtifactRuntimeRemediationQueueRow[]): NativeArtifactRuntimeRemediationQueueReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const criticalCount = rows.filter((row) => row.priority === "critical").length;
  const escalationRouteCount = rows.filter((row) => row.escalationReady).length;
  const evidencePacketCount = rows.filter((row) => row.evidencePacketReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeArtifactRuntimeRemediationQueueStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    criticalCount,
    escalationRouteCount,
    evidencePacketCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native artifact runtime remediation queue before closeout release."
        : status === "review"
          ? "Review native artifact runtime remediation queue before closeout release."
          : "Native artifact runtime remediation queue is ready for closeout release.",
    queueHash: sha256(rows.map((row) => row.queueHash)),
    queueScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeArtifactRuntimeRemediationQueueRow[]) {
  const header = ["platform", "status", "priority", "owner_ready", "due_date_ready", "escalation_ready", "evidence_packet_ready", "queue_hash", "next_action"];
  const body = rows.map((row) =>
    [row.platform, row.status, row.priority, row.ownerReady, row.dueDateReady, row.escalationReady, row.evidencePacketReady, row.queueHash, row.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): NativeArtifactRuntimeRemediationQueueFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV queue",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON queue",
    },
  ];
}

export function createNativeArtifactRuntimeRemediationQueue(input: CreateNativeArtifactRuntimeRemediationQueueInput): NativeArtifactRuntimeRemediationQueueReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-artifact-runtime-remediation-queue-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({ csvDataUri, csvFileName, jsonDataUri, jsonFileName }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
