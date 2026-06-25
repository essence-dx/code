import { createHash } from "node:crypto";

export type NativeToolchainPrerequisiteKind =
  | "cad-runtime"
  | "notarization-tool"
  | "package-manager"
  | "signing-cli";

export type NativeToolchainPrerequisitePlatform =
  | "android"
  | "cross-platform"
  | "ios"
  | "linux"
  | "macos"
  | "windows";

export type NativeToolchainPrerequisiteStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeToolchainPrerequisiteFileFormat = "csv" | "json";

export interface NativeToolchainPrerequisiteInput {
  readonly commandName: string;
  readonly detectedPath: string;
  readonly detectionCommand: string;
  readonly evidenceHash: string;
  readonly kind: NativeToolchainPrerequisiteKind;
  readonly owner: string;
  readonly platform: NativeToolchainPrerequisitePlatform;
  readonly required: boolean;
  readonly toolId: string;
  readonly version: string;
}

export interface NativeToolchainPrerequisiteRow {
  readonly commandName: string;
  readonly commandReady: boolean;
  readonly detectedPath: string;
  readonly detectionCommand: string;
  readonly evidenceHash: string;
  readonly evidenceReady: boolean;
  readonly kind: NativeToolchainPrerequisiteKind;
  readonly nextAction: string;
  readonly owner: string;
  readonly ownerReady: boolean;
  readonly pathReady: boolean;
  readonly platform: NativeToolchainPrerequisitePlatform;
  readonly prerequisiteHash: string;
  readonly required: boolean;
  readonly status: NativeToolchainPrerequisiteStatus;
  readonly toolId: string;
  readonly version: string;
  readonly versionReady: boolean;
}

export interface NativeToolchainPrerequisiteFile {
  readonly download: string;
  readonly format: NativeToolchainPrerequisiteFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeToolchainPrerequisiteDetectorReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: NativeToolchainPrerequisiteFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: NativeToolchainPrerequisiteRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly cadRuntimeReadyCount: number;
    readonly notarizationReadyCount: number;
    readonly packageManagerReadyCount: number;
    readonly prerequisiteHash: string;
    readonly prerequisiteScore: number;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly signingReadyCount: number;
    readonly status: NativeToolchainPrerequisiteStatus;
    readonly nextAction: string;
  };
  readonly workspaceId: string;
}

export interface CreateNativeToolchainPrerequisiteDetectorInput {
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredTools?: readonly NativeToolchainPrerequisiteInput[];
  readonly tools: readonly NativeToolchainPrerequisiteInput[];
  readonly workspaceId?: string;
}

const defaultRequiredTools: readonly NativeToolchainPrerequisiteInput[] = [
  {
    commandName: "signtool.exe",
    detectedPath: "",
    detectionCommand: "where.exe signtool",
    evidenceHash: "",
    kind: "signing-cli",
    owner: "",
    platform: "windows",
    required: true,
    toolId: "windows-signtool",
    version: "",
  },
  {
    commandName: "xcrun notarytool",
    detectedPath: "",
    detectionCommand: "xcrun notarytool --version",
    evidenceHash: "",
    kind: "notarization-tool",
    owner: "",
    platform: "macos",
    required: true,
    toolId: "apple-notarytool",
    version: "",
  },
  {
    commandName: "cargo",
    detectedPath: "",
    detectionCommand: "cargo --version",
    evidenceHash: "",
    kind: "package-manager",
    owner: "",
    platform: "cross-platform",
    required: true,
    toolId: "cargo",
    version: "",
  },
  {
    commandName: "bun",
    detectedPath: "",
    detectionCommand: "bun --version",
    evidenceHash: "",
    kind: "package-manager",
    owner: "",
    platform: "cross-platform",
    required: true,
    toolId: "bun",
    version: "",
  },
  {
    commandName: "freecadcmd",
    detectedPath: "",
    detectionCommand: "freecadcmd --version",
    evidenceHash: "",
    kind: "cad-runtime",
    owner: "",
    platform: "cross-platform",
    required: true,
    toolId: "freecad",
    version: "",
  },
  {
    commandName: "essence-occt-convert",
    detectedPath: "",
    detectionCommand: "essence-occt-convert --version",
    evidenceHash: "",
    kind: "cad-runtime",
    owner: "",
    platform: "cross-platform",
    required: true,
    toolId: "occt",
    version: "",
  },
];

const kindRank: Record<NativeToolchainPrerequisiteKind, number> = {
  "signing-cli": 0,
  "notarization-tool": 1,
  "package-manager": 2,
  "cad-runtime": 3,
};

export function createNativeToolchainPrerequisiteDetector(
  input: CreateNativeToolchainPrerequisiteDetectorInput,
): NativeToolchainPrerequisiteDetectorReport {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const requiredTools = input.requiredTools ?? defaultRequiredTools;
  const toolRank = new Map(
    requiredTools.map((tool, index) => [tool.toolId, index]),
  );
  const toolById = new Map(input.tools.map((tool) => [tool.toolId, tool]));
  const rows = requiredTools
    .map((requiredTool) =>
      createRow({ ...requiredTool, ...toolById.get(requiredTool.toolId) }),
    )
    .sort((first, second) => compareRows(first, second, toolRank));
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
  const baseFileName = `${slug(workspaceId)}-native-toolchain-prerequisite-detector-${slug(
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
        label: "Native toolchain prerequisite detector CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native toolchain prerequisite detector JSON",
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
  input: NativeToolchainPrerequisiteInput,
): NativeToolchainPrerequisiteRow {
  const commandName = input.commandName.trim();
  const detectedPath = input.detectedPath.trim();
  const detectionCommand = input.detectionCommand.trim();
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const owner = input.owner.trim();
  const toolId = input.toolId.trim() || "unassigned-tool";
  const version = input.version.trim();
  const commandReady = commandName.length > 0 && detectionCommand.length > 0;
  const pathReady = detectedPath.length > 0;
  const versionReady = version.length > 0;
  const evidenceReady = hasSha256(evidenceHash);
  const ownerReady = owner.length > 0;
  const status = statusFor({
    commandReady,
    evidenceReady,
    ownerReady,
    pathReady,
    required: input.required,
    versionReady,
  });
  const rowWithoutHash = {
    commandName,
    commandReady,
    detectedPath,
    detectionCommand,
    evidenceHash,
    evidenceReady,
    kind: input.kind,
    nextAction: "",
    owner,
    ownerReady,
    pathReady,
    platform: input.platform,
    required: input.required,
    status,
    toolId,
    version,
    versionReady,
  } satisfies Omit<NativeToolchainPrerequisiteRow, "prerequisiteHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    prerequisiteHash: sha256(row),
  };
}

function statusFor(input: {
  readonly commandReady: boolean;
  readonly evidenceReady: boolean;
  readonly ownerReady: boolean;
  readonly pathReady: boolean;
  readonly required: boolean;
  readonly versionReady: boolean;
}): NativeToolchainPrerequisiteStatus {
  if (
    input.required &&
    (!input.commandReady ||
      !input.pathReady ||
      !input.versionReady ||
      !input.evidenceReady)
  ) {
    return "blocked";
  }

  if (!input.ownerReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeToolchainPrerequisiteRow,
    | "commandReady"
    | "evidenceReady"
    | "kind"
    | "ownerReady"
    | "pathReady"
    | "required"
    | "status"
    | "toolId"
    | "versionReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native toolchain prerequisite detector for ${row.toolId}.`;
  }

  if (!row.commandReady) {
    return `Attach local detection command for ${row.toolId}.`;
  }

  if (!row.pathReady) {
    return `Record detected local path for ${row.toolId}.`;
  }

  if (!row.versionReady) {
    return `Record detected local version for ${row.toolId}.`;
  }

  if (!row.evidenceReady) {
    return `Attach sha256 detection evidence for ${row.toolId}.`;
  }

  if (!row.ownerReady) {
    return `Assign owner for ${row.kind} prerequisite ${row.toolId}.`;
  }

  return `Native toolchain prerequisite detector is ready for ${row.toolId}.`;
}

function summarize(
  rows: readonly NativeToolchainPrerequisiteRow[],
): NativeToolchainPrerequisiteDetectorReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.commandReady,
        row.pathReady,
        row.versionReady,
        row.evidenceReady,
        row.ownerReady,
      ].filter(Boolean).length,
    0,
  );
  const status: NativeToolchainPrerequisiteStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const releaseBlocked = rows.some(
    (row) => row.required && row.status === "blocked",
  );

  return {
    blockedCount,
    cadRuntimeReadyCount: readyCountFor(rows, "cad-runtime"),
    nextAction:
      status === "ready"
        ? "Native toolchain prerequisites are ready for runtime execution proof."
        : "Resolve blocked native toolchain prerequisite detector before runtime execution proof.",
    notarizationReadyCount: readyCountFor(rows, "notarization-tool"),
    packageManagerReadyCount: readyCountFor(rows, "package-manager"),
    prerequisiteHash: sha256(rows.map((row) => row.prerequisiteHash)),
    prerequisiteScore: Math.round((readySignals / (rows.length * 5)) * 100),
    readyCount,
    releaseBlocked,
    reviewCount,
    rowCount: rows.length,
    signingReadyCount: readyCountFor(rows, "signing-cli"),
    status,
  };
}

function readyCountFor(
  rows: readonly NativeToolchainPrerequisiteRow[],
  kind: NativeToolchainPrerequisiteKind,
) {
  return rows.filter((row) => row.kind === kind && row.status === "ready")
    .length;
}

function compareRows(
  first: NativeToolchainPrerequisiteRow,
  second: NativeToolchainPrerequisiteRow,
  toolRank: ReadonlyMap<string, number>,
) {
  const firstRank = toolRank.get(first.toolId);
  const secondRank = toolRank.get(second.toolId);

  if (firstRank !== undefined && secondRank !== undefined) {
    return firstRank - secondRank;
  }

  const kindDiff = kindRank[first.kind] - kindRank[second.kind];

  return kindDiff === 0 ? first.toolId.localeCompare(second.toolId) : kindDiff;
}

function createCsv(rows: readonly NativeToolchainPrerequisiteRow[]) {
  const header = [
    "tool_id",
    "kind",
    "platform",
    "status",
    "command_ready",
    "path_ready",
    "version_ready",
    "evidence_ready",
    "owner_ready",
    "prerequisite_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.toolId,
    row.kind,
    row.platform,
    row.status,
    String(row.commandReady),
    String(row.pathReady),
    String(row.versionReady),
    String(row.evidenceReady),
    String(row.ownerReady),
    row.prerequisiteHash,
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
