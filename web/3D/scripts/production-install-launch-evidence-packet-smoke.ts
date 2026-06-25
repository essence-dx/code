import { strict as assert } from "node:assert";

import { createProductionInstallLaunchEvidencePacket } from "@/features/projects/production-install-launch-evidence-packet";

const packet = createProductionInstallLaunchEvidencePacket({
  generatedAt: "2026-05-25T11:00:00.000Z",
  releaseCandidateId: "native-2.1.0-enforcement",
  evidence: [
    {
      crashCount: 0,
      crashFreeMinutes: 45,
      crashFreeSessionHash: "sha256:windows-crash-free-session",
      installCommand: "Start-Process .\\Essence_2.1.0_x64-setup.exe -ArgumentList /S -Wait",
      installTranscriptHash: "sha256:windows-install-transcript",
      installedAt: "2026-05-25T10:10:00.000Z",
      installerFileName: "Essence_2.1.0_x64-setup.exe",
      installerSha256: "sha256:windows-installer",
      launchCommand: "essence-spline.exe --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:windows-launch-smoke",
      launchedAt: "2026-05-25T10:12:00.000Z",
      platform: "windows",
      rollbackEvidenceHash: "sha256:windows-rollback-route",
      rollbackRoute: "native/windows/stable/latest.json",
      verifierOwner: "Release Engineering",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 42,
      crashFreeSessionHash: "sha256:macos-crash-free-session",
      installCommand: "hdiutil attach Essence_2.1.0_aarch64.dmg && cp -R Essence.app /Applications",
      installTranscriptHash: "sha256:macos-install-transcript",
      installedAt: "2026-05-25T10:15:00.000Z",
      installerFileName: "Essence_2.1.0_aarch64.dmg",
      installerSha256: "sha256:macos-installer",
      launchCommand: "/Applications/Essence.app/Contents/MacOS/Essence --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:macos-launch-smoke",
      launchedAt: "2026-05-25T10:17:00.000Z",
      platform: "macos",
      rollbackEvidenceHash: "sha256:macos-rollback-route",
      rollbackRoute: "native/macos/stable/latest.json",
      verifierOwner: "Desktop Platform",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 40,
      crashFreeSessionHash: "sha256:linux-crash-free-session",
      installCommand: "chmod +x essence-spline_2.1.0_amd64.AppImage",
      installTranscriptHash: "sha256:linux-install-transcript",
      installedAt: "2026-05-25T10:20:00.000Z",
      installerFileName: "essence-spline_2.1.0_amd64.AppImage",
      installerSha256: "sha256:linux-installer",
      launchCommand: "./essence-spline_2.1.0_amd64.AppImage --smoke open-sample",
      launchExitCode: 0,
      launchSmokeHash: "sha256:linux-launch-smoke",
      launchedAt: "2026-05-25T10:22:00.000Z",
      platform: "linux",
      rollbackEvidenceHash: "sha256:linux-rollback-route",
      rollbackRoute: "native/linux/stable/latest.json",
      verifierOwner: "Release Engineering",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 35,
      crashFreeSessionHash: "sha256:android-crash-free-session",
      installCommand: "adb install app-release.aab",
      installTranscriptHash: "sha256:android-install-transcript",
      installedAt: "2026-05-25T10:25:00.000Z",
      installerFileName: "essence-spline-2.1.0.aab",
      installerSha256: "sha256:android-aab",
      launchCommand: "adb shell monkey -p com.essence.spline 1",
      launchExitCode: 0,
      launchSmokeHash: "sha256:android-launch-smoke",
      launchedAt: "2026-05-25T10:27:00.000Z",
      platform: "android",
      rollbackEvidenceHash: "sha256:android-rollback-track",
      rollbackRoute: "play-console/internal-track/2.0.9",
      verifierOwner: "Mobile Platform",
    },
    {
      crashCount: 0,
      crashFreeMinutes: 32,
      crashFreeSessionHash: "sha256:ios-crash-free-session",
      installCommand: "xcrun simctl install booted EssenceSpline.app",
      installTranscriptHash: "sha256:ios-install-transcript",
      installedAt: "2026-05-25T10:30:00.000Z",
      installerFileName: "EssenceSpline-2.1.0.ipa",
      installerSha256: "sha256:ios-ipa",
      launchCommand: "xcrun simctl launch booted com.essence.spline",
      launchExitCode: 0,
      launchSmokeHash: "sha256:ios-launch-smoke",
      launchedAt: "2026-05-25T10:32:00.000Z",
      platform: "ios",
      rollbackEvidenceHash: "sha256:ios-rollback-track",
      rollbackRoute: "app-store-connect/testflight/2.0.9",
      verifierOwner: "Mobile Platform",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.installLaunchScore, 100);
assert.equal(packet.summary.installLaunchBlocked, false);
assert.equal(packet.summary.readyCount, 5);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.reviewCount, 0);
assert.equal(packet.summary.installerHashReadyCount, 5);
assert.equal(packet.summary.launchSmokeReadyCount, 5);
assert.equal(packet.summary.crashFreeReadyCount, 5);
assert.equal(packet.summary.rollbackRouteReadyCount, 5);
assert.ok(packet.summary.packetHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.platform),
  ["windows", "macos", "linux", "android", "ios"],
);
assert.ok(packet.rows.every((row) => row.installerHashReady));
assert.ok(packet.rows.every((row) => row.installTranscriptReady));
assert.ok(packet.rows.every((row) => row.launchSmokeReady));
assert.ok(packet.rows.every((row) => row.crashFreeSessionReady));
assert.ok(packet.rows.every((row) => row.rollbackRouteReady));
assert.match(
  packet.csvContent,
  /^platform,status,installer_file_name,installer_hash_ready,install_transcript_ready,launch_smoke_ready,crash_free_session_ready,rollback_route_ready,packet_hash,next_action/,
);
assert.ok(packet.jsonContent.includes("android-crash-free-session"));
assert.equal(
  packet.csvFileName,
  "essence-runtime-production-install-launch-evidence-packet-native-2-1-0-enforcement-20260525.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-production-install-launch-evidence-packet-native-2-1-0-enforcement-20260525.json",
);
assert.equal(packet.files.length, 2);

const blocked = createProductionInstallLaunchEvidencePacket({
  evidence: [
    {
      crashCount: 2,
      crashFreeMinutes: 3,
      crashFreeSessionHash: "",
      installCommand: "",
      installTranscriptHash: "",
      installedAt: "",
      installerFileName: "Essence_2.1.0_x64-setup.exe",
      installerSha256: "",
      launchCommand: "essence-spline.exe --smoke open-sample",
      launchExitCode: 1,
      launchSmokeHash: "",
      launchedAt: "",
      platform: "windows",
      rollbackEvidenceHash: "",
      rollbackRoute: "",
      verifierOwner: "",
    },
  ],
  releaseCandidateId: "native-2.1.0-enforcement",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.installLaunchBlocked, true);
assert.ok(blocked.summary.installLaunchScore < 40);
assert.equal(blocked.summary.blockedCount, 5);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.installerHashReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.launchSmokeReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.crashFreeSessionReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "windows")?.rollbackRouteReady, false);
assert.equal(blocked.rows.find((row) => row.platform === "android")?.status, "blocked");
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked production install and launch evidence packet/,
);

console.log("production install and launch evidence packet smoke passed");
