import { strict as assert } from "node:assert";

import { createCadRuntimeAttachmentRehearsalPacket } from "@/features/projects/cad-runtime-attachment-rehearsal-packet";

const packet = createCadRuntimeAttachmentRehearsalPacket({
  attachments: [
    {
      adapterId: "freecad",
      bundlePath: "resources/cad/freecad/1.5.0/windows-x64/freecadcmd.exe",
      fallbackApprovalOwner: "CAD Runtime",
      fallbackApprovalUrl:
        "https://release.essence-spline.com/native/1.6.0/freecad/fallback-approval.json",
      fixtureCorpusArtifactPath: "fixtures/cad/corpus/freecad-step-corpus.zip",
      fixtureCorpusArtifactSha256: "sha256:freecad-fixture-corpus-artifact",
      outputEvidenceSha256: "sha256:freecad-output-evidence",
      outputEvidenceUrl:
        "https://release.essence-spline.com/native/1.6.0/freecad/output-evidence.json",
      packagedBundleSha256: "sha256:freecad-packaged-bundle",
    },
    {
      adapterId: "occt",
      bundlePath: "resources/cad/occt/7.8.1/linux-x64/essence-occt-convert",
      fallbackApprovalOwner: "Desktop Platform",
      fallbackApprovalUrl:
        "https://release.essence-spline.com/native/1.6.0/occt/fallback-approval.json",
      fixtureCorpusArtifactPath: "fixtures/cad/corpus/occt-iges-sat-corpus.zip",
      fixtureCorpusArtifactSha256: "sha256:occt-fixture-corpus-artifact",
      outputEvidenceSha256: "sha256:occt-output-evidence",
      outputEvidenceUrl:
        "https://release.essence-spline.com/native/1.6.0/occt/output-evidence.json",
      packagedBundleSha256: "sha256:occt-packaged-bundle",
    },
  ],
  generatedAt: "2026-05-21T14:30:00.000Z",
  releaseCandidateId: "native-1.6.0-attachment",
  workspaceId: "Essence Runtime",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.rehearsalScore, 100);
assert.equal(packet.summary.readyCount, 2);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.reviewCount, 0);
assert.equal(packet.summary.bundlePathReadyCount, 2);
assert.equal(packet.summary.fixtureCorpusReadyCount, 2);
assert.equal(packet.summary.outputEvidenceReadyCount, 2);
assert.equal(packet.summary.fallbackOwnerReadyCount, 2);
assert.ok(packet.summary.rehearsalHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.adapterId),
  ["freecad", "occt"],
);
assert.ok(packet.rows.every((row) => row.bundlePathReady));
assert.ok(packet.rows.every((row) => row.fixtureCorpusReady));
assert.ok(packet.rows.every((row) => row.outputEvidenceReady));
assert.ok(packet.rows.every((row) => row.fallbackOwnerReady));
assert.match(
  packet.rows.find((row) => row.adapterId === "freecad")?.bundlePath ?? "",
  /freecadcmd\.exe/,
);
assert.match(
  packet.rows.find((row) => row.adapterId === "occt")?.fixtureCorpusArtifactPath ?? "",
  /iges-sat-corpus/,
);
assert.match(
  packet.csvContent,
  /^adapter_id,status,bundle_path_ready,fixture_corpus_ready,output_evidence_ready,fallback_owner_ready,rehearsal_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("occt-output-evidence"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-cad-runtime-attachment-rehearsal-packet-native-1-6-0-attachment-20260521.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-cad-runtime-attachment-rehearsal-packet-native-1-6-0-attachment-20260521.json",
);
assert.equal(packet.files.length, 2);

const blocked = createCadRuntimeAttachmentRehearsalPacket({
  attachments: [
    {
      adapterId: "freecad",
      bundlePath: "",
      fallbackApprovalOwner: "",
      fallbackApprovalUrl: "",
      fixtureCorpusArtifactPath: "",
      fixtureCorpusArtifactSha256: "",
      outputEvidenceSha256: "",
      outputEvidenceUrl: "",
      packagedBundleSha256: "sha256:freecad-packaged-bundle",
    },
  ],
  releaseCandidateId: "native-1.6.0-attachment",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.rehearsalScore < 50);
assert.equal(blocked.summary.blockedCount, 2);
assert.equal(
  blocked.rows.find((row) => row.adapterId === "freecad")?.bundlePathReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.adapterId === "freecad")?.fixtureCorpusReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.adapterId === "occt")?.outputEvidenceReady,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked CAD runtime attachment rehearsal packet/,
);

console.log("CAD runtime attachment rehearsal packet smoke passed");
