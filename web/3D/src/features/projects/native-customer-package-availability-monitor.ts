import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeCustomerPackageAvailabilityEndpointKind = "public-download-page" | "self-hosted-archive-mirror" | "updater-endpoint";
export type NativeCustomerPackageAvailabilityStatus = "blocked" | "ready" | "review";
export type NativeCustomerPackageAvailabilityFileFormat = "csv" | "json";

export interface NativeCustomerPackageAvailabilityEndpointInput {
  artifactFileName: string;
  cacheHeaderPresent: boolean;
  checksumSha256: string;
  contentType: string;
  endpointKind: NativeCustomerPackageAvailabilityEndpointKind;
  httpStatus: number;
  lastCheckedAt: string;
  latencyMs: number;
  platform: NativeArtifactStorageHandoffPlatform;
  tlsValid: boolean;
  url: string;
}

export interface NativeCustomerPackageAvailabilityRow {
  artifactFileName: string;
  cacheHeaderPresent: boolean;
  checksumAttached: boolean;
  contentType: string;
  customerSafe: boolean;
  endpointKind: NativeCustomerPackageAvailabilityEndpointKind;
  httpStatus: number;
  lastCheckedAt: string;
  latencyMs: number;
  monitorHash: string;
  nextAction: string;
  platform: NativeArtifactStorageHandoffPlatform;
  reachable: boolean;
  status: NativeCustomerPackageAvailabilityStatus;
  tlsValid: boolean;
  url: string;
}

export interface NativeCustomerPackageAvailabilityFile {
  download: string;
  format: NativeCustomerPackageAvailabilityFileFormat;
  href: string;
  label: string;
}

export interface NativeCustomerPackageAvailabilityMonitor {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeCustomerPackageAvailabilityFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeCustomerPackageAvailabilityRow[];
  summary: {
    archiveMirrorCount: number;
    availabilityScore: number;
    blockedCount: number;
    monitorHash: string;
    nextAction: string;
    publicDownloadCount: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeCustomerPackageAvailabilityStatus;
    updaterEndpointCount: number;
  };
  workspaceId: string;
}

export interface CreateNativeCustomerPackageAvailabilityMonitorInput {
  endpoints: NativeCustomerPackageAvailabilityEndpointInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  workspaceId?: string;
}

const endpointKindRank: Record<NativeCustomerPackageAvailabilityEndpointKind, number> = {
  "public-download-page": 0,
  "updater-endpoint": 1,
  "self-hosted-archive-mirror": 2,
};
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

function hasCustomerContentType(endpointKind: NativeCustomerPackageAvailabilityEndpointKind, contentType: string) {
  const normalized = contentType.trim().toLowerCase();

  if (endpointKind === "updater-endpoint") {
    return normalized.includes("application/json");
  }

  if (endpointKind === "self-hosted-archive-mirror") {
    return normalized.length > 0 && !normalized.includes("text/plain");
  }

  return normalized.includes("text/html");
}

function statusFor(input: {
  cacheHeaderPresent: boolean;
  checksumAttached: boolean;
  customerContentType: boolean;
  latencyMs: number;
  reachable: boolean;
  tlsValid: boolean;
  urlReady: boolean;
}): NativeCustomerPackageAvailabilityStatus {
  if (!input.reachable || !input.tlsValid || !input.urlReady || !input.checksumAttached) {
    return "blocked";
  }

  if (!input.cacheHeaderPresent || !input.customerContentType || input.latencyMs > 2500) {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<NativeCustomerPackageAvailabilityRow, "cacheHeaderPresent" | "checksumAttached" | "customerSafe" | "endpointKind" | "latencyMs" | "platform" | "reachable" | "status" | "tlsValid" | "url">) {
  if (row.status === "blocked") {
    return `Resolve blocked customer-facing package availability for ${row.platform} ${row.endpointKind}.`;
  }

  if (!row.reachable) {
    return `Restore reachable customer package endpoint for ${row.platform} ${row.endpointKind}.`;
  }

  if (!row.tlsValid) {
    return `Renew TLS for customer package endpoint on ${row.platform} ${row.endpointKind}.`;
  }

  if (!row.checksumAttached) {
    return `Attach checksum evidence for customer package endpoint on ${row.platform} ${row.endpointKind}.`;
  }

  if (!row.cacheHeaderPresent) {
    return `Review cache headers for customer package endpoint on ${row.platform} ${row.endpointKind}.`;
  }

  if (row.latencyMs > 2500) {
    return `Reduce customer package endpoint latency for ${row.platform} ${row.endpointKind}.`;
  }

  if (!row.customerSafe || !row.url) {
    return `Review customer-safe package availability metadata for ${row.platform} ${row.endpointKind}.`;
  }

  return `Keep customer-facing package availability current for ${row.platform} ${row.endpointKind}.`;
}

function createRow(input: NativeCustomerPackageAvailabilityEndpointInput): NativeCustomerPackageAvailabilityRow {
  const artifactFileName = input.artifactFileName.trim();
  const checksumAttached = hasSha256(input.checksumSha256);
  const contentType = input.contentType.trim();
  const customerContentType = hasCustomerContentType(input.endpointKind, contentType);
  const reachable = input.httpStatus >= 200 && input.httpStatus < 300 && input.latencyMs > 0;
  const url = input.url.trim();
  const status = statusFor({
    cacheHeaderPresent: input.cacheHeaderPresent,
    checksumAttached,
    customerContentType,
    latencyMs: input.latencyMs,
    reachable,
    tlsValid: input.tlsValid,
    urlReady: url.length > 0,
  });
  const customerSafe = status === "ready" && artifactFileName.length > 0 && customerContentType;
  const rowWithoutHash = {
    artifactFileName,
    cacheHeaderPresent: input.cacheHeaderPresent,
    checksumAttached,
    contentType,
    customerSafe,
    endpointKind: input.endpointKind,
    httpStatus: input.httpStatus,
    lastCheckedAt: input.lastCheckedAt,
    latencyMs: input.latencyMs,
    nextAction: "",
    platform: input.platform,
    reachable,
    status,
    tlsValid: input.tlsValid,
    url,
  } satisfies Omit<NativeCustomerPackageAvailabilityRow, "monitorHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    monitorHash: sha256(row),
  };
}

function createRows(endpoints: NativeCustomerPackageAvailabilityEndpointInput[]) {
  return endpoints
    .map(createRow)
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform] || endpointKindRank[first.endpointKind] - endpointKindRank[second.endpointKind]);
}

function summarize(rows: NativeCustomerPackageAvailabilityRow[]): NativeCustomerPackageAvailabilityMonitor["summary"] {
  const archiveMirrorCount = rows.filter((row) => row.endpointKind === "self-hosted-archive-mirror").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const publicDownloadCount = rows.filter((row) => row.endpointKind === "public-download-page").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const updaterEndpointCount = rows.filter((row) => row.endpointKind === "updater-endpoint").length;
  const status: NativeCustomerPackageAvailabilityStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    archiveMirrorCount,
    availabilityScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 18 - blockedCount * 20))),
    blockedCount,
    monitorHash: sha256(rows.map((row) => row.monitorHash)),
    nextAction:
      status === "blocked"
        ? "Resolve blocked customer-facing package availability before distribution release."
        : status === "review"
          ? "Review customer-facing package availability before distribution release."
          : "Customer-facing package availability is ready for distribution release.",
    publicDownloadCount,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    updaterEndpointCount,
  };
}

function createCsv(rows: NativeCustomerPackageAvailabilityRow[]) {
  const header = ["platform", "endpoint_kind", "status", "reachable", "tls_valid", "checksum_attached", "customer_safe", "latency_ms", "monitor_hash", "next_action"];
  const body = rows.map((row) =>
    [row.platform, row.endpointKind, row.status, row.reachable, row.tlsValid, row.checksumAttached, row.customerSafe, row.latencyMs, row.monitorHash, row.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeCustomerPackageAvailabilityFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV monitor",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON monitor",
    },
  ];
}

export function createNativeCustomerPackageAvailabilityMonitor(input: CreateNativeCustomerPackageAvailabilityMonitorInput): NativeCustomerPackageAvailabilityMonitor {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input.endpoints);
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
  const fileBase = `${slug(workspaceId)}-native-customer-package-availability-monitor-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
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
