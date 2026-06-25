import { strict as assert } from "node:assert";

import { createNativeToolchainPrerequisiteDetector } from "@/features/projects/native-toolchain-prerequisite-detector";

const report = createNativeToolchainPrerequisiteDetector({
  generatedAt: "2026-05-26T09:00:00.000Z",
  releaseCandidateId: "native-2.2.0-runtime-execution",
  tools: [
    {
      commandName: "signtool.exe",
      detectedPath: "C:/Program Files (x86)/Windows Kits/10/bin/x64/signtool.exe",
      detectionCommand: "where.exe signtool",
      evidenceHash: "sha256:windows-signtool-detection",
      kind: "signing-cli",
      owner: "Release Engineering",
      platform: "windows",
      required: true,
      toolId: "windows-signtool",
      version: "10.0.26100.0",
    },
    {
      commandName: "xcrun notarytool",
      detectedPath: "/usr/bin/xcrun",
      detectionCommand: "xcrun notarytool --version",
      evidenceHash: "sha256:apple-notarytool-detection",
      kind: "notarization-tool",
      owner: "Desktop Platform",
      platform: "macos",
      required: true,
      toolId: "apple-notarytool",
      version: "notarytool 2.1.0",
    },
    {
      commandName: "cargo",
      detectedPath: "C:/Users/Computer/.cargo/bin/cargo.exe",
      detectionCommand: "cargo --version",
      evidenceHash: "sha256:cargo-detection",
      kind: "package-manager",
      owner: "Desktop Platform",
      platform: "cross-platform",
      required: true,
      toolId: "cargo",
      version: "cargo 1.88.0",
    },
    {
      commandName: "bun",
      detectedPath: "C:/Users/Computer/.bun/bin/bun.exe",
      detectionCommand: "bun --version",
      evidenceHash: "sha256:bun-detection",
      kind: "package-manager",
      owner: "Web Platform",
      platform: "cross-platform",
      required: true,
      toolId: "bun",
      version: "1.3.13",
    },
    {
      commandName: "freecadcmd",
      detectedPath: "resources/cad/freecad/bin/freecadcmd",
      detectionCommand: "resources/cad/freecad/bin/freecadcmd --version",
      evidenceHash: "sha256:freecad-detection",
      kind: "cad-runtime",
      owner: "CAD Runtime",
      platform: "cross-platform",
      required: true,
      toolId: "freecad",
      version: "FreeCAD 1.0.2",
    },
    {
      commandName: "essence-occt-convert",
      detectedPath: "resources/cad/occt/bin/essence-occt-convert",
      detectionCommand: "resources/cad/occt/bin/essence-occt-convert --version",
      evidenceHash: "sha256:occt-detection",
      kind: "cad-runtime",
      owner: "CAD Runtime",
      platform: "cross-platform",
      required: true,
      toolId: "occt",
      version: "OCCT 7.9.1",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.prerequisiteScore, 100);
assert.equal(report.summary.releaseBlocked, false);
assert.equal(report.summary.readyCount, 6);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.reviewCount, 0);
assert.equal(report.summary.signingReadyCount, 1);
assert.equal(report.summary.notarizationReadyCount, 1);
assert.equal(report.summary.packageManagerReadyCount, 2);
assert.equal(report.summary.cadRuntimeReadyCount, 2);
assert.ok(report.summary.prerequisiteHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.toolId),
  [
    "windows-signtool",
    "apple-notarytool",
    "cargo",
    "bun",
    "freecad",
    "occt",
  ],
);
assert.ok(report.rows.every((row) => row.commandReady));
assert.ok(report.rows.every((row) => row.pathReady));
assert.ok(report.rows.every((row) => row.versionReady));
assert.ok(report.rows.every((row) => row.evidenceReady));
assert.ok(report.rows.every((row) => row.ownerReady));
assert.match(
  report.csvContent,
  /^tool_id,kind,platform,status,command_ready,path_ready,version_ready,evidence_ready,owner_ready,prerequisite_hash,next_action/,
);
assert.ok(report.jsonContent.includes("apple-notarytool"));
assert.equal(
  report.csvFileName,
  "essence-runtime-native-toolchain-prerequisite-detector-native-2-2-0-runtime-execution-20260526.csv",
);
assert.equal(
  report.jsonFileName,
  "essence-runtime-native-toolchain-prerequisite-detector-native-2-2-0-runtime-execution-20260526.json",
);
assert.equal(report.files.length, 2);

const blocked = createNativeToolchainPrerequisiteDetector({
  releaseCandidateId: "native-2.2.0-runtime-execution",
  tools: [
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
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.prerequisiteScore < 50);
assert.equal(blocked.summary.blockedCount, 6);
assert.equal(blocked.rows.find((row) => row.toolId === "windows-signtool")?.pathReady, false);
assert.equal(blocked.rows.find((row) => row.toolId === "windows-signtool")?.evidenceReady, false);
assert.equal(blocked.rows.find((row) => row.toolId === "apple-notarytool")?.status, "blocked");
assert.equal(blocked.rows.find((row) => row.toolId === "freecad")?.status, "blocked");
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native toolchain prerequisite detector/,
);

console.log("native toolchain prerequisite detector smoke passed");
