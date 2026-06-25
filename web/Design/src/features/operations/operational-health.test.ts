import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createOperationalHealthReport,
  formatOperationalBytes,
  type OperationalHealthInput,
} from "@/features/operations/operational-health";

const baseInput: OperationalHealthInput = {
  now: new Date("2026-05-16T00:00:00.000Z"),
  database: {
    hasUrl: true,
    hasToken: true,
    reachable: true,
    userCount: 3,
    projectCount: 12,
    templateCount: 4,
  },
  auth: {
    hasSecret: true,
    hasConfiguredAdminEmails: true,
    userCount: 3,
    verifiedUserCount: 2,
    activeSessionCount: 1,
  },
  email: {
    hasBrevo: true,
    hasSmtp: false,
    recentEmailCount: 8,
    recentFailedEmailCount: 0,
    recentQueuedEmailCount: 0,
  },
  storage: {
    assetCount: 12,
    totalBytes: 1024 * 1024 * 12,
    quotaBytes: 1024 * 1024 * 100,
  },
  vercel: {
    isVercelRuntime: true,
    environment: "production",
    hasAppUrl: true,
    hasDeploymentUrl: true,
  },
  tauri: {
    hasConfig: true,
    hasRustEntrypoint: true,
  },
};

describe("operational health report", () => {
  test("returns healthy when all operational checks are ready", () => {
    const report = createOperationalHealthReport(baseInput);

    assert.equal(report.status, "healthy");
    assert.equal(report.groups.length, 6);
  });

  test("promotes missing secrets and repeated email failures to critical", () => {
    const report = createOperationalHealthReport({
      ...baseInput,
      database: {
        ...baseInput.database,
        hasToken: false,
      },
      auth: {
        ...baseInput.auth,
        hasSecret: false,
      },
      email: {
        ...baseInput.email,
        recentFailedEmailCount: 5,
      },
    });

    assert.equal(report.status, "critical");
    assert.equal(
      report.groups.find((group) => group.id === "email")?.status,
      "critical",
    );
  });

  test("warns before storage crosses the hard quota line", () => {
    const report = createOperationalHealthReport({
      ...baseInput,
      storage: {
        ...baseInput.storage,
        totalBytes: 1024 * 1024 * 72,
      },
    });

    assert.equal(
      report.groups.find((group) => group.id === "storage")?.status,
      "warning",
    );
  });

  test("formats operational byte counts", () => {
    assert.equal(formatOperationalBytes(512), "512 B");
    assert.equal(formatOperationalBytes(2048), "2.0 KB");
    assert.equal(formatOperationalBytes(1024 * 1024 * 3), "3.0 MB");
  });
});
