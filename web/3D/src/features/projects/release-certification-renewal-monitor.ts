import { createHash } from "node:crypto";

export type ReleaseCertificationRenewalKind =
  | "archive-retention-renewal"
  | "cad-runtime-proof-renewal"
  | "certificate-signing-evidence";

export type ReleaseCertificationRenewalStatus =
  | "blocked"
  | "ready"
  | "watch";

export type ReleaseCertificationRenewalSummaryStatus =
  | "blocked"
  | "ready"
  | "watch";

export type ReleaseCertificationRenewalFileFormat = "csv" | "json";

export interface ReleaseCertificationRenewalInput {
  readonly evidenceHash?: string;
  readonly evidenceUrl?: string;
  readonly kind: ReleaseCertificationRenewalKind;
  readonly lastRenewedAt?: string;
  readonly owner?: string;
  readonly renewalProofHash?: string;
  readonly renewBy?: string;
}

export interface ReleaseCertificationRenewalMonitorInput {
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly renewals: readonly ReleaseCertificationRenewalInput[];
  readonly requiredKinds?: readonly ReleaseCertificationRenewalKind[];
  readonly workspaceId?: string;
}

export interface ReleaseCertificationRenewalRow
  extends Required<ReleaseCertificationRenewalInput> {
  readonly daysSinceRenewal: number;
  readonly daysUntilRenewal: number;
  readonly evidenceLinked: boolean;
  readonly monitorHash: string;
  readonly nextAction: string;
  readonly ownerReady: boolean;
  readonly renewalProofReady: boolean;
  readonly status: ReleaseCertificationRenewalStatus;
}

export interface ReleaseCertificationRenewalFile {
  readonly download: string;
  readonly format: ReleaseCertificationRenewalFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseCertificationRenewalMonitor {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseCertificationRenewalFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseCertificationRenewalRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly expiredCount: number;
    readonly monitorHash: string;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly releaseCertificationBlocked: boolean;
    readonly renewalScore: number;
    readonly rowCount: number;
    readonly status: ReleaseCertificationRenewalSummaryStatus;
    readonly watchCount: number;
  };
  readonly workspaceId: string;
}

const defaultRequiredKinds: readonly ReleaseCertificationRenewalKind[] = [
  "certificate-signing-evidence",
  "archive-retention-renewal",
  "cad-runtime-proof-renewal",
];

const kindRank: Record<ReleaseCertificationRenewalKind, number> = {
  "certificate-signing-evidence": 0,
  "archive-retention-renewal": 1,
  "cad-runtime-proof-renewal": 2,
};

export function createReleaseCertificationRenewalMonitor(
  input: ReleaseCertificationRenewalMonitorInput,
): ReleaseCertificationRenewalMonitor {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const renewalByKind = new Map(
    input.renewals.map((renewal) => [renewal.kind, renewal]),
  );
  const rows = [...(input.requiredKinds ?? defaultRequiredKinds)]
    .map((kind) => createRow(renewalByKind.get(kind) ?? missingRenewal(kind), generatedAt))
    .sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
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
  const fileBase = `${slug(workspaceId)}-release-certification-renewal-monitor-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Release certification renewal monitor CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release certification renewal monitor JSON",
      },
    ],
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

function missingRenewal(
  kind: ReleaseCertificationRenewalKind,
): Required<ReleaseCertificationRenewalInput> {
  return {
    evidenceHash: "",
    evidenceUrl: "",
    kind,
    lastRenewedAt: "",
    owner: "",
    renewalProofHash: "",
    renewBy: "",
  };
}

function createRow(
  input: ReleaseCertificationRenewalInput,
  generatedAt: string,
): ReleaseCertificationRenewalRow {
  const rowInput: Required<ReleaseCertificationRenewalInput> = {
    evidenceHash: input.evidenceHash?.trim() ?? "",
    evidenceUrl: input.evidenceUrl?.trim() ?? "",
    kind: input.kind,
    lastRenewedAt: input.lastRenewedAt?.trim() ?? "",
    owner: input.owner?.trim() ?? "",
    renewalProofHash: input.renewalProofHash?.trim() ?? "",
    renewBy: input.renewBy?.trim() ?? "",
  };
  const daysSinceRenewal = dayDiff(generatedAt, rowInput.lastRenewedAt);
  const daysUntilRenewal = dayDiff(rowInput.renewBy, generatedAt);
  const evidenceLinked =
    hasSha256(rowInput.evidenceHash) && rowInput.evidenceUrl.startsWith("https://");
  const renewalProofReady = hasSha256(rowInput.renewalProofHash);
  const ownerReady = rowInput.owner.length > 0;
  const status = statusFor({
    daysSinceRenewal,
    daysUntilRenewal,
    evidenceLinked,
    ownerReady,
    renewalProofReady,
  });
  const rowWithoutHash = {
    ...rowInput,
    daysSinceRenewal,
    daysUntilRenewal,
    evidenceLinked,
    nextAction: "",
    ownerReady,
    renewalProofReady,
    status,
  };
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    monitorHash: sha256(row),
  };
}

function statusFor(input: {
  readonly daysSinceRenewal: number;
  readonly daysUntilRenewal: number;
  readonly evidenceLinked: boolean;
  readonly ownerReady: boolean;
  readonly renewalProofReady: boolean;
}): ReleaseCertificationRenewalStatus {
  if (
    !input.evidenceLinked ||
    !input.ownerReady ||
    !input.renewalProofReady ||
    input.daysSinceRenewal < 0 ||
    input.daysUntilRenewal < 0
  ) {
    return "blocked";
  }

  if (input.daysSinceRenewal > 30 || input.daysUntilRenewal <= 14) {
    return "watch";
  }

  return "ready";
}

function nextActionFor(
  row: Omit<ReleaseCertificationRenewalRow, "monitorHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked release certification renewal for ${row.kind}.`;
  }

  if (!row.evidenceLinked) {
    return `Attach certification renewal evidence URL and hash for ${row.kind}.`;
  }

  if (!row.renewalProofReady) {
    return `Attach certification renewal proof hash for ${row.kind}.`;
  }

  if (!row.ownerReady) {
    return `Assign renewal owner for ${row.kind}.`;
  }

  if (row.daysUntilRenewal < 0) {
    return `Renew expired certification evidence for ${row.kind}.`;
  }

  if (row.status === "watch") {
    return `Refresh certification renewal evidence soon for ${row.kind}.`;
  }

  return `Release certification renewal monitor is ready for ${row.kind}.`;
}

function summarize(
  rows: readonly ReleaseCertificationRenewalRow[],
): ReleaseCertificationRenewalMonitor["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const expiredCount = rows.filter(
    (row) => row.renewBy.length > 0 && row.daysUntilRenewal < 0,
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.evidenceLinked,
        row.renewalProofReady,
        row.ownerReady,
        row.daysSinceRenewal >= 0,
        row.daysUntilRenewal >= 0,
      ].filter(Boolean).length,
    0,
  );
  const status: ReleaseCertificationRenewalSummaryStatus =
    blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";

  return {
    blockedCount,
    expiredCount,
    monitorHash: sha256(rows.map((row) => row.monitorHash)),
    nextAction:
      status === "ready"
        ? "Release certification renewal monitor is ready for certification."
        : status === "watch"
          ? "Refresh watched release certification renewals before they expire."
          : "Resolve blocked release certification renewals before certification.",
    readyCount,
    releaseCertificationBlocked: blockedCount > 0,
    renewalScore: rows.length === 0 ? 100 : Math.round((readySignals / (rows.length * 5)) * 100),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: readonly ReleaseCertificationRenewalRow[]) {
  const header = [
    "kind",
    "status",
    "owner",
    "days_until_renewal",
    "evidence_linked",
    "renewal_proof_ready",
    "owner_ready",
    "monitor_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.kind,
    row.status,
    row.owner,
    String(row.daysUntilRenewal),
    String(row.evidenceLinked),
    String(row.renewalProofReady),
    String(row.ownerReady),
    row.monitorHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function csvRow(values: readonly string[]) {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""');

      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function dayDiff(later: string, earlier: string) {
  const laterTime = new Date(later).getTime();
  const earlierTime = new Date(earlier).getTime();

  if (Number.isNaN(laterTime) || Number.isNaN(earlierTime)) {
    return -999;
  }

  return Math.floor((laterTime - earlierTime) / (24 * 60 * 60 * 1000));
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
}

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
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex")}`;
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
