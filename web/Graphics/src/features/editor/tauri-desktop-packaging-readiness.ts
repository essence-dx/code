export type TauriDesktopPackagingReadinessStatus =
  | "ready"
  | "review"
  | "blocked";

export type TauriDesktopPackagingReadinessCategory =
  | "filesystem-permission-safety"
  | "offline-bundle-parity"
  | "release-packet"
  | "rust-command-health"
  | "updater-evidence";

export type TauriDesktopPackagingReadinessInput = {
  appIdentifier: string | null;
  appVersion: string;
  beforeBuildCommand: string | null;
  bundleActive: boolean;
  bundleTargets: string | null;
  capabilityPermissionIds: string[];
  cargoCheckCommand: string | null;
  cargoClippyCommand: string | null;
  cargoPackageVersion: string | null;
  commandHandlerCount: number;
  devUrl: string | null;
  filesystemPermissionCount: number;
  frontendDist: string | null;
  iconCount: number;
  nextStaticExportConfigured: boolean;
  panicPathCount: number;
  productName: string;
  releasePacketEvidence: string[];
  rustVersion: string | null;
  tauriBuildScript: string | null;
  tauriConfigPresent: boolean;
  tauriConfigVersion: string | null;
  tauriDevScript: string | null;
  tauriVersion: string | null;
  updaterEndpointConfigured: boolean;
  updaterPluginPresent: boolean;
  updaterSignatureConfigured: boolean;
};

export type TauriDesktopPackagingReadinessRow = {
  id: string;
  status: TauriDesktopPackagingReadinessStatus;
  category: TauriDesktopPackagingReadinessCategory;
  label: string;
  detail: string;
  value: string;
  evidenceCount: number;
  recommendation: string;
};

export type TauriDesktopPackagingReadinessReport = {
  generatedAt: string;
  status: TauriDesktopPackagingReadinessStatus;
  score: number;
  productName: string;
  appIdentifier: string | null;
  appVersion: string;
  tauriVersion: string | null;
  rustCommandStatus: TauriDesktopPackagingReadinessStatus;
  filesystemPermissionStatus: TauriDesktopPackagingReadinessStatus;
  offlineBundleStatus: TauriDesktopPackagingReadinessStatus;
  updaterStatus: TauriDesktopPackagingReadinessStatus;
  releasePacketStatus: TauriDesktopPackagingReadinessStatus;
  commandHandlerCount: number;
  filesystemPermissionCount: number;
  iconCount: number;
  releasePacketEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: TauriDesktopPackagingReadinessRow[];
  releasePacketEvidence: string[];
};

export const currentTauriDesktopPackagingReadinessInput =
  {
    appIdentifier: "com.essencefromexistence.essencefigma",
    appVersion: "0.1.0",
    beforeBuildCommand: "bun run build",
    bundleActive: true,
    bundleTargets: "all",
    capabilityPermissionIds: ["core:default"],
    cargoCheckCommand: "cargo check --manifest-path src-tauri/Cargo.toml",
    cargoClippyCommand:
      "cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets",
    cargoPackageVersion: "0.1.0",
    commandHandlerCount: 0,
    devUrl: "http://localhost:3000",
    filesystemPermissionCount: 0,
    frontendDist: "../out",
    iconCount: 5,
    nextStaticExportConfigured: false,
    panicPathCount: 0,
    productName: "Essence Figma",
    releasePacketEvidence: [
      "Export Tauri desktop packaging readiness JSON.",
      "Export Tauri desktop packaging readiness CSV.",
      "Export Tauri desktop packaging readiness Markdown.",
      "Attach src-tauri/tauri.conf.json, src-tauri/Cargo.toml, and package.json script evidence.",
    ],
    rustVersion: "1.77.2",
    tauriBuildScript: "tauri build",
    tauriConfigPresent: true,
    tauriConfigVersion: "0.1.0",
    tauriDevScript: "tauri dev",
    tauriVersion: "2.11.1",
    updaterEndpointConfigured: false,
    updaterPluginPresent: false,
    updaterSignatureConfigured: false,
  } satisfies TauriDesktopPackagingReadinessInput;

export function getTauriDesktopPackagingReadinessReport({
  generatedAt = new Date().toISOString(),
  input = currentTauriDesktopPackagingReadinessInput,
}: {
  generatedAt?: string;
  input?: TauriDesktopPackagingReadinessInput;
} = {}): TauriDesktopPackagingReadinessReport {
  const rustCommandStatus = getRustCommandStatus(input);
  const filesystemPermissionStatus = getFilesystemPermissionStatus(input);
  const offlineBundleStatus = getOfflineBundleStatus(input);
  const updaterStatus = getUpdaterStatus(input);
  const releasePacketStatus = getReleasePacketStatus(input);
  const rows = [
    getRustCommandRow(input, rustCommandStatus),
    getFilesystemPermissionRow(input, filesystemPermissionStatus),
    getOfflineBundleRow(input, offlineBundleStatus),
    getUpdaterRow(input, updaterStatus),
    getReleasePacketRow(input, releasePacketStatus),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    productName: input.productName,
    appIdentifier: input.appIdentifier,
    appVersion: input.appVersion,
    tauriVersion: input.tauriVersion,
    rustCommandStatus,
    filesystemPermissionStatus,
    offlineBundleStatus,
    updaterStatus,
    releasePacketStatus,
    commandHandlerCount: input.commandHandlerCount,
    filesystemPermissionCount: input.filesystemPermissionCount,
    iconCount: input.iconCount,
    releasePacketEvidenceCount: input.releasePacketEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    rows,
    releasePacketEvidence: input.releasePacketEvidence,
  };
}

export function getTauriDesktopPackagingReadinessCsv(
  report: TauriDesktopPackagingReadinessReport,
  rows: TauriDesktopPackagingReadinessRow[] = report.rows,
) {
  const header: Array<keyof TauriDesktopPackagingReadinessRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "value",
    "evidenceCount",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "product",
      "identifier",
      "version",
      "tauri_version",
      "rust_command_status",
      "filesystem_permission_status",
      "offline_bundle_status",
      "updater_status",
      "release_packet_status",
      "evidence",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.productName,
      report.appIdentifier ?? "",
      report.appVersion,
      report.tauriVersion ?? "",
      report.rustCommandStatus,
      report.filesystemPermissionStatus,
      report.offlineBundleStatus,
      report.updaterStatus,
      report.releasePacketStatus,
      report.releasePacketEvidenceCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header.map((key) => escapeCsvCell(row[key])).join(","),
    ),
  ].join("\n");
}

export function getTauriDesktopPackagingReadinessMarkdown(
  report: TauriDesktopPackagingReadinessReport,
  rows: TauriDesktopPackagingReadinessRow[] = report.rows,
) {
  return [
    "# Tauri Desktop Packaging Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Product: ${report.productName}`,
    `Identifier: ${report.appIdentifier ?? "missing"}`,
    `Version: ${report.appVersion}`,
    `Tauri version: ${report.tauriVersion ?? "missing"}`,
    `Rust command health: ${report.rustCommandStatus}`,
    `Filesystem permission safety: ${report.filesystemPermissionStatus}`,
    `Offline bundle parity: ${report.offlineBundleStatus}`,
    `Updater evidence: ${report.updaterStatus}`,
    `Release packet readiness: ${report.releasePacketStatus}`,
    "",
    "## Readiness Rows",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Release Packet Evidence",
    ...report.releasePacketEvidence.map((item) => `- ${item}`),
  ].join("\n");
}

export function getTauriDesktopPackagingReadinessJson(
  report: TauriDesktopPackagingReadinessReport,
  rows: TauriDesktopPackagingReadinessRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.tauri-desktop-packaging-readiness",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        productName: report.productName,
        appIdentifier: report.appIdentifier,
        appVersion: report.appVersion,
        tauriVersion: report.tauriVersion,
        rustCommandStatus: report.rustCommandStatus,
        filesystemPermissionStatus: report.filesystemPermissionStatus,
        offlineBundleStatus: report.offlineBundleStatus,
        updaterStatus: report.updaterStatus,
        releasePacketStatus: report.releasePacketStatus,
        commandHandlerCount: report.commandHandlerCount,
        filesystemPermissionCount: report.filesystemPermissionCount,
        iconCount: report.iconCount,
        releasePacketEvidenceCount: report.releasePacketEvidenceCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      releasePacketEvidence: report.releasePacketEvidence,
      rows,
    },
    null,
    2,
  );
}

function getRustCommandStatus(input: TauriDesktopPackagingReadinessInput) {
  if (!input.tauriConfigPresent || !input.cargoCheckCommand) {
    return "blocked";
  }

  if (input.panicPathCount > 0) {
    return "blocked";
  }

  if (input.commandHandlerCount === 0 || !input.cargoClippyCommand) {
    return "review";
  }

  return "ready";
}

function getFilesystemPermissionStatus(
  input: TauriDesktopPackagingReadinessInput,
) {
  const broadPermission = input.capabilityPermissionIds.some((permission) =>
    /fs:allow-(home|app|resource|download|document|desktop)-recursive|fs:default/i.test(
      permission,
    ),
  );

  if (input.filesystemPermissionCount > 0 || broadPermission) {
    return "blocked";
  }

  return "ready";
}

function getOfflineBundleStatus(input: TauriDesktopPackagingReadinessInput) {
  if (!input.tauriConfigPresent || !input.frontendDist) {
    return "blocked";
  }

  if (!input.nextStaticExportConfigured) {
    return "blocked";
  }

  if (
    !input.bundleActive ||
    input.iconCount < 4 ||
    !input.beforeBuildCommand?.includes("build")
  ) {
    return "review";
  }

  return "ready";
}

function getUpdaterStatus(input: TauriDesktopPackagingReadinessInput) {
  if (
    input.updaterPluginPresent &&
    (!input.updaterEndpointConfigured || !input.updaterSignatureConfigured)
  ) {
    return "blocked";
  }

  if (
    !input.updaterPluginPresent ||
    !input.updaterEndpointConfigured ||
    !input.updaterSignatureConfigured
  ) {
    return "review";
  }

  return "ready";
}

function getReleasePacketStatus(input: TauriDesktopPackagingReadinessInput) {
  if (!input.tauriBuildScript || input.releasePacketEvidence.length < 3) {
    return "blocked";
  }

  if (!input.cargoClippyCommand || input.releasePacketEvidence.length < 4) {
    return "review";
  }

  return "ready";
}

function getRustCommandRow(
  input: TauriDesktopPackagingReadinessInput,
  status: TauriDesktopPackagingReadinessStatus,
): TauriDesktopPackagingReadinessRow {
  return {
    id: "tauri-rust-command-health",
    status,
    category: "rust-command-health",
    label: "Rust command health",
    detail: `${input.commandHandlerCount} Tauri command handler${input.commandHandlerCount === 1 ? "" : "s"}, cargo check command ${input.cargoCheckCommand ? "available" : "missing"}, clippy command ${input.cargoClippyCommand ? "available" : "missing"}, and ${input.panicPathCount} panic path${input.panicPathCount === 1 ? "" : "s"} in app command flow.`,
    value: input.tauriVersion ?? "missing",
    evidenceCount:
      Number(Boolean(input.cargoCheckCommand)) +
      Number(Boolean(input.cargoClippyCommand)) +
      input.commandHandlerCount,
    recommendation:
      status === "ready"
        ? "Keep cargo check and clippy commands in the desktop release packet."
        : status === "blocked"
          ? "Restore the Tauri config, cargo check command, and panic-free command handlers before desktop packaging."
          : "Add explicit command handler coverage or document why this desktop shell has no invoke handlers.",
  };
}

function getFilesystemPermissionRow(
  input: TauriDesktopPackagingReadinessInput,
  status: TauriDesktopPackagingReadinessStatus,
): TauriDesktopPackagingReadinessRow {
  return {
    id: "tauri-filesystem-permission-safety",
    status,
    category: "filesystem-permission-safety",
    label: "Filesystem permission safety",
    detail: `${input.capabilityPermissionIds.length} capability permission${input.capabilityPermissionIds.length === 1 ? "" : "s"} declared with ${input.filesystemPermissionCount} filesystem permission${input.filesystemPermissionCount === 1 ? "" : "s"}.`,
    value: input.capabilityPermissionIds.join("; ") || "none",
    evidenceCount: input.capabilityPermissionIds.length,
    recommendation:
      status === "ready"
        ? "Keep Tauri filesystem permissions absent until a narrow desktop command needs them."
        : "Replace broad filesystem capabilities with scoped command-side validation before packaging.",
  };
}

function getOfflineBundleRow(
  input: TauriDesktopPackagingReadinessInput,
  status: TauriDesktopPackagingReadinessStatus,
): TauriDesktopPackagingReadinessRow {
  return {
    id: "tauri-offline-bundle-parity",
    status,
    category: "offline-bundle-parity",
    label: "Offline bundle parity",
    detail: `Tauri frontendDist is ${input.frontendDist ?? "missing"}, Next static export is ${input.nextStaticExportConfigured ? "configured" : "missing"}, bundle active is ${input.bundleActive ? "yes" : "no"}, and ${input.iconCount} icon artifact${input.iconCount === 1 ? "" : "s"} are declared.`,
    value: input.frontendDist ?? "missing",
    evidenceCount:
      Number(Boolean(input.frontendDist)) +
      Number(input.nextStaticExportConfigured) +
      Number(input.bundleActive) +
      input.iconCount,
    recommendation:
      status === "ready"
        ? "Offline frontend bundle parity is ready for installer packaging."
        : "Align Next static export with Tauri frontendDist before relying on offline desktop bundles.",
  };
}

function getUpdaterRow(
  input: TauriDesktopPackagingReadinessInput,
  status: TauriDesktopPackagingReadinessStatus,
): TauriDesktopPackagingReadinessRow {
  return {
    id: "tauri-updater-evidence",
    status,
    category: "updater-evidence",
    label: "Updater evidence",
    detail: `Updater plugin is ${input.updaterPluginPresent ? "installed" : "not installed"}, endpoint is ${input.updaterEndpointConfigured ? "configured" : "missing"}, and signatures are ${input.updaterSignatureConfigured ? "configured" : "missing"}.`,
    value: input.updaterPluginPresent ? "plugin-present" : "manual-update",
    evidenceCount:
      Number(input.updaterPluginPresent) +
      Number(input.updaterEndpointConfigured) +
      Number(input.updaterSignatureConfigured),
    recommendation:
      status === "ready"
        ? "Updater feed and signature evidence can travel with desktop release notes."
        : status === "blocked"
          ? "Do not enable desktop updater delivery without endpoint and signature evidence."
          : "Document manual update distribution or add signed updater feed evidence before release.",
  };
}

function getReleasePacketRow(
  input: TauriDesktopPackagingReadinessInput,
  status: TauriDesktopPackagingReadinessStatus,
): TauriDesktopPackagingReadinessRow {
  return {
    id: "tauri-release-packet",
    status,
    category: "release-packet",
    label: "Exportable release packet",
    detail: `Desktop release packet has build script ${input.tauriBuildScript ?? "missing"}, dev script ${input.tauriDevScript ?? "missing"}, bundle targets ${input.bundleTargets ?? "missing"}, and ${input.releasePacketEvidence.length} evidence item${input.releasePacketEvidence.length === 1 ? "" : "s"}.`,
    value: input.bundleTargets ?? "missing",
    evidenceCount: input.releasePacketEvidence.length,
    recommendation:
      status === "ready"
        ? "Export JSON, CSV, and Markdown readiness packets with installer evidence."
        : "Add Tauri build commands and release packet evidence before desktop handoff.",
  };
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
