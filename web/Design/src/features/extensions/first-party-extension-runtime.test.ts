import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import {
  createFirstPartyExtensionRuntimeCenter,
  type FirstPartyExtensionManifest,
} from "@/features/extensions/first-party-extension-runtime";

describe("first-party extension runtime", () => {
  test("validates manifests, registers scoped commands, and reconstructs install/remove audit trails", () => {
    const center = createFirstPartyExtensionRuntimeCenter({
      manifests: [
        createManifest(),
        createManifest({
          id: "essence.extension.unsafe",
          name: "Unsafe extension",
          entrypoint: "https://example.com/extension.js",
          publisher: "Unknown Publisher",
          permissions: ["project:read", "workspace:admin"],
          commands: [
            {
              id: "essence.extension.unsafe.run",
              title: "Run unsafe command",
              category: "automation",
              runMode: "mutating",
              requiredPermissions: ["workspace:admin"],
              surface: "studio-dashboard",
            },
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-install",
          action: "extension.installed",
          targetId: "essence.extension.brand-guardian",
          summary: "Installed Brand Guardian.",
          metadata: {
            extensionId: "essence.extension.brand-guardian",
            version: "1.0.0",
          },
        }),
        createAuditLog({
          id: "audit-remove",
          action: "extension.removed",
          targetId: "essence.extension.unsafe",
          summary: "Removed Unsafe extension.",
          metadata: {
            extensionId: "essence.extension.unsafe",
            version: "1.0.0",
          },
        }),
      ],
      now: "2026-05-19T11:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.manifests, 2);
    assert.equal(center.totals.installedExtensions, 1);
    assert.equal(center.totals.blockedManifests, 1);
    assert.equal(center.totals.registeredCommands, 2);
    assert.equal(center.totals.auditTrailEvents, 2);

    const brandGuardian = center.manifests.find(
      (report) => report.manifest.id === "essence.extension.brand-guardian",
    );
    assert.equal(brandGuardian?.status, "ready");
    assert.equal(brandGuardian?.installState, "installed");
    assert.ok(
      brandGuardian?.permissionGrants.every(
        (grant) => grant.status === "ready",
      ),
    );

    const unsafe = center.manifests.find(
      (report) => report.manifest.id === "essence.extension.unsafe",
    );
    assert.equal(unsafe?.status, "blocked");
    assert.ok(
      unsafe?.issues.some((issue) => issue.field === "entrypoint"),
      "unsafe external entrypoint is rejected",
    );
    assert.ok(
      unsafe?.issues.some((issue) => issue.field === "permissions"),
      "unknown permission scope is rejected",
    );

    assert.deepEqual(
      center.commandRegistry.map((command) => command.id),
      [
        "essence.extension.brand-guardian.audit-brand",
        "essence.extension.brand-guardian.fix-alt-text",
      ],
    );
    assert.ok(
      center.commandRegistry.every((command) =>
        command.requiredPermissions.every((scope) =>
          center.permissionMatrix.some(
            (grant) =>
              grant.extensionId === command.extensionId &&
              grant.scope === scope &&
              grant.status === "ready",
          ),
        ),
      ),
    );

    const packet = decodePacket(center.runtimePacket.dataUrl);
    assert.equal(packet.kind, "essence-studio.first-party-extension-runtime");
    assert.equal(packet.commandRegistry.length, 2);
    assert.ok(
      center.nextActions.some((action) => action.includes("Unsafe extension")),
    );
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    commandRegistry: unknown[];
  };
}

function createManifest(
  overrides: Partial<FirstPartyExtensionManifest> = {},
): FirstPartyExtensionManifest {
  return {
    id: "essence.extension.brand-guardian",
    name: "Brand Guardian",
    version: "1.0.0",
    publisher: "Essence Studio",
    description: "Checks active projects for brand and accessibility drift.",
    entrypoint: "essence://extensions/brand-guardian",
    permissions: ["project:read", "project:write", "audit:write"],
    commands: [
      {
        id: "essence.extension.brand-guardian.audit-brand",
        title: "Audit brand drift",
        category: "governance",
        runMode: "read-only",
        requiredPermissions: ["project:read", "audit:write"],
        surface: "studio-dashboard",
      },
      {
        id: "essence.extension.brand-guardian.fix-alt-text",
        title: "Prepare alt text fixes",
        category: "assets",
        runMode: "mutating",
        requiredPermissions: ["project:write", "audit:write"],
        surface: "editor",
      },
    ],
    integrity: "sha256-brandguardian",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "extension.installed",
    targetType: "extension",
    targetId: "essence.extension.brand-guardian",
    summary: "Installed extension.",
    actorEmail: "designer@example.com",
    metadata: {},
    createdAt: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}
