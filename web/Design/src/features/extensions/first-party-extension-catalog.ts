import type { FirstPartyExtensionManifest } from "@/features/extensions/first-party-extension-runtime-types";

export const firstPartyExtensionManifests: FirstPartyExtensionManifest[] = [
  {
    id: "essence.extension.brand-guardian",
    name: "Brand Guardian",
    version: "1.0.0",
    publisher: "Essence Studio",
    description:
      "Audits active projects for brand drift, accessibility gaps, and safe auto-fix previews.",
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
  },
  {
    id: "essence.extension.export-operator",
    name: "Export Operator",
    version: "1.0.0",
    publisher: "Essence Studio",
    description:
      "Registers export readiness commands with dry-run handoff checks before queued artifacts are created.",
    entrypoint: "essence://extensions/export-operator",
    permissions: ["project:read", "export:run", "audit:write"],
    commands: [
      {
        id: "essence.extension.export-operator.preflight-export",
        title: "Preflight export packet",
        category: "export",
        runMode: "dry-run",
        requiredPermissions: ["project:read", "export:run", "audit:write"],
        surface: "studio-dashboard",
      },
      {
        id: "essence.extension.export-operator.queue-export",
        title: "Queue governed export",
        category: "export",
        runMode: "mutating",
        requiredPermissions: ["export:run", "audit:write"],
        surface: "studio-dashboard",
      },
    ],
    integrity: "sha256-exportoperator",
  },
  {
    id: "essence.extension.marketplace-curator",
    name: "Marketplace Curator",
    version: "1.0.0",
    publisher: "Essence Studio",
    description:
      "Adds template review commands for curation notes, QA gates, and release-channel readiness.",
    entrypoint: "essence://extensions/marketplace-curator",
    permissions: ["template:read", "template:write", "audit:write"],
    commands: [
      {
        id: "essence.extension.marketplace-curator.review-template",
        title: "Review template QA",
        category: "templates",
        runMode: "dry-run",
        requiredPermissions: ["template:read", "audit:write"],
        surface: "templates-dashboard",
      },
      {
        id: "essence.extension.marketplace-curator.stage-release",
        title: "Stage template release",
        category: "templates",
        runMode: "mutating",
        requiredPermissions: ["template:write", "audit:write"],
        surface: "templates-dashboard",
      },
    ],
    integrity: "sha256-marketplacecurator",
  },
];

export function getFirstPartyExtensionManifest(extensionId: string) {
  return (
    firstPartyExtensionManifests.find(
      (manifest) => manifest.id === extensionId,
    ) ?? null
  );
}

export function isFirstPartyExtensionId(extensionId: string) {
  return Boolean(getFirstPartyExtensionManifest(extensionId));
}
