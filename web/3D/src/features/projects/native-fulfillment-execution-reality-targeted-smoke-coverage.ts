import { createHash } from "node:crypto";

export type NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea =
  | "customer-facing-native-fulfillment-status-packet"
  | "native-export-fulfillment-rehearsal"
  | "packaged-cad-runtime-execution-adapter"
  | "signed-package-artifact-locator";

export type NativeFulfillmentExecutionRealityTargetedSmokeCoverageStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeFulfillmentExecutionRealityTargetedSmokeCoverageFileFormat =
  | "csv"
  | "json";

export interface NativeFulfillmentExecutionRealityTargetedSmokeCoverageCheckInput {
  readonly area: NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea;
  readonly blockedScenarioHash: string;
  readonly readyScenarioHash: string;
  readonly reportHash: string;
  readonly scriptName: string;
  readonly status: NativeFulfillmentExecutionRealityTargetedSmokeCoverageStatus;
}

export interface NativeFulfillmentExecutionRealityTargetedSmokeCoverageRow {
  readonly area: NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea;
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
  readonly status: NativeFulfillmentExecutionRealityTargetedSmokeCoverageStatus;
}

export interface NativeFulfillmentExecutionRealityTargetedSmokeCoverageFile {
  readonly download: string;
  readonly format: NativeFulfillmentExecutionRealityTargetedSmokeCoverageFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeFulfillmentExecutionRealityTargetedSmokeCoverageReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly NativeFulfillmentExecutionRealityTargetedSmokeCoverageFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly NativeFulfillmentExecutionRealityTargetedSmokeCoverageRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly coverageHash: string;
    readonly coverageScore: number;
    readonly missingCoverageCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: NativeFulfillmentExecutionRealityTargetedSmokeCoverageStatus;
  };
  readonly workspaceId: string;
}

export interface CreateNativeFulfillmentExecutionRealityTargetedSmokeCoverageInput {
  readonly checks: readonly NativeFulfillmentExecutionRealityTargetedSmokeCoverageCheckInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAreas?: readonly NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea[];
  readonly workspaceId?: string;
}

const defaultRequiredAreas: readonly NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea[] =
  [
    "signed-package-artifact-locator",
    "packaged-cad-runtime-execution-adapter",
    "native-export-fulfillment-rehearsal",
    "customer-facing-native-fulfillment-status-packet",
  ];

const areaRank: Record<
  NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea,
  number
> = {
  "signed-package-artifact-locator": 0,
  "packaged-cad-runtime-execution-adapter": 1,
  "native-export-fulfillment-rehearsal": 2,
  "customer-facing-native-fulfillment-status-packet": 3,
};

const expectedScriptNames: Record<
  NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea,
  string
> = {
  "signed-package-artifact-locator": "signed-package-artifact-locator-smoke.ts",
  "packaged-cad-runtime-execution-adapter":
    "packaged-cad-runtime-execution-adapter-smoke.ts",
  "native-export-fulfillment-rehearsal":
    "native-export-fulfillment-rehearsal-smoke.ts",
  "customer-facing-native-fulfillment-status-packet":
    "customer-facing-native-fulfillment-status-packet-smoke.ts",
};

export function createNativeFulfillmentExecutionRealityTargetedSmokeCoverage(
  input: CreateNativeFulfillmentExecutionRealityTargetedSmokeCoverageInput,
): NativeFulfillmentExecutionRealityTargetedSmokeCoverageReport {
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
  const fileBase = `${slug(workspaceId)}-native-fulfillment-execution-reality-targeted-smoke-coverage-${slug(
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
        label: "Native fulfillment execution reality targeted smoke coverage CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native fulfillment execution reality targeted smoke coverage JSON",
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
  area: NativeFulfillmentExecutionRealityTargetedSmokeCoverageArea,
): NativeFulfillmentExecutionRealityTargetedSmokeCoverageCheckInput {
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
  input: NativeFulfillmentExecutionRealityTargetedSmokeCoverageCheckInput,
): NativeFulfillmentExecutionRealityTargetedSmokeCoverageRow {
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
    NativeFulfillmentExecutionRealityTargetedSmokeCoverageRow,
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
  readonly inputStatus: NativeFulfillmentExecutionRealityTargetedSmokeCoverageStatus;
  readonly readyScenarioCovered: boolean;
  readonly reportHashAttached: boolean;
  readonly scriptLinked: boolean;
}): NativeFulfillmentExecutionRealityTargetedSmokeCoverageStatus {
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
    NativeFulfillmentExecutionRealityTargetedSmokeCoverageRow,
    | "area"
    | "blockedScenarioCovered"
    | "readyScenarioCovered"
    | "reportHashAttached"
    | "scriptLinked"
    | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native fulfillment execution reality targeted smoke coverage for ${row.area}.`;
  }

  if (!row.scriptLinked) {
    return `Link the targeted smoke script for ${row.area}.`;
  }

  if (!row.readyScenarioCovered) {
    return `Add ready-path smoke evidence for ${row.area}.`;
  }

  if (!row.blockedScenarioCovered) {
    return `Add blocked-path smoke evidence for ${row.area}.`;
  }

  if (!row.reportHashAttached) {
    return `Attach targeted smoke report hash for ${row.area}.`;
  }

  return `Native fulfillment execution reality targeted smoke coverage is ready for ${row.area}.`;
}

function summarize(
  rows: readonly NativeFulfillmentExecutionRealityTargetedSmokeCoverageRow[],
): NativeFulfillmentExecutionRealityTargetedSmokeCoverageReport["summary"] {
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
  const status: NativeFulfillmentExecutionRealityTargetedSmokeCoverageStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const coverageScore =
    rows.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (readyCount / rows.length) * 100 +
                reviewCount * 15 -
                blockedCount * 18 -
                missingCoverageCount * 10,
            ),
          ),
        );

  return {
    blockedCount,
    coverageHash: sha256(rows.map((row) => row.coverageHash)),
    coverageScore,
    missingCoverageCount,
    nextAction:
      status === "ready"
        ? "Native fulfillment execution reality targeted smoke coverage is complete."
        : `Resolve blocked native fulfillment execution reality targeted smoke coverage for ${rows
            .filter((row) => row.status !== "ready")
            .map((row) => row.area)
            .join(", ")}.`,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(
  rows: readonly NativeFulfillmentExecutionRealityTargetedSmokeCoverageRow[],
) {
  const headers = [
    "area",
    "status",
    "script_linked",
    "ready_scenario_covered",
    "blocked_scenario_covered",
    "report_hash_attached",
    "coverage_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.area,
      row.status,
      String(row.scriptLinked),
      String(row.readyScenarioCovered),
      String(row.blockedScenarioCovered),
      String(row.reportHashAttached),
      row.coverageHash,
      row.nextAction,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function csvEscape(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:") && value.trim().length > "sha256:".length;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
