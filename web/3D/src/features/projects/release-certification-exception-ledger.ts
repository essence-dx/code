import { createHash } from "node:crypto";

export type ReleaseCertificationExceptionStatus =
  | "blocked"
  | "ready"
  | "review";

export type ReleaseCertificationExceptionFileFormat = "csv" | "json";

export interface ReleaseCertificationExceptionEntryInput {
  readonly approvalEvidenceHash?: string;
  readonly approvedAt?: string;
  readonly approver?: string;
  readonly deviationId: string;
  readonly expiresAt?: string;
  readonly owner?: string;
  readonly releaseBlocking?: boolean;
  readonly remediationRoute?: string;
  readonly signoffHash?: string;
  readonly title: string;
}

export interface ReleaseCertificationExceptionLedgerInput {
  readonly entries: readonly ReleaseCertificationExceptionEntryInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

export interface ReleaseCertificationExceptionLedgerRow
  extends Required<ReleaseCertificationExceptionEntryInput> {
  readonly approvalReady: boolean;
  readonly expiryReady: boolean;
  readonly ledgerHash: string;
  readonly nextAction: string;
  readonly remediationReady: boolean;
  readonly signoffReady: boolean;
  readonly status: ReleaseCertificationExceptionStatus;
}

export interface ReleaseCertificationExceptionLedgerFile {
  readonly download: string;
  readonly format: ReleaseCertificationExceptionFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseCertificationExceptionLedger {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseCertificationExceptionLedgerFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseCertificationExceptionLedgerRow[];
  readonly summary: {
    readonly approvedCount: number;
    readonly blockedCount: number;
    readonly blockingCount: number;
    readonly certificationBlocked: boolean;
    readonly expiredCount: number;
    readonly ledgerHash: string;
    readonly ledgerScore: number;
    readonly missingApprovalCount: number;
    readonly missingRemediationCount: number;
    readonly missingSignoffCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: ReleaseCertificationExceptionStatus;
  };
  readonly workspaceId: string;
}

export function createReleaseCertificationExceptionLedger(
  input: ReleaseCertificationExceptionLedgerInput,
): ReleaseCertificationExceptionLedger {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const rows = input.entries
    .map((entry) => createRow(entry, generatedAt))
    .sort((first, second) =>
      first.deviationId.localeCompare(second.deviationId),
    );
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
  const fileBase = `${slug(workspaceId)}-release-certification-exception-ledger-${slug(
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
        label: "Release certification exception ledger CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release certification exception ledger JSON",
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

function createRow(
  input: ReleaseCertificationExceptionEntryInput,
  generatedAt: string,
): ReleaseCertificationExceptionLedgerRow {
  const rowInput: Required<ReleaseCertificationExceptionEntryInput> = {
    approvalEvidenceHash: input.approvalEvidenceHash?.trim() ?? "",
    approvedAt: input.approvedAt?.trim() ?? "",
    approver: input.approver?.trim() ?? "",
    deviationId: input.deviationId.trim(),
    expiresAt: input.expiresAt?.trim() ?? "",
    owner: input.owner?.trim() ?? "",
    releaseBlocking: input.releaseBlocking === true,
    remediationRoute: input.remediationRoute?.trim() ?? "",
    signoffHash: input.signoffHash?.trim() ?? "",
    title: input.title.trim(),
  };
  const approvalReady =
    hasSha256(rowInput.approvalEvidenceHash) &&
    rowInput.approver.length > 0 &&
    isValidDate(rowInput.approvedAt);
  const signoffReady =
    rowInput.owner.length > 0 && hasSha256(rowInput.signoffHash);
  const expiryReady =
    isValidDate(rowInput.expiresAt) &&
    new Date(rowInput.expiresAt).getTime() > new Date(generatedAt).getTime();
  const remediationReady = rowInput.remediationRoute.length > 0;
  const status: ReleaseCertificationExceptionStatus =
    rowInput.releaseBlocking ||
    !approvalReady ||
    !signoffReady ||
    !expiryReady ||
    !remediationReady
      ? "blocked"
      : daysUntil(rowInput.expiresAt, generatedAt) <= 14
        ? "review"
        : "ready";
  const rowWithoutHash = {
    ...rowInput,
    approvalReady,
    expiryReady,
    nextAction: nextActionFor({
      approvalReady,
      expiryReady,
      releaseBlocking: rowInput.releaseBlocking,
      remediationReady,
      signoffReady,
      status,
      title: rowInput.title,
    }),
    remediationReady,
    signoffReady,
    status,
  };

  return {
    ...rowWithoutHash,
    ledgerHash: sha256(rowWithoutHash),
  };
}

function nextActionFor(input: {
  readonly approvalReady: boolean;
  readonly expiryReady: boolean;
  readonly releaseBlocking: boolean;
  readonly remediationReady: boolean;
  readonly signoffReady: boolean;
  readonly status: ReleaseCertificationExceptionStatus;
  readonly title: string;
}) {
  if (input.releaseBlocking) {
    return `Resolve release-blocking certification exception for ${input.title}.`;
  }

  if (!input.approvalReady) {
    return `Attach approved deviation evidence for ${input.title}.`;
  }

  if (!input.signoffReady) {
    return `Attach owner sign-off evidence for ${input.title}.`;
  }

  if (!input.expiryReady) {
    return `Renew or close expired certification exception for ${input.title}.`;
  }

  if (!input.remediationReady) {
    return `Attach remediation route for ${input.title}.`;
  }

  if (input.status === "review") {
    return `Review expiring certification exception for ${input.title}.`;
  }

  return `Certification exception is approved and tracked for ${input.title}.`;
}

function summarize(
  rows: readonly ReleaseCertificationExceptionLedgerRow[],
): ReleaseCertificationExceptionLedger["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockingCount = rows.filter((row) => row.releaseBlocking).length;
  const expiredCount = rows.filter((row) => !row.expiryReady).length;
  const missingApprovalCount = rows.filter((row) => !row.approvalReady).length;
  const missingSignoffCount = rows.filter((row) => !row.signoffReady).length;
  const missingRemediationCount = rows.filter(
    (row) => !row.remediationReady,
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.approvalReady,
        row.signoffReady,
        row.expiryReady,
        row.remediationReady,
        !row.releaseBlocking,
      ].filter(Boolean).length,
    0,
  );
  const status: ReleaseCertificationExceptionStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    approvedCount: rows.filter(
      (row) =>
        row.approvalReady &&
        row.signoffReady &&
        row.expiryReady &&
        row.remediationReady,
    ).length,
    blockedCount,
    blockingCount,
    certificationBlocked: blockingCount > 0 || blockedCount > 0,
    expiredCount,
    ledgerHash: sha256(rows.map((row) => row.ledgerHash)),
    ledgerScore:
      rows.length === 0
        ? 100
        : Math.round((readySignals / (rows.length * 5)) * 100),
    missingApprovalCount,
    missingRemediationCount,
    missingSignoffCount,
    nextAction:
      status === "ready"
        ? "Release certification exception ledger is ready for certification."
        : status === "review"
          ? "Review expiring release certification exceptions before certification."
          : "Resolve blocked release certification exceptions before certification.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: readonly ReleaseCertificationExceptionLedgerRow[]) {
  const header = [
    "deviation_id",
    "status",
    "title",
    "owner",
    "approver",
    "approval_ready",
    "signoff_ready",
    "expiry_ready",
    "remediation_ready",
    "release_blocking",
    "ledger_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.deviationId,
    row.status,
    row.title,
    row.owner,
    row.approver,
    String(row.approvalReady),
    String(row.signoffReady),
    String(row.expiryReady),
    String(row.remediationReady),
    String(row.releaseBlocking),
    row.ledgerHash,
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

function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value));
}

function daysUntil(expiresAt: string, generatedAt: string) {
  const expires = new Date(expiresAt).getTime();
  const now = new Date(generatedAt).getTime();

  return Number.isNaN(expires) || Number.isNaN(now)
    ? 0
    : (expires - now) / (24 * 60 * 60 * 1000);
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
