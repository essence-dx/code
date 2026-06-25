import { strict as assert } from "node:assert";
import { createNativeCadRuntimeBundleInstallerVerification } from "@/features/projects/native-cad-runtime-bundle-installer-verification";

const verification = createNativeCadRuntimeBundleInstallerVerification({
  generatedAt: "2026-05-19T07:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  runtimes: [
    {
      adapterId: "freecad",
      bundleRoot: "resources/cad/freecad",
      discoveryCommand: "resources/cad/freecad/bin/freecadcmd --version",
      discoveredExecutablePath: "resources/cad/freecad/bin/freecadcmd",
      executionExitCode: 0,
      executionTranscriptHash: "sha256:freecad-bundle-execution-transcript",
      fixtureCommand: "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step",
      fixtureOutputHash: "sha256:freecad-bundle-fixture-output",
      installedVersion: "1.0.2",
      packagedLayoutHash: "sha256:freecad-packaged-layout",
      sandboxProfile: "cad-runtime-2048mb-120s-readonly",
    },
    {
      adapterId: "occt",
      bundleRoot: "resources/cad/occt",
      discoveryCommand: "resources/cad/occt/bin/essence-occt-convert --version",
      discoveredExecutablePath: "resources/cad/occt/bin/essence-occt-convert",
      executionExitCode: 0,
      executionTranscriptHash: "sha256:occt-bundle-execution-transcript",
      fixtureCommand: "resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb",
      fixtureOutputHash: "sha256:occt-bundle-fixture-output",
      installedVersion: "7.9.1",
      packagedLayoutHash: "sha256:occt-packaged-layout",
      sandboxProfile: "cad-runtime-4096mb-180s-readonly",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(verification.summary.status, "ready");
assert.equal(verification.summary.verificationScore, 100);
assert.equal(verification.summary.readyCount, 2);
assert.equal(verification.summary.blockedCount, 0);
assert.equal(verification.summary.reviewCount, 0);
assert.equal(verification.summary.discoveredCount, 2);
assert.equal(verification.summary.executionReadyCount, 2);
assert.equal(verification.summary.fixtureReadyCount, 2);
assert.ok(verification.summary.verificationHash.startsWith("sha256:"));
assert.deepEqual(
  verification.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(verification.rows.every((row) => row.bundleLayoutReady));
assert.ok(verification.rows.every((row) => row.discoveryReady));
assert.ok(verification.rows.every((row) => row.executionReady));
assert.ok(verification.rows.every((row) => row.fixtureReady));
assert.match(
  verification.csvContent,
  /^adapter_id,status,bundle_root,bundle_layout_ready,discovery_ready,execution_ready,fixture_ready,verification_hash,next_action/,
);
assert.ok(verification.jsonContent.includes("resources/cad/freecad/bin/freecadcmd"));
assert.equal(verification.csvFileName, "essence-runtime-native-cad-runtime-bundle-installer-verification-native-1-4-0-stable-20260519.csv");
assert.equal(verification.jsonFileName, "essence-runtime-native-cad-runtime-bundle-installer-verification-native-1-4-0-stable-20260519.json");
assert.equal(verification.files.length, 2);

const blocked = createNativeCadRuntimeBundleInstallerVerification({
  releaseCandidateId: "native-1.4.0-stable",
  requiredAdapters: ["freecad", "occt"],
  runtimes: [
    {
      adapterId: "freecad",
      bundleRoot: "",
      discoveryCommand: "",
      discoveredExecutablePath: "",
      executionExitCode: 1,
      executionTranscriptHash: "",
      fixtureCommand: "",
      fixtureOutputHash: "",
      installedVersion: "",
      packagedLayoutHash: "",
      sandboxProfile: "",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.verificationScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.bundleLayoutReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.executionReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.fixtureReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native CAD runtime bundle installer verification/);

console.log("native CAD runtime bundle installer verification smoke passed");
