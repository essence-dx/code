import { readFileSync } from "node:fs";
import {
  currentTauriDesktopPackagingReadinessInput,
  getTauriDesktopPackagingReadinessCsv,
  getTauriDesktopPackagingReadinessJson,
  getTauriDesktopPackagingReadinessMarkdown,
  getTauriDesktopPackagingReadinessReport,
} from "../src/features/editor/tauri-desktop-packaging-readiness";

const generatedAt = "2026-05-19T13:00:00.000Z";
const readyReport = getTauriDesktopPackagingReadinessReport({
  input: {
    ...currentTauriDesktopPackagingReadinessInput,
    capabilityPermissionIds: ["core:default"],
    cargoCheckCommand: "cargo check --manifest-path src-tauri/Cargo.toml",
    cargoClippyCommand: "cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets",
    commandHandlerCount: 2,
    filesystemPermissionCount: 0,
    iconCount: 5,
    nextStaticExportConfigured: true,
    panicPathCount: 0,
    releasePacketEvidence: [
      "Export Tauri desktop readiness JSON.",
      "Export Tauri desktop readiness CSV.",
      "Export Tauri desktop readiness Markdown.",
      "Attach installer bundle artifact manifest.",
    ],
    tauriBuildScript: "tauri build",
    tauriConfigPresent: true,
    tauriDevScript: "tauri dev",
    updaterEndpointConfigured: true,
    updaterPluginPresent: true,
    updaterSignatureConfigured: true,
  },
  generatedAt,
});
const blockedReport = getTauriDesktopPackagingReadinessReport({
  input: {
    ...currentTauriDesktopPackagingReadinessInput,
    capabilityPermissionIds: ["core:default", "fs:allow-home-recursive"],
    cargoCheckCommand: null,
    commandHandlerCount: 1,
    filesystemPermissionCount: 1,
    nextStaticExportConfigured: false,
    panicPathCount: 1,
    releasePacketEvidence: [],
    tauriBuildScript: null,
    tauriConfigPresent: false,
    updaterEndpointConfigured: true,
    updaterPluginPresent: true,
    updaterSignatureConfigured: false,
  },
  generatedAt,
});
const currentReport = getTauriDesktopPackagingReadinessReport({
  input: currentTauriDesktopPackagingReadinessInput,
  generatedAt,
});
const markdown = getTauriDesktopPackagingReadinessMarkdown(readyReport);
const csv = getTauriDesktopPackagingReadinessCsv(readyReport);
const json = JSON.parse(getTauriDesktopPackagingReadinessJson(readyReport)) as {
  rows: unknown[];
  summary: {
    offlineBundleStatus: string;
    releasePacketEvidenceCount: number;
    status: string;
    updaterStatus: string;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(readyReport.status === "ready", "Ready desktop packaging fixture should pass.");
assert(readyReport.score === 100, "Ready desktop packaging fixture should score 100.");
assert(readyReport.rustCommandStatus === "ready", "Rust command health should be ready.");
assert(readyReport.filesystemPermissionStatus === "ready", "Filesystem permissions should be ready.");
assert(readyReport.offlineBundleStatus === "ready", "Static export and Tauri frontendDist should be ready.");
assert(readyReport.updaterStatus === "ready", "Updater evidence should be ready.");
assert(readyReport.releasePacketStatus === "ready", "Release packet evidence should be ready.");
assert(readyReport.releasePacketEvidenceCount >= 4, "Release packet evidence should be retained.");
assert(
  readyReport.rows.some((row) => row.category === "rust-command-health"),
  "Rows should include Rust command health.",
);
assert(
  readyReport.rows.some((row) => row.category === "filesystem-permission-safety"),
  "Rows should include filesystem permission safety.",
);
assert(
  readyReport.rows.some((row) => row.category === "offline-bundle-parity"),
  "Rows should include offline bundle parity.",
);
assert(
  readyReport.rows.some((row) => row.category === "updater-evidence"),
  "Rows should include updater evidence.",
);
assert(
  readyReport.rows.some((row) => row.category === "release-packet"),
  "Rows should include release packet readiness.",
);
assert(blockedReport.status === "blocked", "Missing config, broad permissions, panics, and signatures should block release.");
assert(blockedReport.blockedCount >= 3, "Blocked fixture should preserve blocker counts.");
assert(blockedReport.filesystemPermissionStatus === "blocked", "Broad filesystem permission should block safety.");
assert(blockedReport.offlineBundleStatus === "blocked", "Missing static export should block offline parity.");
assert(currentReport.offlineBundleStatus === "blocked", "Current repo should flag missing Next static export for Tauri frontendDist.");
assert(currentReport.releasePacketEvidenceCount >= 4, "Current repo should still expose release packet evidence.");
assert(markdown.includes("Tauri Desktop Packaging Readiness"), "Markdown should include a clear title.");
assert(markdown.includes("filesystem"), "Markdown should mention filesystem safety.");
assert(csv.includes("offline-bundle-parity"), "CSV should include offline bundle rows.");
assert(json.rows.length === readyReport.rows.length, "JSON should preserve all rows.");
assert(json.summary.status === "ready", "JSON summary should include status.");
assert(json.summary.offlineBundleStatus === "ready", "JSON summary should include offline bundle status.");
assert(json.summary.updaterStatus === "ready", "JSON summary should include updater status.");
assert(json.summary.releasePacketEvidenceCount === readyReport.releasePacketEvidenceCount, "JSON should preserve evidence count.");
assert(
  /TauriDesktopPackagingReadinessPanel/.test(extensionsSource) &&
    /getTauriDesktopPackagingReadinessReport/.test(extensionsSource),
  "Extensions should wire the Tauri desktop packaging readiness panel and report.",
);
assert(
  packageJson.scripts["editor:tauri-desktop-packaging-readiness-smoke"]?.includes(
    "tauri-desktop-packaging-readiness-smoke",
  ),
  "Targeted Tauri desktop packaging smoke command should be listed.",
);

console.log(
  `Tauri desktop packaging readiness smoke passed: ${readyReport.score} score, current offline bundle ${currentReport.offlineBundleStatus}.`,
);

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
