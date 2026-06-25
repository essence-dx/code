import { strict as assert } from "node:assert";

import { createCadRuntimeCustodyLedger } from "@/features/projects/cad-runtime-custody-ledger";

const ledger = createCadRuntimeCustodyLedger({
  generatedAt: "2026-05-21T18:40:00.000Z",
  releaseCandidateId: "native-1.7.0-custody",
  runtimes: [
    {
      adapterId: "freecad",
      bundleOwner: "CAD Runtime",
      bundlePath: "resources/cad/freecad/1.7.0/windows-x64/freecadcmd.exe",
      bundleSha256: "sha256:freecad-bundle",
      fallbackApprovalCustodyOwner: "Release Engineering",
      fallbackApprovalEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/freecad/fallback-approval.json",
      fixtureCorpusRetentionExpiresAt: "2027-05-21T08:00:00.000Z",
      fixtureCorpusSha256: "sha256:freecad-fixture-corpus",
      outputEvidenceRenewalAt: "2026-06-21T09:00:00.000Z",
      outputEvidenceRenewalHash: "sha256:freecad-output-renewal",
    },
    {
      adapterId: "occt",
      bundleOwner: "Desktop Platform",
      bundlePath: "resources/cad/occt/7.8.1/linux-x64/essence-occt-convert",
      bundleSha256: "sha256:occt-bundle",
      fallbackApprovalCustodyOwner: "CAD Runtime",
      fallbackApprovalEvidenceUrl:
        "https://release.essence-spline.com/native/1.7.0/occt/fallback-approval.json",
      fixtureCorpusRetentionExpiresAt: "2027-05-21T08:00:00.000Z",
      fixtureCorpusSha256: "sha256:occt-fixture-corpus",
      outputEvidenceRenewalAt: "2026-06-21T09:05:00.000Z",
      outputEvidenceRenewalHash: "sha256:occt-output-renewal",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(ledger.summary.status, "ready");
assert.equal(ledger.summary.custodyScore, 100);
assert.equal(ledger.summary.readyCount, 2);
assert.equal(ledger.summary.blockedCount, 0);
assert.equal(ledger.summary.reviewCount, 0);
assert.equal(ledger.summary.bundleOwnerReadyCount, 2);
assert.equal(ledger.summary.fixtureRetentionReadyCount, 2);
assert.equal(ledger.summary.outputRenewalReadyCount, 2);
assert.equal(ledger.summary.fallbackCustodyReadyCount, 2);
assert.ok(ledger.summary.ledgerHash.startsWith("sha256:"));
assert.deepEqual(
  ledger.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(ledger.rows.every((row) => row.bundleOwnerReady));
assert.ok(ledger.rows.every((row) => row.fixtureRetentionReady));
assert.ok(ledger.rows.every((row) => row.outputRenewalReady));
assert.ok(ledger.rows.every((row) => row.fallbackCustodyReady));
assert.match(
  ledger.rows.find((row) => row.adapterId === "freecad")?.bundlePath ?? "",
  /freecadcmd\.exe/,
);
assert.match(
  ledger.rows.find((row) => row.adapterId === "occt")?.fallbackApprovalCustodyOwner ?? "",
  /CAD Runtime/,
);
assert.match(
  ledger.csvContent,
  /^adapter_id,status,bundle_owner_ready,fixture_retention_ready,output_renewal_ready,fallback_custody_ready,ledger_hash,next_action/,
);
assert.ok(ledger.jsonContent.includes("occt-output-renewal"));
assert.equal(
  ledger.csvFileName,
  "essence-runtime-cad-runtime-custody-ledger-native-1-7-0-custody-20260521.csv",
);
assert.equal(
  ledger.jsonFileName,
  "essence-runtime-cad-runtime-custody-ledger-native-1-7-0-custody-20260521.json",
);
assert.equal(ledger.files.length, 2);

const blocked = createCadRuntimeCustodyLedger({
  releaseCandidateId: "native-1.7.0-custody",
  runtimes: [
    {
      adapterId: "freecad",
      bundleOwner: "",
      bundlePath: "",
      bundleSha256: "sha256:freecad-bundle",
      fallbackApprovalCustodyOwner: "",
      fallbackApprovalEvidenceUrl: "",
      fixtureCorpusRetentionExpiresAt: "",
      fixtureCorpusSha256: "",
      outputEvidenceRenewalAt: "",
      outputEvidenceRenewalHash: "",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.custodyScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(
  blocked.rows.find((row) => row.adapterId === "freecad")?.bundleOwnerReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.adapterId === "freecad")?.fixtureRetentionReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.adapterId === "occt")?.fallbackCustodyReady,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked CAD runtime custody ledger/,
);

console.log("CAD runtime custody ledger smoke passed");
