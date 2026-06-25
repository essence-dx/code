import { createHash } from "node:crypto";

export type ProductionInstallLaunchPlatform =
  | "android"
  | "ios"
  | "linux"
  | "macos"
  | "windows";
export type ProductionInstallLaunchStatus = "blocked" | "ready" | "review";
export type ProductionInstallLaunchFileFormat = "csv" | "json";

export interface ProductionInstallLaunchEvidenceInput {
  crashCount: number;
  crashFreeMinutes: number;
  crashFreeSessionHash: string;
  installCommand: string;
  installTranscriptHash: string;
  installedAt: string;
  installerFileName: string;
  installerSha256: string;
  launchCommand: string;
  launchExitCode: number;
  launchSmokeHash: string;
  launchedAt: string;
  platform: ProductionInstallLaunchPlatform;
  rollbackEvidenceHash: string;
  rollbackRoute: string;
  verifierOwner: string;
}

export interface ProductionInstallLaunchEvidenceRow {
  crashCount: number;
  crashFreeMinutes: number;
  crashFreeSessionHash: string;
  crashFreeSessionReady: boolean;
  installCommand: string;
  installTranscriptHash: string;
  installTranscriptReady: boolean;
  installedAt: string;
  installerFileName: string;
  installerHashReady: boolean;
  installerSha256: string;
  launchCommand: string;
  launchExitCode: number;
  launchSmokeHash: string;
  launchSmokeReady: boolean;
  launchedAt: string;
  nextAction: string;
  ownerReady: boolean;
  packetHash: string;
  platform: ProductionInstallLaunchPlatform;
  productionBlockingReason: string;
  rollbackEvidenceHash: string;
  rollbackRoute: string;
  rollbackRouteReady: boolean;
  status: ProductionInstallLaunchStatus;
  verifierOwner: string;
}

export interface ProductionInstallLaunchEvidenceFile {
  download: string;
  format: ProductionInstallLaunchFileFormat;
  href: string;
  label: string;
}

export interface ProductionInstallLaunchEvidencePacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: ProductionInstallLaunchEvidenceFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: ProductionInstallLaunchEvidenceRow[];
  summary: {
    blockedCount: number;
    crashFreeReadyCount: number;
    installLaunchBlocked: boolean;
    installLaunchScore: number;
    installerHashReadyCount: number;
    launchSmokeReadyCount: number;
    nextAction: string;
    packetHash: string;
    readyCount: number;
    reviewCount: number;
    rollbackRouteReadyCount: number;
    rowCount: number;
    status: ProductionInstallLaunchStatus;
  };
  workspaceId: string;
}

export interface CreateProductionInstallLaunchEvidencePacketInput {
  evidence: ProductionInstallLaunchEvidenceInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredPlatforms?: ProductionInstallLaunchPlatform[];
  workspaceId?: string;
}

const defaultRequiredPlatforms: ProductionInstallLaunchPlatform[] = [
  "windows",
  "macos",
  "linux",
  "android",
  "ios",
];

const platformRank: Record<ProductionInstallLaunchPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
  android: 3,
  ios: 4,
};

export function createProductionInstallLaunchEvidencePacket(
  input: CreateProductionInstallLaunchEvidencePacketInput,
): ProductionInstallLaunchEvidencePacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
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
  const fileBase = `${slug(workspaceId)}-production-install-launch-evidence-packet-${slug(
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
        label: "Production install and launch evidence packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Production install and launch evidence packet JSON",
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

function createRows(input: CreateProductionInstallLaunchEvidencePacketInput) {
  const evidenceByPlatform = new Map(
    input.evidence.map((entry) => [entry.platform, entry]),
  );
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) =>
      createRow(evidenceByPlatform.get(platform) ?? missingEvidence(platform)),
    )
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function createRow(
  input: ProductionInstallLaunchEvidenceInput,
): ProductionInstallLaunchEvidenceRow {
  const crashFreeSessionHash = input.crashFreeSessionHash.trim();
  const installCommand = input.installCommand.trim();
  const installTranscriptHash = input.installTranscriptHash.trim();
  const installedAt = input.installedAt.trim();
  const installerFileName = input.installerFileName.trim();
  const installerSha256 = input.installerSha256.trim();
  const launchCommand = input.launchCommand.trim();
  const launchSmokeHash = input.launchSmokeHash.trim();
  const launchedAt = input.launchedAt.trim();
  const rollbackEvidenceHash = input.rollbackEvidenceHash.trim();
  const rollbackRoute = input.rollbackRoute.trim();
  const verifierOwner = input.verifierOwner.trim();
  const installerHashReady =
    installerFileName.length > 0 && hasSha256(installerSha256);
  const installTranscriptReady =
    installCommand.length > 0 &&
    hasSha256(installTranscriptHash) &&
    validDate(installedAt);
  const launchSmokeReady =
    launchCommand.length > 0 &&
    input.launchExitCode === 0 &&
    hasSha256(launchSmokeHash) &&
    validDate(launchedAt);
  const crashFreeSessionReady =
    input.crashCount === 0 &&
    input.crashFreeMinutes >= 30 &&
    hasSha256(crashFreeSessionHash);
  const rollbackRouteReady =
    rollbackRoute.length > 0 && hasSha256(rollbackEvidenceHash);
  const ownerReady = verifierOwner.length > 0;
  const status = statusFor({
    crashFreeSessionReady,
    installTranscriptReady,
    installerHashReady,
    launchSmokeReady,
    ownerReady,
    rollbackRouteReady,
  });
  const productionBlockingReason = productionBlockingReasonFor({
    crashFreeSessionReady,
    installTranscriptReady,
    installerHashReady,
    launchSmokeReady,
    ownerReady,
    rollbackRouteReady,
  });
  const rowWithoutHash = {
    crashCount: Math.max(0, Math.round(input.crashCount)),
    crashFreeMinutes: Math.max(0, Math.round(input.crashFreeMinutes)),
    crashFreeSessionHash: crashFreeSessionHash || "missing",
    crashFreeSessionReady,
    installCommand,
    installTranscriptHash: installTranscriptHash || "missing",
    installTranscriptReady,
    installedAt,
    installerFileName:
      installerFileName || `No ${input.platform} production installer recorded`,
    installerHashReady,
    installerSha256: installerSha256 || "missing",
    launchCommand,
    launchExitCode: input.launchExitCode,
    launchSmokeHash: launchSmokeHash || "missing",
    launchSmokeReady,
    launchedAt,
    nextAction: "",
    ownerReady,
    platform: input.platform,
    productionBlockingReason,
    rollbackEvidenceHash: rollbackEvidenceHash || "missing",
    rollbackRoute,
    rollbackRouteReady,
    status,
    verifierOwner,
  } satisfies Omit<ProductionInstallLaunchEvidenceRow, "packetHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    packetHash: sha256(row),
  };
}

function statusFor(input: {
  crashFreeSessionReady: boolean;
  installTranscriptReady: boolean;
  installerHashReady: boolean;
  launchSmokeReady: boolean;
  ownerReady: boolean;
  rollbackRouteReady: boolean;
}): ProductionInstallLaunchStatus {
  if (
    !input.crashFreeSessionReady ||
    !input.installTranscriptReady ||
    !input.installerHashReady ||
    !input.launchSmokeReady ||
    !input.rollbackRouteReady
  ) {
    return "blocked";
  }

  if (!input.ownerReady) {
    return "review";
  }

  return "ready";
}

function productionBlockingReasonFor(input: {
  crashFreeSessionReady: boolean;
  installTranscriptReady: boolean;
  installerHashReady: boolean;
  launchSmokeReady: boolean;
  ownerReady: boolean;
  rollbackRouteReady: boolean;
}) {
  if (!input.installerHashReady) {
    return "Missing production installer hash.";
  }

  if (!input.installTranscriptReady) {
    return "Missing production install transcript proof.";
  }

  if (!input.launchSmokeReady) {
    return "Missing successful launch smoke proof.";
  }

  if (!input.crashFreeSessionReady) {
    return "Missing crash-free session proof.";
  }

  if (!input.rollbackRouteReady) {
    return "Missing rollback route proof.";
  }

  if (!input.ownerReady) {
    return "Missing production install and launch evidence owner.";
  }

  return "Ready for production install and launch release evidence.";
}

function nextActionFor(
  row: Omit<ProductionInstallLaunchEvidenceRow, "packetHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked production install and launch evidence packet for ${row.platform}.`;
  }

  if (row.status === "review") {
    return `Assign production install and launch evidence owner for ${row.platform}.`;
  }

  return `Production install and launch evidence is ready for ${row.platform}.`;
}

function summarize(
  rows: ProductionInstallLaunchEvidenceRow[],
): ProductionInstallLaunchEvidencePacket["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const crashFreeReadyCount = rows.filter(
    (row) => row.crashFreeSessionReady,
  ).length;
  const installerHashReadyCount = rows.filter(
    (row) => row.installerHashReady,
  ).length;
  const launchSmokeReadyCount = rows.filter(
    (row) => row.launchSmokeReady,
  ).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const rollbackRouteReadyCount = rows.filter(
    (row) => row.rollbackRouteReady,
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.crashFreeSessionReady,
        row.installTranscriptReady,
        row.installerHashReady,
        row.launchSmokeReady,
        row.ownerReady,
        row.rollbackRouteReady,
      ].filter(Boolean).length,
    0,
  );
  const totalSignals = Math.max(rows.length * 6, 1);
  const status: ProductionInstallLaunchStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const installLaunchBlocked = status !== "ready";
  const nextRow = rows.find((row) => row.status !== "ready");
  const summaryWithoutHash = {
    blockedCount,
    crashFreeReadyCount,
    installLaunchBlocked,
    installLaunchScore: Math.round((readySignals / totalSignals) * 100),
    installerHashReadyCount,
    launchSmokeReadyCount,
    nextAction:
      nextRow?.nextAction ??
      "Production install and launch evidence packet is ready for release.",
    readyCount,
    reviewCount,
    rollbackRouteReadyCount,
    rowCount: rows.length,
    status,
  };

  return {
    ...summaryWithoutHash,
    packetHash: sha256({
      rows: rows.map((row) => row.packetHash),
      summary: summaryWithoutHash,
    }),
  };
}

function createCsv(rows: ProductionInstallLaunchEvidenceRow[]) {
  const header = [
    "platform",
    "status",
    "installer_file_name",
    "installer_hash_ready",
    "install_transcript_ready",
    "launch_smoke_ready",
    "crash_free_session_ready",
    "rollback_route_ready",
    "packet_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.installerFileName,
      row.installerHashReady,
      row.installTranscriptReady,
      row.launchSmokeReady,
      row.crashFreeSessionReady,
      row.rollbackRouteReady,
      row.packetHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function missingEvidence(
  platform: ProductionInstallLaunchPlatform,
): ProductionInstallLaunchEvidenceInput {
  return {
    crashCount: 0,
    crashFreeMinutes: 0,
    crashFreeSessionHash: "",
    installCommand: "",
    installTranscriptHash: "",
    installedAt: "",
    installerFileName: "",
    installerSha256: "",
    launchCommand: "",
    launchExitCode: 1,
    launchSmokeHash: "",
    launchedAt: "",
    platform,
    rollbackEvidenceHash: "",
    rollbackRoute: "",
    verifierOwner: "",
  };
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}
