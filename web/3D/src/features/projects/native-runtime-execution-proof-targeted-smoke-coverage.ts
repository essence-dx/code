import { createHash } from "node:crypto";

export type NativeRuntimeExecutionProofTargetedSmokeCoverageArea =
  | "artifact-verification-command-runner"
  | "cad-runtime-execution-probe"
  | "runtime-execution-readiness-packet"
  | "toolchain-prerequisite-detector";

export type NativeRuntimeExecutionProofTargetedSmokeCoverageStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeRuntimeExecutionProofTargetedSmokeCoverageFileFormat =
  | "csv"
  | "json";

export interface NativeRuntimeExecutionProofTargetedSmokeCoverageCheckInput {
  readonly area: NativeRuntimeExecutionProofTargetedSmokeCoverageArea;
  readonly blockedScenarioHash: string;
  readonly readyScenarioHash: string;
  readonly reportHash: string;
  readonly scriptName: string;
  readonly status: NativeRuntimeExecutionProofTargetedSmokeCoverageStatus;
}

export interface NativeRuntimeExecutionProofTargetedSmokeCoverageRow {
  readonly area: NativeRuntimeExecutionProofTargetedSmokeCoverageArea;
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
  readonly status: NativeRuntimeExecutionProofTargetedSmokeCoverageStatus;
}

export interface NativeRuntimeExecutionProofTargetedSmokeCoverageFile {
  readonly download: string;
  readonly format: NativeRuntimeExecutionProofTargetedSmokeCoverageFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeRuntimeExecutionProofTargetedSmokeCoverageReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly NativeRuntimeExecutionProofTargetedSmokeCoverageFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly NativeRuntimeExecutionProofTargetedSmokeCoverageRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly coverageHash: string;
    readonly coverageScore: number;
    readonly missingCoverageCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: NativeRuntimeExecutionProofTargetedSmokeCoverageStatus;
  };
  readonly workspaceId: string;
}

export interface CreateNativeRuntimeExecutionProofTargetedSmokeCoverageInput {
  readonly checks: readonly NativeRuntimeExecutionProofTargetedSmokeCoverageCheckInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAreas?: readonly NativeRuntimeExecutionProofTargetedSmokeCoverageArea[];
  readonly workspaceId?: string;
}

const defaultRequiredAreas: readonly NativeRuntimeExecutionProofTargetedSmokeCoverageArea[] =
  [
    "toolchain-prerequisite-detector",
    "artifact-verification-command-runner",
    "cad-runtime-execution-probe",
    "runtime-execution-readiness-packet",
  ];

const areaRank: Record<
  NativeRuntimeExecutionProofTargetedSmokeCoverageArea,
  number
> = {
  "toolchain-prerequisite-detector": 0,
  "artifact-verification-command-runner": 1,
  "cad-runtime-execution-probe": 2,
  "runtime-execution-readiness-packet": 3,
};

const expectedScriptNames: Record<
  NativeRuntimeExecutionProofTargetedSmokeCoverageArea,
  string
> = {
  "toolchain-prerequisite-detector":
    "native-toolchain-prerequisite-detector-smoke.ts",
  "artifact-verification-command-runner":
    "external-artifact-verification-command-runner-smoke.ts",
  "cad-runtime-execution-probe":
    "native-cad-runtime-execution-probe-smoke.ts",
  "runtime-execution-readiness-packet":
    "runtime-execution-readiness-packet-smoke.ts",
};

export function createNativeRuntimeExecutionProofTargetedSmokeCoverage(
  input: CreateNativeRuntimeExecutionProofTargetedSmokeCoverageInput,
): NativeRuntimeExecutionProofTargetedSmokeCoverageReport {
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
  const baseFileName = `${slug(workspaceId)}-native-runtime-execution-proof-targeted-smoke-coverage-${slug(
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
        label: "Native runtime execution proof targeted smoke coverage CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native runtime execution proof targeted smoke coverage JSON",
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
  area: NativeRuntimeExecutionProofTargetedSmokeCoverageArea,
): NativeRuntimeExecutionProofTargetedSmokeCoverageCheckInput {
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
  input: NativeRuntimeExecutionProofTargetedSmokeCoverageCheckInput,
): NativeRuntimeExecutionProofTargetedSmokeCoverageRow {
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
    NativeRuntimeExecutionProofTargetedSmokeCoverageRow,
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
  readonly inputStatus: NativeRuntimeExecutionProofTargetedSmokeCoverageStatus;
  readonly readyScenarioCovered: boolean;
  readonly reportHashAttached: boolean;
  readonly scriptLinked: boolean;
}): NativeRuntimeExecutionProofTargetedSmokeCoverageStatus {
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
    NativeRuntimeExecutionProofTargetedSmokeCoverageRow,
    | "area"
    | "blockedScenarioCovered"
    | "readyScenarioCovered"
    | "reportHashAttached"
    | "scriptLinked"
    | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native runtime execution proof targeted smoke coverage for ${row.area}.`;
  }

  if (!row.scriptLinked) {
    return `Link the native runtime execution proof smoke script for ${row.area}.`;
  }

  if (!row.readyScenarioCovered) {
    return `Add ready-path native runtime execution proof smoke evidence for ${row.area}.`;
  }

  if (!row.blockedScenarioCovered) {
    return `Add blocked-path native runtime execution proof smoke evidence for ${row.area}.`;
  }

  if (!row.reportHashAttached) {
    return `Attach native runtime execution proof smoke report hash for ${row.area}.`;
  }

  return `Native runtime execution proof targeted smoke coverage is ready for ${row.area}.`;
}

function summarize(
  rows: readonly NativeRuntimeExecutionProofTargetedSmokeCoverageRow[],
): NativeRuntimeExecutionProofTargetedSmokeCoverageReport["summary"] {
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
  const status: NativeRuntimeExecutionProofTargetedSmokeCoverageStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    coverageHash: sha256(rows.map((row) => row.coverageHash)),
    coverageScore: Math.round((readySignals / (rows.length * 4)) * 100),
    missingCoverageCount,
    nextAction:
      status === "ready"
        ? "Native runtime execution proof targeted smoke coverage is ready to close the runtime execution proof set."
        : "Resolve blocked native runtime execution proof targeted smoke coverage before closing the runtime execution proof set.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(
  rows: readonly NativeRuntimeExecutionProofTargetedSmokeCoverageRow[],
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
