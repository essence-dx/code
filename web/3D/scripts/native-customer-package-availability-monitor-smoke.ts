import { strict as assert } from "node:assert";
import { createNativeCustomerPackageAvailabilityMonitor } from "@/features/projects/native-customer-package-availability-monitor";

const monitor = createNativeCustomerPackageAvailabilityMonitor({
  endpoints: [
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:windows-download-page-checksum",
      contentType: "text/html; charset=utf-8",
      endpointKind: "public-download-page",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T00:00:00.000Z",
      latencyMs: 420,
      platform: "windows",
      tlsValid: true,
      url: "https://essence-spline.com/download/windows",
    },
    {
      artifactFileName: "Essence_1.4.0_x64-setup.exe",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:windows-updater-checksum",
      contentType: "application/json",
      endpointKind: "updater-endpoint",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T00:00:05.000Z",
      latencyMs: 280,
      platform: "windows",
      tlsValid: true,
      url: "https://updates.essence-spline.com/windows/stable/latest.json",
    },
    {
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:macos-download-page-checksum",
      contentType: "text/html; charset=utf-8",
      endpointKind: "public-download-page",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T00:00:10.000Z",
      latencyMs: 510,
      platform: "macos",
      tlsValid: true,
      url: "https://essence-spline.com/download/macos",
    },
    {
      artifactFileName: "Essence_1.4.0_aarch64.dmg",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:macos-updater-checksum",
      contentType: "application/json",
      endpointKind: "updater-endpoint",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T00:00:15.000Z",
      latencyMs: 310,
      platform: "macos",
      tlsValid: true,
      url: "https://updates.essence-spline.com/macos/stable/latest.json",
    },
    {
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:linux-download-page-checksum",
      contentType: "text/html; charset=utf-8",
      endpointKind: "public-download-page",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T00:00:20.000Z",
      latencyMs: 490,
      platform: "linux",
      tlsValid: true,
      url: "https://essence-spline.com/download/linux",
    },
    {
      artifactFileName: "essence-spline_1.4.0_amd64.AppImage",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:linux-updater-checksum",
      contentType: "application/json",
      endpointKind: "updater-endpoint",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T00:00:25.000Z",
      latencyMs: 320,
      platform: "linux",
      tlsValid: true,
      url: "https://updates.essence-spline.com/linux/stable/latest.json",
    },
    {
      artifactFileName: "essence-native-1.4.0-archive.zip",
      cacheHeaderPresent: true,
      checksumSha256: "sha256:archive-mirror-checksum",
      contentType: "application/zip",
      endpointKind: "self-hosted-archive-mirror",
      httpStatus: 200,
      lastCheckedAt: "2026-05-19T00:00:30.000Z",
      latencyMs: 780,
      platform: "linux",
      tlsValid: true,
      url: "https://archive.essence-spline.com/native/1.4.0/essence-native-1.4.0-archive.zip",
    },
  ],
  generatedAt: "2026-05-19T00:01:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(monitor.summary.status, "ready");
assert.equal(monitor.summary.availabilityScore, 100);
assert.equal(monitor.summary.readyCount, 7);
assert.equal(monitor.summary.blockedCount, 0);
assert.equal(monitor.summary.reviewCount, 0);
assert.equal(monitor.summary.publicDownloadCount, 3);
assert.equal(monitor.summary.updaterEndpointCount, 3);
assert.equal(monitor.summary.archiveMirrorCount, 1);
assert.ok(monitor.summary.monitorHash.startsWith("sha256:"));
assert.deepEqual(
  monitor.rows.map((row) => row.endpointKind),
  [
    "public-download-page",
    "updater-endpoint",
    "public-download-page",
    "updater-endpoint",
    "public-download-page",
    "updater-endpoint",
    "self-hosted-archive-mirror",
  ],
);
assert.ok(monitor.rows.every((row) => row.reachable));
assert.ok(monitor.rows.every((row) => row.checksumAttached));
assert.ok(monitor.rows.every((row) => row.customerSafe));
assert.match(
  monitor.csvContent,
  /^platform,endpoint_kind,status,reachable,tls_valid,checksum_attached,customer_safe,latency_ms,monitor_hash,next_action/,
);
assert.ok(monitor.jsonContent.includes("https://essence-spline.com/download/windows"));
assert.equal(monitor.csvFileName, "essence-runtime-native-customer-package-availability-monitor-native-1-4-0-stable-20260519.csv");
assert.equal(monitor.jsonFileName, "essence-runtime-native-customer-package-availability-monitor-native-1-4-0-stable-20260519.json");
assert.equal(monitor.files.length, 2);

const blocked = createNativeCustomerPackageAvailabilityMonitor({
  endpoints: [
    {
      artifactFileName: "",
      cacheHeaderPresent: false,
      checksumSha256: "",
      contentType: "",
      endpointKind: "public-download-page",
      httpStatus: 503,
      lastCheckedAt: "2026-05-19T00:00:00.000Z",
      latencyMs: 0,
      platform: "windows",
      tlsValid: false,
      url: "",
    },
  ],
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.availabilityScore < 50);
assert.equal(blocked.summary.blockedCount, 1);
assert.equal(blocked.rows[0]?.reachable, false);
assert.equal(blocked.rows[0]?.customerSafe, false);
assert.match(blocked.summary.nextAction, /Resolve blocked customer-facing package availability/);

console.log("native customer package availability monitor smoke passed");
