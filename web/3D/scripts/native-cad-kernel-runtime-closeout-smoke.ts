import { strict as assert } from "node:assert";
import { createNativeCadKernelRuntimeCloseout } from "@/features/projects/native-cad-kernel-runtime-closeout";

const closeout = createNativeCadKernelRuntimeCloseout({
  generatedAt: "2026-05-19T03:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  runtimes: [
    {
      adapterId: "freecad",
      bundledRuntimePath: "resources/cad/freecad/bin/freecadcmd",
      conversionFixtureCount: 8,
      customerFallbackMessage: "CAD conversion temporarily unavailable. STL import remains available while support reviews the STEP/IGES file.",
      fixtureDiagnosticsHash: "sha256:freecad-fixture-diagnostics",
      installedVersion: "1.0.2",
      outputArtifactHash: "sha256:freecad-output-artifacts",
      runtimePathVerified: true,
      sandboxMemoryMb: 2048,
      sandboxTimeoutSeconds: 120,
      sandboxedExecutionVerified: true,
    },
    {
      adapterId: "occt",
      bundledRuntimePath: "resources/cad/occt/bin/essence-occt-convert",
      conversionFixtureCount: 10,
      customerFallbackMessage: "Native CAD conversion is unavailable for this file. The import repair wizard can continue with mesh fallback output.",
      fixtureDiagnosticsHash: "sha256:occt-fixture-diagnostics",
      installedVersion: "7.9.1",
      outputArtifactHash: "sha256:occt-output-artifacts",
      runtimePathVerified: true,
      sandboxMemoryMb: 4096,
      sandboxTimeoutSeconds: 180,
      sandboxedExecutionVerified: true,
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(closeout.summary.status, "ready");
assert.equal(closeout.summary.closeoutScore, 100);
assert.equal(closeout.summary.readyCount, 2);
assert.equal(closeout.summary.blockedCount, 0);
assert.equal(closeout.summary.reviewCount, 0);
assert.equal(closeout.summary.fixtureCoverageCount, 18);
assert.equal(closeout.summary.fallbackMessageCount, 2);
assert.ok(closeout.summary.closeoutHash.startsWith("sha256:"));
assert.deepEqual(
  closeout.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(closeout.rows.every((row) => row.runtimePathReady));
assert.ok(closeout.rows.every((row) => row.fixtureCoverageReady));
assert.ok(closeout.rows.every((row) => row.sandboxReady));
assert.ok(closeout.rows.every((row) => row.customerFallbackReady));
assert.match(
  closeout.csvContent,
  /^adapter_id,status,bundled_runtime_path,runtime_path_ready,fixture_coverage_ready,sandbox_ready,customer_fallback_ready,closeout_hash,next_action/,
);
assert.ok(closeout.jsonContent.includes("resources/cad/freecad/bin/freecadcmd"));
assert.equal(closeout.csvFileName, "essence-runtime-native-cad-kernel-runtime-closeout-native-1-4-0-stable-20260519.csv");
assert.equal(closeout.jsonFileName, "essence-runtime-native-cad-kernel-runtime-closeout-native-1-4-0-stable-20260519.json");
assert.equal(closeout.files.length, 2);

const blocked = createNativeCadKernelRuntimeCloseout({
  releaseCandidateId: "native-1.4.0-stable",
  requiredAdapters: ["freecad", "occt"],
  runtimes: [
    {
      adapterId: "freecad",
      bundledRuntimePath: "",
      conversionFixtureCount: 0,
      customerFallbackMessage: "",
      fixtureDiagnosticsHash: "",
      installedVersion: "",
      outputArtifactHash: "",
      runtimePathVerified: false,
      sandboxMemoryMb: 512,
      sandboxTimeoutSeconds: 30,
      sandboxedExecutionVerified: false,
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.closeoutScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.runtimePathReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.customerFallbackReady, false);
assert.match(blocked.summary.nextAction, /Resolve blocked native CAD kernel runtime closeout/);

console.log("native CAD kernel runtime closeout smoke passed");
