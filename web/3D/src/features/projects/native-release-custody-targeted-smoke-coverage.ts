import { createHash } from "node:crypto";

export type NativeReleaseCustodyTargetedSmokeCoverageArea =
  | "attachment-custody-drift-monitor"
  | "cad-runtime-custody-ledger"
  | "native-release-custody-approval"
  | "signed-artifact-custody-ledger";

export type NativeReleaseCustodyTargetedSmokeCoverageStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeReleaseCustodyTargetedSmokeCoverageFileFormat =
  | "csv"
  | "json";

export interface NativeReleaseCustodyTargetedSmokeCoverageCheckInput {
  readonly area: NativeReleaseCustodyTargetedSmokeCoverageArea;
  readonly blockedScenarioHash: string;
  readonly readyScenarioHash: string;
  readonly reportHash: string;
  readonly scriptName: string;
  readonly status: NativeReleaseCustodyTargetedSmokeCoverageStatus;
}

export interface NativeReleaseCustodyTargetedSmokeCoverageRow {
  readonly area: NativeReleaseCustodyTargetedSmokeCoverageArea;
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
  readonly status: NativeReleaseCustodyTargetedSmokeCoverageStatus;
}

export interface NativeReleaseCustodyTargetedSmokeCoverageFile {
  readonly download: string;
  readonly format: NativeReleaseCustodyTargetedSmokeCoverageFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeReleaseCustodyTargetedSmokeCoverageReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: NativeReleaseCustodyTargetedSmokeCoverageFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: NativeReleaseCustodyTargetedSmokeCoverageRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly coverageHash: string;
    readonly coverageScore: number;
    readonly missingCoverageCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: NativeReleaseCustodyTargetedSmokeCoverageStatus;
  };
  readonly workspaceId: string;
}

export interface CreateNativeReleaseCustodyTargetedSmokeCoverageInput {
  readonly checks: readonly NativeReleaseCustodyTargetedSmokeCoverageCheckInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAreas?: readonly NativeReleaseCustodyTargetedSmokeCoverageArea[];
  readonly workspaceId?: string;
}

const defaultRequiredAreas: readonly NativeReleaseCustodyTargetedSmokeCoverageArea[] =
  [
    "signed-artifact-custody-ledger",
    "cad-runtime-custody-ledger",
    "attachment-custody-drift-monitor",
    "native-release-custody-approval",
  ];

const areaRank: Record<NativeReleaseCustodyTargetedSmokeCoverageArea, number> =
  {
    "signed-artifact-custody-ledger": 0,
    "cad-runtime-custody-ledger": 1,
    "attachment-custody-drift-monitor": 2,
    "native-release-custody-approval": 3,
  };

const expectedScriptNames: Record<
  NativeReleaseCustodyTargetedSmokeCoverageArea,
  string
> = {
  "signed-artifact-custody-ledger": "signed-artifact-custody-ledger-smoke.ts",
  "cad-runtime-custody-ledger": "cad-runtime-custody-ledger-smoke.ts",
  "attachment-custody-drift-monitor":
    "attachment-custody-drift-monitor-smoke.ts",
  "native-release-custody-approval":
    "native-release-custody-approval-packet-smoke.ts",
};

export function createNativeReleaseCustodyTargetedSmokeCoverage(
  input: CreateNativeReleaseCustodyTargetedSmokeCoverageInput,
): NativeReleaseCustodyTargetedSmokeCoverageReport {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const checkByArea = new Map(input.checks.map((check) => [check.area, check]));
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
  const baseFileName = `${slug(workspaceId)}-native-release-custody-targeted-smoke-coverage-${slug(
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
        label: "Native release custody targeted smoke coverage CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native release custody targeted smoke coverage JSON",
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
  area: NativeReleaseCustodyTargetedSmokeCoverageArea,
): NativeReleaseCustodyTargetedSmokeCoverageCheckInput {
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
  input: NativeReleaseCustodyTargetedSmokeCoverageCheckInput,
): NativeReleaseCustodyTargetedSmokeCoverageRow {
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
    NativeReleaseCustodyTargetedSmokeCoverageRow,
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
  readonly inputStatus: NativeReleaseCustodyTargetedSmokeCoverageStatus;
  readonly readyScenarioCovered: boolean;
  readonly reportHashAttached: boolean;
  readonly scriptLinked: boolean;
}): NativeReleaseCustodyTargetedSmokeCoverageStatus {
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
    NativeReleaseCustodyTargetedSmokeCoverageRow,
    | "area"
    | "blockedScenarioCovered"
    | "readyScenarioCovered"
    | "reportHashAttached"
    | "scriptLinked"
    | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native release custody targeted smoke coverage for ${row.area}.`;
  }

  if (!row.scriptLinked) {
    return `Link the native release custody smoke script for ${row.area}.`;
  }

  if (!row.readyScenarioCovered) {
    return `Add ready-path native release custody smoke evidence for ${row.area}.`;
  }

  if (!row.blockedScenarioCovered) {
    return `Add blocked-path native release custody smoke evidence for ${row.area}.`;
  }

  if (!row.reportHashAttached) {
    return `Attach native release custody smoke report hash for ${row.area}.`;
  }

  return `Native release custody targeted smoke coverage is ready for ${row.area}.`;
}

function summarize(
  rows: readonly NativeReleaseCustodyTargetedSmokeCoverageRow[],
): NativeReleaseCustodyTargetedSmokeCoverageReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const missingCoverageCount = rows.filter(
    (row) =>
      !row.scriptLinked ||
      !row.readyScenarioCovered ||
      !row.blockedScenarioCovered ||
      !row.reportHashAttached,
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.scriptLinked,
        row.readyScenarioCovered,
        row.blockedScenarioCovered,
        row.reportHashAttached,
      ].filter(Boolean).length,
    0,
  );
  const status: NativeReleaseCustodyTargetedSmokeCoverageStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    coverageHash: sha256(rows.map((row) => row.coverageHash)),
    coverageScore: Math.round((readySignals / (rows.length * 4)) * 100),
    missingCoverageCount,
    nextAction:
      status === "ready"
        ? "Native release custody targeted smoke coverage is ready for release evidence continuity."
        : "Resolve blocked native release custody targeted smoke coverage before release evidence continuity approval.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(
  rows: readonly NativeReleaseCustodyTargetedSmokeCoverageRow[],
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
