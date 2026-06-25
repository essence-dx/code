import { strict as assert } from "node:assert";

import { createNativeCadKernelDeliveryEnforcementVerifier } from "@/features/projects/native-cad-kernel-delivery-enforcement-verifier";

const verifier = createNativeCadKernelDeliveryEnforcementVerifier({
  generatedAt: "2026-05-25T10:00:00.000Z",
  releaseCandidateId: "native-2.1.0-enforcement",
  runtimes: [
    {
      adapterId: "freecad",
      bundledRuntimePath: "resources/cad/freecad/bin/freecadcmd",
      fallbackMessage:
        "Native CAD conversion is unavailable. STL import remains available while support reviews STEP and IGES repair options.",
      fallbackRoute: "/projects/import?mode=mesh-fallback",
      fixtureCommand:
        "resources/cad/freecad/bin/freecadcmd scripts/cad/freecad-mesh-export.py fixtures/cad/bracket.step",
      fixtureDurationMs: 18_420,
      fixtureExitCode: 0,
      fixtureInputHash: "sha256:freecad-bracket-step-fixture",
      fixtureOutputHash: "sha256:freecad-bracket-glb-output",
      runtimeAvailable: true,
      runtimeVersion: "1.0.2",
      sandboxMemoryMb: 2048,
      sandboxPolicy: "readonly-filesystem-network-denied",
      sandboxProfileHash: "sha256:freecad-sandbox-profile",
      sandboxTimeoutSeconds: 120,
      supportRunbookUrl: "https://docs.essence-spline.com/runbooks/cad-runtime-fallback",
      verifierOwner: "CAD Runtime",
    },
    {
      adapterId: "occt",
      bundledRuntimePath: "resources/cad/occt/bin/essence-occt-convert",
      fallbackMessage:
        "Native CAD conversion is unavailable for this model. The import repair wizard can continue with mesh fallback output.",
      fallbackRoute: "/projects/import/repair",
      fixtureCommand:
        "resources/cad/occt/bin/essence-occt-convert fixtures/cad/enclosure.iges --format glb",
      fixtureDurationMs: 22_950,
      fixtureExitCode: 0,
      fixtureInputHash: "sha256:occt-enclosure-iges-fixture",
      fixtureOutputHash: "sha256:occt-enclosure-glb-output",
      runtimeAvailable: true,
      runtimeVersion: "7.9.1",
      sandboxMemoryMb: 4096,
      sandboxPolicy: "readonly-filesystem-network-denied",
      sandboxProfileHash: "sha256:occt-sandbox-profile",
      sandboxTimeoutSeconds: 180,
      supportRunbookUrl: "https://docs.essence-spline.com/runbooks/cad-runtime-fallback",
      verifierOwner: "CAD Runtime",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(verifier.summary.status, "ready");
assert.equal(verifier.summary.enforcementScore, 100);
assert.equal(verifier.summary.deliveryBlocked, false);
assert.equal(verifier.summary.readyCount, 2);
assert.equal(verifier.summary.blockedCount, 0);
assert.equal(verifier.summary.reviewCount, 0);
assert.equal(verifier.summary.runtimeAvailableCount, 2);
assert.equal(verifier.summary.fixtureExecutionReadyCount, 2);
assert.equal(verifier.summary.sandboxLimitsReadyCount, 2);
assert.equal(verifier.summary.fallbackRouteReadyCount, 2);
assert.ok(verifier.summary.enforcementHash.startsWith("sha256:"));
assert.deepEqual(
  verifier.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(verifier.rows.every((row) => row.runtimeAvailabilityReady));
assert.ok(verifier.rows.every((row) => row.fixtureExecutionReady));
assert.ok(verifier.rows.every((row) => row.sandboxLimitsReady));
assert.ok(verifier.rows.every((row) => row.fallbackRouteReady));
assert.ok(verifier.rows.every((row) => row.ownerReady));
assert.match(
  verifier.csvContent,
  /^adapter_id,status,bundled_runtime_path,runtime_availability_ready,fixture_execution_ready,sandbox_limits_ready,fallback_route_ready,owner_ready,enforcement_hash,next_action/,
);
assert.ok(verifier.jsonContent.includes("freecad-sandbox-profile"));
assert.equal(
  verifier.csvFileName,
  "essence-runtime-native-cad-kernel-delivery-enforcement-verifier-native-2-1-0-enforcement-20260525.csv",
);
assert.equal(
  verifier.jsonFileName,
  "essence-runtime-native-cad-kernel-delivery-enforcement-verifier-native-2-1-0-enforcement-20260525.json",
);
assert.equal(verifier.files.length, 2);

const blocked = createNativeCadKernelDeliveryEnforcementVerifier({
  releaseCandidateId: "native-2.1.0-enforcement",
  runtimes: [
    {
      adapterId: "freecad",
      bundledRuntimePath: "",
      fallbackMessage: "",
      fallbackRoute: "",
      fixtureCommand: "",
      fixtureDurationMs: 0,
      fixtureExitCode: 1,
      fixtureInputHash: "",
      fixtureOutputHash: "",
      runtimeAvailable: false,
      runtimeVersion: "",
      sandboxMemoryMb: 512,
      sandboxPolicy: "",
      sandboxProfileHash: "",
      sandboxTimeoutSeconds: 30,
      supportRunbookUrl: "",
      verifierOwner: "",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.deliveryBlocked, true);
assert.ok(blocked.summary.enforcementScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.runtimeAvailabilityReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.fixtureExecutionReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.sandboxLimitsReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "freecad")?.fallbackRouteReady, false);
assert.equal(blocked.rows.find((row) => row.adapterId === "occt")?.status, "blocked");
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked native CAD kernel delivery enforcement verifier/,
);

console.log("native CAD kernel delivery enforcement verifier smoke passed");
