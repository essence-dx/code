import { strict as assert } from "node:assert";
import { createDesktopPackageInstallRehearsalPacket } from "@/features/projects/desktop-package-install-rehearsal-packet";

const packet = createDesktopPackageInstallRehearsalPacket({
  generatedAt: "2026-05-18T13:00:00.000Z",
  rehearsals: [
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      archiveVerified: true,
      installCommand: "Start-Process .\\Essence_1.4.0_x64-setup.exe -ArgumentList /S -Wait",
      installVerified: true,
      platform: "windows",
      rollbackVerified: true,
      smokeCommand: "essence-spline.exe --smoke open-sample",
      smokeVerified: true,
      updaterManifestUrl: "https://updates.essence-spline.app/windows/latest.json",
      updaterMetadataHash: "sha256:windows-manifest",
      verificationNotes: "silent install completed; desktop shortcut present; updater channel stable",
    },
    {
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      archiveVerified: true,
      installCommand: "hdiutil attach Essence_1.4.0_aarch64.dmg && cp -R /Volumes/Essence/Essence.app /Applications",
      installVerified: true,
      platform: "macos",
      rollbackVerified: true,
      smokeCommand: "/Applications/Essence.app/Contents/MacOS/Essence --smoke open-sample",
      smokeVerified: true,
      updaterManifestUrl: "https://updates.essence-spline.app/darwin/latest.json",
      updaterMetadataHash: "sha256:macos-manifest",
      verificationNotes: "gatekeeper check passed; app launched; updater signature matched",
    },
    {
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      archiveVerified: true,
      installCommand: "chmod +x essence-spline_1.4.0_amd64.AppImage",
      installVerified: true,
      platform: "linux",
      rollbackVerified: true,
      smokeCommand: "./essence-spline_1.4.0_amd64.AppImage --smoke open-sample",
      smokeVerified: true,
      updaterManifestUrl: "https://updates.essence-spline.app/linux/latest.json",
      updaterMetadataHash: "sha256:linux-manifest",
      verificationNotes: "AppImage executable; desktop integration dry-run passed",
    },
  ],
  releaseVersion: "1.4.0",
  workspaceId: "Essence Runtime",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.rehearsalScore, 100);
assert.equal(packet.summary.readyCount, 3);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.reviewCount, 0);
assert.ok(packet.summary.packetHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.platform),
  ["windows", "macos", "linux"],
);
assert.equal(packet.rows.every((row) => row.updaterMetadataLinked), true);
assert.equal(packet.rows.every((row) => row.installVerified), true);
assert.equal(packet.rows.every((row) => row.smokeVerified), true);
assert.match(packet.csvContent, /^platform,status,artifact_file_name,archive_verified,install_verified,smoke_verified,rollback_verified,updater_metadata_linked,packet_hash,next_action/);
assert.ok(packet.jsonContent.includes("Essence_1.4.0_aarch64.dmg"));
assert.equal(packet.csvFileName, "essence-runtime-desktop-package-install-rehearsal-1-4-0-20260518.csv");
assert.equal(packet.jsonFileName, "essence-runtime-desktop-package-install-rehearsal-1-4-0-20260518.json");
assert.ok(packet.files.some((file) => file.format === "csv" && file.href.startsWith("data:text/csv")));
assert.ok(packet.files.some((file) => file.format === "json" && file.href.startsWith("data:application/json")));

const blocked = createDesktopPackageInstallRehearsalPacket({
  releaseVersion: "1.4.0",
  rehearsals: [
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      archiveVerified: true,
      installCommand: "Start-Process .\\Essence_1.4.0_x64-setup.exe -ArgumentList /S -Wait",
      installVerified: false,
      platform: "windows",
      rollbackVerified: false,
      smokeCommand: "essence-spline.exe --smoke open-sample",
      smokeVerified: false,
      updaterManifestUrl: "",
      updaterMetadataHash: null,
      verificationNotes: "silent installer exited before app registration",
    },
  ],
  requiredPlatforms: ["windows", "macos", "linux"],
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.rehearsalScore < 50);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.updaterMetadataLinked, false);
assert.match(blocked.summary.nextAction, /Resolve blocked desktop package install rehearsals/);

console.log("desktop package install rehearsal packet smoke passed");
