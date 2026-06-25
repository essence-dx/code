import { strict as assert } from "node:assert";

import { createExternalArtifactVerificationCommandRunner } from "@/features/projects/external-artifact-verification-command-runner";
import { createNativeToolchainPrerequisiteDetector } from "@/features/projects/native-toolchain-prerequisite-detector";
import { runNativeCadRuntimeExecutionProbe } from "@/features/projects/native-cad-runtime-execution-probe";
import { createRuntimeExecutionReadinessPacket } from "@/features/projects/runtime-execution-readiness-packet";

const generatedAt = "2026-05-27T12:00:00.000Z";
const releaseCandidateId = "native-2.3.0-runtime-execution-readiness";
const workspaceId = "Essence Runtime";

const toolchainPrerequisites = createNativeToolchainPrerequisiteDetector({
  generatedAt,
  releaseCandidateId,
  requiredTools: [
    {
      commandName: "signtool.exe",
      detectedPath: "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\signtool.exe",
      detectionCommand: "where.exe signtool",
      evidenceHash: "sha256:windows-signtool-detection",
      kind: "signing-cli",
      owner: "Native Release",
      platform: "windows",
      required: true,
      toolId: "windows-signtool",
      version: "10.0.26100",
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
      version: "0.22.0",
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
      version: "7.8.1",
    },
  ],
  tools: [
    {
      commandName: "signtool.exe",
      detectedPath: "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\signtool.exe",
      detectionCommand: "where.exe signtool",
      evidenceHash: "sha256:windows-signtool-detection",
      kind: "signing-cli",
      owner: "Native Release",
      platform: "windows",
      required: true,
      toolId: "windows-signtool",
      version: "10.0.26100",
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
      version: "0.22.0",
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
      version: "7.8.1",
    },
  ],
  workspaceId,
});

const artifactVerification = createExternalArtifactVerificationCommandRunner({
  commands: [
    {
      artifactPath: "dist/native/windows/EssenceSpline-2.3.0.exe",
      artifactSha256: "sha256:windows-installer",
      exitCode: 0,
      finishedAt: "2026-05-27T12:03:00.000Z",
      platform: "windows",
      stderrHash: "sha256:windows-stderr",
      stdoutHash: "sha256:windows-stdout",
      startedAt: "2026-05-27T12:02:00.000Z",
      transcriptHash: "sha256:windows-transcript",
      verificationCommand:
        "signtool.exe verify /pa dist/native/windows/EssenceSpline-2.3.0.exe",
      verificationKind: "authenticode",
      verifierOwner: "Native Release",
      workingDirectory: "packages/desktop",
    },
    {
      artifactPath: "dist/native/macos/EssenceSpline-2.3.0.dmg",
      artifactSha256: "sha256:macos-dmg",
      exitCode: 0,
      finishedAt: "2026-05-27T12:05:00.000Z",
      platform: "macos",
      stderrHash: "sha256:macos-stderr",
      stdoutHash: "sha256:macos-stdout",
      startedAt: "2026-05-27T12:04:00.000Z",
      transcriptHash: "sha256:macos-transcript",
      verificationCommand:
        "codesign --verify dist/native/macos/EssenceSpline-2.3.0.dmg",
      verificationKind: "codesign",
      verifierOwner: "Native Release",
      workingDirectory: "packages/desktop",
    },
  ],
  generatedAt,
  releaseCandidateId,
  requiredPlatforms: ["windows", "macos"],
  workspaceId,
});

const cadRuntimeExecution = await runNativeCadRuntimeExecutionProbe({
  generatedAt,
  releaseCandidateId,
  probes: [
    {
      adapterId: "freecad",
      bundleRoot: "resources/cad/freecad",
      command:
        "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step --output evidence/freecad/bracket.glb",
      executablePath: "resources/cad/freecad/bin/freecadcmd",
      fixtureInputHash: "sha256:freecad-bracket-step-fixture",
      fixtureInputPath: "fixtures/cad/bracket.step",
      outputPath: "evidence/freecad/bracket.glb",
      runtimeAvailable: true,
      sandboxProfile: "cad-runtime-2048mb-120s-readonly",
      timeoutMs: 120_000,
      verifierOwner: "CAD Runtime",
      workingDirectory: "packages/desktop",
    },
    {
      adapterId: "occt",
      bundleRoot: "resources/cad/occt",
      command:
        "resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb --output evidence/occt/enclosure.glb",
      executablePath: "resources/cad/occt/bin/essence-occt-convert",
      fixtureInputHash: "sha256:occt-enclosure-iges-fixture",
      fixtureInputPath: "fixtures/cad/enclosure.iges",
      outputPath: "evidence/occt/enclosure.glb",
      runtimeAvailable: true,
      sandboxProfile: "cad-runtime-4096mb-180s-readonly",
      timeoutMs: 180_000,
      verifierOwner: "CAD Runtime",
      workingDirectory: "packages/desktop",
    },
  ],
  executor: async ({ probe }) => ({
    durationMs: probe.adapterId === "freecad" ? 18_420 : 22_950,
    exitCode: 0,
    finishedAt:
      probe.adapterId === "freecad"
        ? "2026-05-27T12:08:20.000Z"
        : "2026-05-27T12:11:20.000Z",
    outputHash:
      probe.adapterId === "freecad"
        ? "sha256:freecad-bracket-glb-output"
        : "sha256:occt-enclosure-glb-output",
    outputPath: probe.outputPath,
    startedAt:
      probe.adapterId === "freecad"
        ? "2026-05-27T12:08:00.000Z"
        : "2026-05-27T12:11:00.000Z",
    stderr: "",
    stdout:
      probe.adapterId === "freecad"
        ? "FreeCAD mesh export completed"
        : "OCCT conversion completed",
  }),
  workspaceId,
});

const packet = createRuntimeExecutionReadinessPacket({
  artifactVerification,
  cadRuntimeExecution,
  generatedAt,
  releaseCandidateId,
  toolchainPrerequisites,
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.releaseBlocked, false);
assert.equal(packet.summary.readinessScore, 100);
assert.equal(packet.summary.readyCount, 4);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.customerBlockerCount, 0);
assert.equal(packet.summary.customerMessageReadyCount, 0);
assert.equal(packet.summary.sourceReadyCount, 4);
assert.ok(packet.summary.readinessHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.gate),
  [
    "toolchain-prerequisites",
    "artifact-command-verification",
    "cad-runtime-execution",
    "customer-facing-blockers",
  ],
);
assert.ok(packet.rows.every((row) => row.sourceReady));
assert.ok(packet.rows.every((row) => row.evidenceLinked));
assert.ok(packet.rows.every((row) => row.readinessHash.startsWith("sha256:")));
assert.match(
  packet.csvContent,
  /^gate,status,score,source_ready,evidence_linked,release_blocked,customer_blocker_count,readiness_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("customer-facing-blockers"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-runtime-execution-readiness-packet-native-2-3-0-runtime-execution-readiness-20260527.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-runtime-execution-readiness-packet-native-2-3-0-runtime-execution-readiness-20260527.json",
);
assert.equal(packet.files.length, 2);

const blockedToolchain = createNativeToolchainPrerequisiteDetector({
  generatedAt,
  releaseCandidateId,
  requiredTools: [
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
  ],
  tools: [],
  workspaceId,
});

const blocked = createRuntimeExecutionReadinessPacket({
  artifactVerification,
  customerBlockers: [
    {
      blockerId: "windows-signed-installer",
      customerMessage:
        "Windows signed installer verification is not available for this release candidate.",
      evidenceHash: "missing",
      evidenceUrl: "",
      mitigation:
        "Publish the browser export while desktop packages remain blocked.",
      owner: "Native Release",
      releaseBlocker: true,
      sourceGate: "artifact-command-verification",
      status: "blocked",
    },
  ],
  generatedAt,
  releaseCandidateId,
  toolchainPrerequisites: blockedToolchain,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.equal(blocked.summary.customerBlockerCount, 1);
assert.equal(blocked.summary.customerMessageReadyCount, 1);
assert.equal(blocked.summary.blockedCount, 3);
assert.ok(blocked.summary.readinessScore < 60);
assert.equal(blocked.rows.find((row) => row.gate === "toolchain-prerequisites")?.status, "blocked");
assert.equal(blocked.rows.find((row) => row.gate === "cad-runtime-execution")?.status, "blocked");
assert.equal(blocked.rows.find((row) => row.gate === "customer-facing-blockers")?.status, "blocked");
assert.equal(blocked.customerBlockers[0]?.customerMessageReady, true);
assert.equal(blocked.customerBlockers[0]?.evidenceLinked, false);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked runtime execution readiness packet/,
);

console.log("runtime execution readiness packet smoke passed");
