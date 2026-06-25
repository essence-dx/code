import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type SignedPackageArtifactLocatorStatus = "blocked" | "ready" | "review";
export type SignedPackageArtifactLocatorFileFormat = "csv" | "json";
export type SignedPackageArtifactLocatorSourceKind =
  | "ci"
  | "local"
  | "local-and-ci"
  | "missing";

export interface SignedPackageArtifactLocatorInput {
  readonly artifactName: string;
  readonly artifactSha256: string;
  readonly certificateExpiresAt: string;
  readonly certificateFingerprint: string;
  readonly certificateIssuer: string;
  readonly certificateSubject: string;
  readonly ciArtifactUrl: string;
  readonly ciRunUrl: string;
  readonly localOutputPath: string;
  readonly platform: NativeArtifactStorageHandoffPlatform;
  readonly signedAt: string;
  readonly uploadDestinationUrl: string;
  readonly uploadOwner: string;
  readonly uploadProvider: string;
}

export interface SignedPackageArtifactLocatorRow {
  readonly artifactName: string;
  readonly artifactSha256: string;
  readonly blockerReason: string;
  readonly certificateExpiresAt: string;
  readonly certificateFingerprint: string;
  readonly certificateIssuer: string;
  readonly certificateReady: boolean;
  readonly certificateSubject: string;
  readonly checksumReady: boolean;
  readonly ciArtifactUrl: string;
  readonly ciRunLinked: boolean;
  readonly ciRunUrl: string;
  readonly localOutputPath: string;
  readonly localOutputReady: boolean;
  readonly locatorHash: string;
  readonly missingArtifactBlocker: boolean;
  readonly nextAction: string;
  readonly outputLocated: boolean;
  readonly platform: NativeArtifactStorageHandoffPlatform;
  readonly signedAt: string;
  readonly sourceKind: SignedPackageArtifactLocatorSourceKind;
  readonly status: SignedPackageArtifactLocatorStatus;
  readonly uploadDestinationUrl: string;
  readonly uploadOwner: string;
  readonly uploadProvider: string;
  readonly uploadReady: boolean;
}

export interface SignedPackageArtifactLocatorFile {
  readonly download: string;
  readonly format: SignedPackageArtifactLocatorFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface SignedPackageArtifactLocatorReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly SignedPackageArtifactLocatorFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly SignedPackageArtifactLocatorRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly certificateReadyCount: number;
    readonly locatorHash: string;
    readonly locatorScore: number;
    readonly missingArtifactBlockerCount: number;
    readonly nextAction: string;
    readonly outputLocatedCount: number;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: SignedPackageArtifactLocatorStatus;
    readonly uploadReadyCount: number;
  };
  readonly workspaceId: string;
}

export interface CreateSignedPackageArtifactLocatorInput {
  readonly artifacts: readonly SignedPackageArtifactLocatorInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredPlatforms?: readonly NativeArtifactStorageHandoffPlatform[];
  readonly workspaceId?: string;
}

const defaultRequiredPlatforms: readonly NativeArtifactStorageHandoffPlatform[] =
  ["windows", "macos", "linux"];

const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
};

export function createSignedPackageArtifactLocator(
  input: CreateSignedPackageArtifactLocatorInput,
): SignedPackageArtifactLocatorReport {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
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
  const fileBase = `${slug(workspaceId)}-signed-package-artifact-locator-${slug(
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
        label: "Signed package artifact locator CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Signed package artifact locator JSON",
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

function createRows(input: CreateSignedPackageArtifactLocatorInput) {
  const artifactByPlatform = new Map(
    input.artifacts.map((artifact) => [artifact.platform, artifact]),
  );
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) =>
      createRow(artifactByPlatform.get(platform) ?? missingArtifact(platform)),
    )
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function missingArtifact(
  platform: NativeArtifactStorageHandoffPlatform,
): SignedPackageArtifactLocatorInput {
  return {
    artifactName: "",
    artifactSha256: "",
    certificateExpiresAt: "",
    certificateFingerprint: "",
    certificateIssuer: "",
    certificateSubject: "",
    ciArtifactUrl: "",
    ciRunUrl: "",
    localOutputPath: "",
    platform,
    signedAt: "",
    uploadDestinationUrl: "",
    uploadOwner: "",
    uploadProvider: "",
  };
}

function createRow(
  input: SignedPackageArtifactLocatorInput,
): SignedPackageArtifactLocatorRow {
  const artifactName = input.artifactName.trim() || `${input.platform}-artifact-missing`;
  const artifactSha256 = input.artifactSha256.trim() || "missing";
  const certificateExpiresAt = input.certificateExpiresAt.trim();
  const certificateFingerprint = input.certificateFingerprint.trim() || "missing";
  const certificateIssuer = input.certificateIssuer.trim();
  const certificateSubject = input.certificateSubject.trim();
  const ciArtifactUrl = input.ciArtifactUrl.trim();
  const ciRunUrl = input.ciRunUrl.trim();
  const localOutputPath = input.localOutputPath.trim();
  const signedAt = input.signedAt.trim();
  const uploadDestinationUrl = input.uploadDestinationUrl.trim();
  const uploadOwner = input.uploadOwner.trim();
  const uploadProvider = input.uploadProvider.trim();
  const localOutputReady = localArtifactPathReady(localOutputPath);
  const ciArtifactReady = urlReady(ciArtifactUrl);
  const outputLocated = localOutputReady || ciArtifactReady;
  const sourceKind = sourceKindFor({
    ciArtifactReady,
    localOutputReady,
  });
  const checksumReady = hasSha256(artifactSha256);
  const certificateReady =
    certificateSubject.length > 0 &&
    certificateIssuer.length > 0 &&
    hasSha256(certificateFingerprint) &&
    validDate(signedAt) &&
    validFutureDate(certificateExpiresAt, signedAt);
  const ciRunLinked = urlReady(ciRunUrl);
  const uploadReady =
    urlReady(uploadDestinationUrl) &&
    uploadOwner.length > 0 &&
    uploadProvider.length > 0;
  const missingArtifactBlocker = !outputLocated || !checksumReady;
  const blockerReason = blockerReasonFor({
    certificateReady,
    checksumReady,
    outputLocated,
    platform: input.platform,
    uploadReady,
  });
  const status = statusFor({
    certificateReady,
    checksumReady,
    ciRunLinked,
    missingArtifactBlocker,
    outputLocated,
    uploadReady,
  });
  const rowWithoutHash = {
    artifactName,
    artifactSha256,
    blockerReason,
    certificateExpiresAt,
    certificateFingerprint,
    certificateIssuer,
    certificateReady,
    certificateSubject,
    checksumReady,
    ciArtifactUrl,
    ciRunLinked,
    ciRunUrl,
    localOutputPath,
    localOutputReady,
    missingArtifactBlocker,
    nextAction: "",
    outputLocated,
    platform: input.platform,
    signedAt,
    sourceKind,
    status,
    uploadDestinationUrl,
    uploadOwner,
    uploadProvider,
    uploadReady,
  } satisfies Omit<SignedPackageArtifactLocatorRow, "locatorHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    locatorHash: sha256(row),
  };
}

function statusFor(input: {
  readonly certificateReady: boolean;
  readonly checksumReady: boolean;
  readonly ciRunLinked: boolean;
  readonly missingArtifactBlocker: boolean;
  readonly outputLocated: boolean;
  readonly uploadReady: boolean;
}): SignedPackageArtifactLocatorStatus {
  if (
    !input.outputLocated ||
    !input.checksumReady ||
    !input.certificateReady ||
    !input.uploadReady
  ) {
    return "blocked";
  }

  if (!input.ciRunLinked || input.missingArtifactBlocker) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    SignedPackageArtifactLocatorRow,
    | "certificateReady"
    | "checksumReady"
    | "ciRunLinked"
    | "missingArtifactBlocker"
    | "outputLocated"
    | "platform"
    | "status"
    | "uploadReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked signed package artifact locator for ${row.platform}.`;
  }

  if (!row.outputLocated) {
    return `Attach local or CI signed package output path for ${row.platform}.`;
  }

  if (!row.checksumReady) {
    return `Attach sha256 package checksum for ${row.platform}.`;
  }

  if (!row.certificateReady) {
    return `Attach certificate metadata for ${row.platform}.`;
  }

  if (!row.uploadReady) {
    return `Attach upload destination and owner for ${row.platform}.`;
  }

  if (!row.ciRunLinked) {
    return `Attach CI run URL for signed package provenance on ${row.platform}.`;
  }

  if (row.missingArtifactBlocker) {
    return `Clear missing signed package artifact blocker for ${row.platform}.`;
  }

  return `Signed package artifact locator is ready for ${row.platform}.`;
}

function blockerReasonFor(input: {
  readonly certificateReady: boolean;
  readonly checksumReady: boolean;
  readonly outputLocated: boolean;
  readonly platform: NativeArtifactStorageHandoffPlatform;
  readonly uploadReady: boolean;
}) {
  if (!input.outputLocated) {
    return `No ${input.platform} signed package artifact located from local or CI outputs.`;
  }

  if (!input.checksumReady) {
    return `Missing ${input.platform} signed package checksum.`;
  }

  if (!input.certificateReady) {
    return `Missing ${input.platform} certificate metadata.`;
  }

  if (!input.uploadReady) {
    return `Missing ${input.platform} upload destination metadata.`;
  }

  return "";
}

function summarize(
  rows: readonly SignedPackageArtifactLocatorRow[],
): SignedPackageArtifactLocatorReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.outputLocated,
        row.checksumReady,
        row.certificateReady,
        row.uploadReady,
        row.ciRunLinked,
      ].filter(Boolean).length,
    0,
  );
  const status: SignedPackageArtifactLocatorStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    certificateReadyCount: rows.filter((row) => row.certificateReady).length,
    locatorHash: sha256(rows.map((row) => row.locatorHash)),
    locatorScore: Math.round((readySignals / (rows.length * 5)) * 100),
    missingArtifactBlockerCount: rows.filter(
      (row) => row.missingArtifactBlocker,
    ).length,
    nextAction:
      status === "ready"
        ? "Signed package artifact locator is ready for native fulfillment execution reality."
        : "Resolve blocked signed package artifact locator before native fulfillment execution reality.",
    outputLocatedCount: rows.filter((row) => row.outputLocated).length,
    readyCount,
    releaseBlocked: blockedCount > 0,
    reviewCount,
    rowCount: rows.length,
    status,
    uploadReadyCount: rows.filter((row) => row.uploadReady).length,
  };
}

function createCsv(rows: readonly SignedPackageArtifactLocatorRow[]) {
  const header = [
    "platform",
    "status",
    "source_kind",
    "output_located",
    "checksum_ready",
    "certificate_ready",
    "upload_ready",
    "missing_artifact_blocker",
    "locator_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.sourceKind,
      row.outputLocated,
      row.checksumReady,
      row.certificateReady,
      row.uploadReady,
      row.missingArtifactBlocker,
      row.locatorHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function sourceKindFor(input: {
  readonly ciArtifactReady: boolean;
  readonly localOutputReady: boolean;
}): SignedPackageArtifactLocatorSourceKind {
  if (input.localOutputReady && input.ciArtifactReady) {
    return "local-and-ci";
  }

  if (input.localOutputReady) {
    return "local";
  }

  if (input.ciArtifactReady) {
    return "ci";
  }

  return "missing";
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
}

function urlReady(value: string) {
  return value.startsWith("https://");
}

function localArtifactPathReady(value: string) {
  if (!value || value.startsWith("http://") || value.startsWith("https://")) {
    return false;
  }

  return /[\\/]|^[a-zA-Z]:[\\/]/.test(value) && /\.[a-z0-9]{2,8}$/i.test(value);
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function validFutureDate(value: string, comparedTo: string) {
  if (!validDate(value) || !validDate(comparedTo)) {
    return false;
  }

  return new Date(value).getTime() > new Date(comparedTo).getTime();
}

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
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
