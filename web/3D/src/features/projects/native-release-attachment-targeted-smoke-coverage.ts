import { createHash } from "node:crypto";

export type NativeReleaseAttachmentTargetedSmokeCoverageArea =
  | "attachment-readiness-diff"
  | "cad-runtime-attachment-rehearsal"
  | "native-release-attachment-approval"
  | "signed-artifact-attachment-rehearsal";

export type NativeReleaseAttachmentTargetedSmokeCoverageStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeReleaseAttachmentTargetedSmokeCoverageFileFormat =
  | "csv"
  | "json";

export interface NativeReleaseAttachmentTargetedSmokeCoverageCheckInput {
  readonly area: NativeReleaseAttachmentTargetedSmokeCoverageArea;
  readonly blockedScenarioHash: string;
  readonly readyScenarioHash: string;
  readonly reportHash: string;
  readonly scriptName: string;
  readonly status: NativeReleaseAttachmentTargetedSmokeCoverageStatus;
}

export interface NativeReleaseAttachmentTargetedSmokeCoverageRow {
  readonly area: NativeReleaseAttachmentTargetedSmokeCoverageArea;
  readonly blockedScenarioCovered: boolean;
  readonly blockedScenarioHash: string;
  readonly coverageHash: string;
  readonly nextAction: string;
  readonly readyScenarioCovered: boolean;
  readonly readyScenarioHash: string;
  readonly reportHash: string;
  readonly reportHashAttached: boolean;
  readonly scriptLinked: boolean;
  readonly scriptName: string;
  readonly status: NativeReleaseAttachmentTargetedSmokeCoverageStatus;
}

export interface NativeReleaseAttachmentTargetedSmokeCoverageFile {
  readonly download: string;
  readonly format: NativeReleaseAttachmentTargetedSmokeCoverageFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeReleaseAttachmentTargetedSmokeCoverageReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: NativeReleaseAttachmentTargetedSmokeCoverageFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: NativeReleaseAttachmentTargetedSmokeCoverageRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly coverageHash: string;
    readonly coverageScore: number;
    readonly missingCoverageCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: NativeReleaseAttachmentTargetedSmokeCoverageStatus;
  };
  readonly workspaceId: string;
}

export interface CreateNativeReleaseAttachmentTargetedSmokeCoverageInput {
  readonly checks: readonly NativeReleaseAttachmentTargetedSmokeCoverageCheckInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAreas?: readonly NativeReleaseAttachmentTargetedSmokeCoverageArea[];
  readonly workspaceId?: string;
}

const defaultRequiredAreas: readonly NativeReleaseAttachmentTargetedSmokeCoverageArea[] =
  [
    "signed-artifact-attachment-rehearsal",
    "cad-runtime-attachment-rehearsal",
    "attachment-readiness-diff",
    "native-release-attachment-approval",
  ];

const areaRank: Record<NativeReleaseAttachmentTargetedSmokeCoverageArea, number> =
  {
    "signed-artifact-attachment-rehearsal": 0,
    "cad-runtime-attachment-rehearsal": 1,
    "attachment-readiness-diff": 2,
    "native-release-attachment-approval": 3,
  };

const expectedScriptNames: Record<
  NativeReleaseAttachmentTargetedSmokeCoverageArea,
  string
> = {
  "signed-artifact-attachment-rehearsal":
    "signed-artifact-attachment-rehearsal-packet-smoke.ts",
  "cad-runtime-attachment-rehearsal":
    "cad-runtime-attachment-rehearsal-packet-smoke.ts",
  "attachment-readiness-diff": "attachment-readiness-diff-report-smoke.ts",
  "native-release-attachment-approval":
    "native-release-attachment-approval-packet-smoke.ts",
};

export function createNativeReleaseAttachmentTargetedSmokeCoverage(
  input: CreateNativeReleaseAttachmentTargetedSmokeCoverageInput,
): NativeReleaseAttachmentTargetedSmokeCoverageReport {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const checkByArea = new Map(
    input.checks.map((check) => [check.area, check]),
  );
  const rows = [...(input.requiredAreas ?? defaultRequiredAreas)]
    .map((area) => createRow(checkByArea.get(area) ?? missingCheck(area)))
    .sort((first, second) => areaRank[first.area] - areaRank[second.area]);
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
  const baseFileName = `${slug(workspaceId)}-native-release-attachment-targeted-smoke-coverage-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${baseFileName}.csv`;
  const jsonFileName = `${baseFileName}.json`;
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
        label: "Native release attachment targeted smoke coverage CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native release attachment targeted smoke coverage JSON",
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

function missingCheck(
  area: NativeReleaseAttachmentTargetedSmokeCoverageArea,
): NativeReleaseAttachmentTargetedSmokeCoverageCheckInput {
  return {
    area,
    blockedScenarioHash: "",
    readyScenarioHash: "",
    reportHash: "",
    scriptName: "",
    status: "blocked",
  };
}

function createRow(
  input: NativeReleaseAttachmentTargetedSmokeCoverageCheckInput,
): NativeReleaseAttachmentTargetedSmokeCoverageRow {
  const scriptName = input.scriptName.trim();
  const readyScenarioHash = input.readyScenarioHash.trim() || "missing";
  const blockedScenarioHash = input.blockedScenarioHash.trim() || "missing";
  const reportHash = input.reportHash.trim() || "missing";
  const scriptLinked = scriptName === expectedScriptNames[input.area];
  const readyScenarioCovered = hasSha256(readyScenarioHash);
  const blockedScenarioCovered = hasSha256(blockedScenarioHash);
  const reportHashAttached = hasSha256(reportHash);
  const status = statusFor({
    blockedScenarioCovered,
    inputStatus: input.status,
    readyScenarioCovered,
    reportHashAttached,
    scriptLinked,
  });
  const rowWithoutHash = {
    area: input.area,
    blockedScenarioCovered,
    blockedScenarioHash,
    nextAction: "",
    readyScenarioCovered,
    readyScenarioHash,
    reportHash,
    reportHashAttached,
    scriptLinked,
    scriptName,
    status,
  } satisfies Omit<
    NativeReleaseAttachmentTargetedSmokeCoverageRow,
    "coverageHash"
  >;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    coverageHash: sha256(row),
  };
}

function statusFor(input: {
  readonly blockedScenarioCovered: boolean;
  readonly inputStatus: NativeReleaseAttachmentTargetedSmokeCoverageStatus;
  readonly readyScenarioCovered: boolean;
  readonly reportHashAttached: boolean;
  readonly scriptLinked: boolean;
}): NativeReleaseAttachmentTargetedSmokeCoverageStatus {
  if (
    !input.blockedScenarioCovered ||
    !input.readyScenarioCovered ||
    !input.reportHashAttached ||
    !input.scriptLinked ||
    input.inputStatus === "blocked"
  ) {
    return "blocked";
  }

  if (input.inputStatus === "review") {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeReleaseAttachmentTargetedSmokeCoverageRow,
    | "area"
    | "blockedScenarioCovered"
    | "readyScenarioCovered"
    | "reportHashAttached"
    | "scriptLinked"
    | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native release attachment targeted smoke coverage for ${row.area}.`;
  }

  if (!row.scriptLinked) {
    return `Link the native release attachment smoke script for ${row.area}.`;
  }

  if (!row.readyScenarioCovered) {
    return `Add ready-path native release attachment smoke evidence for ${row.area}.`;
  }

  if (!row.blockedScenarioCovered) {
    return `Add blocked-path native release attachment smoke evidence for ${row.area}.`;
  }

  if (!row.reportHashAttached) {
    return `Attach native release attachment smoke report hash for ${row.area}.`;
  }

  return `Native release attachment targeted smoke coverage is ready for ${row.area}.`;
}

function summarize(
  rows: readonly NativeReleaseAttachmentTargetedSmokeCoverageRow[],
): NativeReleaseAttachmentTargetedSmokeCoverageReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const missingCoverageCount = rows.filter(
    (row) =>
      !row.readyScenarioCovered ||
      !row.blockedScenarioCovered ||
      !row.reportHashAttached ||
      !row.scriptLinked,
  ).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeReleaseAttachmentTargetedSmokeCoverageStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    coverageHash: sha256(rows.map((row) => row.coverageHash)),
    coverageScore: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (readyCount / Math.max(1, rows.length)) * 100 -
            blockedCount * 15 -
            reviewCount * 5 -
            missingCoverageCount * 10,
        ),
      ),
    ),
    missingCoverageCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release attachment targeted smoke coverage before closing the attachment set."
        : status === "review"
          ? "Review native release attachment targeted smoke coverage before closing the attachment set."
          : "Native release attachment targeted smoke coverage is ready to close the attachment set.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(
  rows: readonly NativeReleaseAttachmentTargetedSmokeCoverageRow[],
) {
  const header = [
    "area",
    "status",
    "script_linked",
    "ready_scenario_covered",
    "blocked_scenario_covered",
    "report_hash_attached",
    "coverage_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.area,
    row.status,
    String(row.scriptLinked),
    String(row.readyScenarioCovered),
    String(row.blockedScenarioCovered),
    String(row.reportHashAttached),
    row.coverageHash,
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
