import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import type { DesktopSyncReconciliationCenter } from "@/features/desktop/desktop-sync-reconciliation";
import type { OperationalHealthReport } from "@/features/operations/operational-health";
import type { ReleaseReadinessReport } from "@/features/operations/release-readiness-gates";

export type DesktopPackagingStatus = "ready" | "review" | "blocked";

export type DesktopReleaseChannelId = "stable" | "beta" | "canary";

export type DesktopReleaseChannel = {
  id: DesktopReleaseChannelId;
  label: string;
  version: string;
  updateEndpoint: string | null;
  promotedAt: string | null;
};

export type DesktopPackagingReadinessSource = {
  productName: string;
  identifier: string;
  appVersion: string;
  cargoVersion: string;
  rustVersion: string;
  frontendDist: string;
  devUrl: string;
  beforeBuildCommand: string;
  bundleActive: boolean;
  bundleTargets: string[];
  icons: string[];
  license: string;
  repository: string;
  tauriVersion: string;
  tauriBuildVersion: string;
  logPluginConfigured: boolean;
  signing: {
    updaterPublicKeyConfigured: boolean;
    windowsCertificateConfigured: boolean;
    macosIdentityConfigured: boolean;
  };
  updater: {
    active: boolean;
    endpoints: string[];
  };
  releaseChannels: DesktopReleaseChannel[];
};

export type DesktopPackagingGateId =
  | "signing"
  | "release-channels"
  | "installer-qa"
  | "update-readiness"
  | "desktop-qa-evidence"
  | "release-notes";

export type DesktopPackagingCheck = {
  id: string;
  title: string;
  detail: string;
  status: DesktopPackagingStatus;
  badge: string;
  meta: string[];
};

export type DesktopPackagingGate = {
  id: DesktopPackagingGateId;
  title: string;
  description: string;
  status: DesktopPackagingStatus;
  score: number;
  metricLabel: string;
  metricValue: number;
  checks: DesktopPackagingCheck[];
};

export type DesktopReleaseNoteSection = {
  title: string;
  items: string[];
};

export type DesktopReleaseNotes = {
  title: string;
  generatedAt: string;
  version: string;
  channels: DesktopReleaseChannel[];
  sections: DesktopReleaseNoteSection[];
  download: {
    fileName: string;
    href: string;
    markdown: string;
  };
};

export type DesktopPackagingReleasePacket = {
  id: string;
  status: DesktopPackagingStatus;
  generatedAt: string;
  version: string;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type DesktopPackagingReadinessCenter = {
  generatedAt: string;
  status: DesktopPackagingStatus;
  score: number;
  gates: DesktopPackagingGate[];
  releaseNotes: DesktopReleaseNotes;
  releasePacket: DesktopPackagingReleasePacket;
  nextActions: string[];
  totals: {
    gates: number;
    checks: number;
    blockedChecks: number;
    reviewChecks: number;
    releaseChannels: number;
    installerTargets: number;
    qaEvidence: number;
    releaseNoteSections: number;
  };
};

export type DesktopPackagingReadinessInput = {
  source: DesktopPackagingReadinessSource;
  releaseReadiness: ReleaseReadinessReport;
  offlineSync: DesktopOfflineSyncCenter;
  syncReconciliation: DesktopSyncReconciliationCenter;
  operationalHealth: OperationalHealthReport | null;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

const statusScores: Record<DesktopPackagingStatus, number> = {
  ready: 100,
  review: 72,
  blocked: 35,
};

export function createDesktopPackagingReadinessCenter(
  input: DesktopPackagingReadinessInput,
): DesktopPackagingReadinessCenter {
  const generatedAt = normalizeNow(input.now).toISOString();
  const releaseNotes = createReleaseNotes({ input, generatedAt });
  const gates = [
    createSigningGate(input),
    createReleaseChannelGate(input),
    createInstallerQaGate(input),
    createUpdateReadinessGate(input),
    createDesktopQaEvidenceGate(input),
    createReleaseNotesGate({ input, releaseNotes }),
  ];
  const status = aggregateStatus(gates);
  const score = average(gates.map((gate) => gate.score));
  const releasePacket = createReleasePacket({
    input,
    generatedAt,
    status,
    score,
    gates,
    releaseNotes,
  });

  return {
    generatedAt,
    status,
    score,
    gates,
    releaseNotes,
    releasePacket,
    nextActions: createNextActions(gates),
    totals: {
      gates: gates.length,
      checks: gates.reduce((total, gate) => total + gate.checks.length, 0),
      blockedChecks: gates.reduce(
        (total, gate) =>
          total +
          gate.checks.filter((check) => check.status === "blocked").length,
        0,
      ),
      reviewChecks: gates.reduce(
        (total, gate) =>
          total +
          gate.checks.filter((check) => check.status === "review").length,
        0,
      ),
      releaseChannels: input.source.releaseChannels.length,
      installerTargets: normalizeBundleTargets(input.source.bundleTargets)
        .length,
      qaEvidence: countQaEvidence(input),
      releaseNoteSections: releaseNotes.sections.length,
    },
  };
}

function createSigningGate(
  input: DesktopPackagingReadinessInput,
): DesktopPackagingGate {
  const checks: DesktopPackagingCheck[] = [
    {
      id: "app-identifier",
      title: "Application identifier",
      detail: `${input.source.identifier} is the desktop bundle identifier.`,
      status:
        input.source.identifier.includes(".") &&
        input.source.identifier.length > 8
          ? "ready"
          : "blocked",
      badge: input.source.identifier || "missing",
      meta: [input.source.productName],
    },
    {
      id: "updater-signing-key",
      title: "Updater signing key",
      detail: input.source.signing.updaterPublicKeyConfigured
        ? "Tauri updater public key evidence is configured."
        : "Configure Tauri updater signing keys before enabling production updates.",
      status: input.source.signing.updaterPublicKeyConfigured
        ? "ready"
        : "blocked",
      badge: input.source.signing.updaterPublicKeyConfigured
        ? "configured"
        : "missing",
      meta: [`Tauri ${input.source.tauriVersion}`],
    },
    {
      id: "platform-certificates",
      title: "Platform signing certificates",
      detail:
        input.source.signing.windowsCertificateConfigured &&
        input.source.signing.macosIdentityConfigured
          ? "Windows and macOS signing evidence is configured."
          : "Windows and macOS signing identities need production evidence.",
      status:
        input.source.signing.windowsCertificateConfigured &&
        input.source.signing.macosIdentityConfigured
          ? "ready"
          : input.source.signing.windowsCertificateConfigured ||
              input.source.signing.macosIdentityConfigured
            ? "review"
            : "blocked",
      badge: `${Number(input.source.signing.windowsCertificateConfigured) + Number(input.source.signing.macosIdentityConfigured)}/2`,
      meta: ["Windows certificate", "macOS identity"],
    },
  ];

  return createGate({
    id: "signing",
    title: "Signing readiness",
    description:
      "Desktop releases need stable app identity plus updater and platform signing evidence.",
    metricLabel: "signing checks",
    metricValue: checks.length,
    checks,
  });
}

function createReleaseChannelGate(
  input: DesktopPackagingReadinessInput,
): DesktopPackagingGate {
  const checks = input.source.releaseChannels.map(
    (channel): DesktopPackagingCheck => {
      const hasEndpoint = Boolean(channel.updateEndpoint);
      const stablePrerelease =
        channel.id === "stable" &&
        /(?:beta|canary|alpha|rc)/i.test(channel.version);
      const versionMatches =
        channel.id !== "stable" || channel.version === input.source.appVersion;
      const status: DesktopPackagingStatus =
        !hasEndpoint || stablePrerelease
          ? "blocked"
          : versionMatches
            ? "ready"
            : "review";

      return {
        id: `channel-${channel.id}`,
        title: `${channel.label} channel`,
        detail: hasEndpoint
          ? `${channel.label} channel ${channel.version} uses ${channel.updateEndpoint}.`
          : `${channel.label} channel is missing an update endpoint.`,
        status,
        badge: channel.version,
        meta: [
          channel.promotedAt
            ? `promoted ${channel.promotedAt}`
            : "not promoted",
          channel.updateEndpoint ?? "endpoint missing",
        ],
      };
    },
  );

  return createGate({
    id: "release-channels",
    title: "Release channels",
    description:
      "Stable, beta, and canary channel metadata for staged desktop rollout.",
    metricLabel: "channels",
    metricValue: checks.length,
    checks,
  });
}

function createInstallerQaGate(
  input: DesktopPackagingReadinessInput,
): DesktopPackagingGate {
  const targets = normalizeBundleTargets(input.source.bundleTargets);
  const iconSet = new Set(input.source.icons);
  const hasWindowsIcon = iconSet.has("icons/icon.ico");
  const hasMacIcon = iconSet.has("icons/icon.icns");
  const hasPngIcons =
    iconSet.has("icons/32x32.png") && iconSet.has("icons/128x128.png");
  const checks: DesktopPackagingCheck[] = [
    {
      id: "bundle-active",
      title: "Bundle active",
      detail: input.source.bundleActive
        ? "Tauri bundling is active."
        : "Tauri bundling is disabled.",
      status: input.source.bundleActive ? "ready" : "blocked",
      badge: input.source.bundleActive ? "active" : "inactive",
      meta: [`targets: ${targets.join(", ") || "none"}`],
    },
    {
      id: "installer-targets",
      title: "Installer targets",
      detail: `${targets.length} platform target${targets.length === 1 ? "" : "s"} are configured for package QA.`,
      status:
        targets.length >= 3 ? "ready" : targets.length ? "review" : "blocked",
      badge: targets.length.toLocaleString(),
      meta: targets,
    },
    {
      id: "icon-coverage",
      title: "Icon coverage",
      detail: "Windows, macOS, and PNG app icons should ship with the bundle.",
      status:
        hasWindowsIcon && hasMacIcon && hasPngIcons
          ? "ready"
          : hasWindowsIcon || hasMacIcon || hasPngIcons
            ? "review"
            : "blocked",
      badge: `${Number(hasWindowsIcon) + Number(hasMacIcon) + Number(hasPngIcons)}/3`,
      meta: input.source.icons,
    },
    {
      id: "manifest-metadata",
      title: "Manifest metadata",
      detail:
        input.source.license && input.source.repository
          ? "Desktop package metadata includes license and repository."
          : "Desktop package metadata should include license and repository before public installer release.",
      status:
        input.source.license && input.source.repository ? "ready" : "review",
      badge:
        input.source.license && input.source.repository
          ? "complete"
          : "partial",
      meta: [
        input.source.license || "license missing",
        input.source.repository || "repository missing",
      ],
    },
    {
      id: "frontend-source",
      title: "Frontend source",
      detail: input.source.frontendDist.startsWith("https://")
        ? "Desktop shell points at the production hosted frontend."
        : "Desktop shell uses a local frontend distribution.",
      status: input.source.frontendDist ? "ready" : "blocked",
      badge: input.source.frontendDist.startsWith("https://")
        ? "hosted"
        : "local",
      meta: [
        input.source.frontendDist,
        input.source.beforeBuildCommand || "no beforeBuildCommand",
      ],
    },
  ];

  return createGate({
    id: "installer-qa",
    title: "Installer QA",
    description:
      "Bundle activation, target coverage, icons, metadata, and frontend source evidence.",
    metricLabel: "installer checks",
    metricValue: checks.length,
    checks,
  });
}

function createUpdateReadinessGate(
  input: DesktopPackagingReadinessInput,
): DesktopPackagingGate {
  const endpoints = unique([
    ...input.source.updater.endpoints,
    ...input.source.releaseChannels
      .map((channel) => channel.updateEndpoint)
      .filter((value): value is string => Boolean(value)),
  ]);
  const checks: DesktopPackagingCheck[] = [
    {
      id: "updater-active",
      title: "Updater active",
      detail: input.source.updater.active
        ? "Desktop updater is active in release metadata."
        : "Enable the Tauri updater before production auto-update rollout.",
      status: input.source.updater.active ? "ready" : "blocked",
      badge: input.source.updater.active ? "active" : "inactive",
      meta: [
        `${endpoints.length} endpoint${endpoints.length === 1 ? "" : "s"}`,
      ],
    },
    {
      id: "update-endpoints",
      title: "Update endpoints",
      detail: endpoints.length
        ? "Signed update endpoints are registered for desktop channels."
        : "No update endpoint evidence is configured.",
      status:
        endpoints.length >= 2
          ? "ready"
          : endpoints.length
            ? "review"
            : "blocked",
      badge: endpoints.length.toLocaleString(),
      meta: endpoints.length ? endpoints : ["endpoint missing"],
    },
    {
      id: "update-signature",
      title: "Update signature verification",
      detail: input.source.signing.updaterPublicKeyConfigured
        ? "Updater signature verification has public-key evidence."
        : "Updater signature verification is missing public-key evidence.",
      status: input.source.signing.updaterPublicKeyConfigured
        ? "ready"
        : "blocked",
      badge: input.source.signing.updaterPublicKeyConfigured
        ? "signed"
        : "unsigned",
      meta: [`Tauri build ${input.source.tauriBuildVersion}`],
    },
  ];

  return createGate({
    id: "update-readiness",
    title: "Update readiness",
    description:
      "Auto-update activation, endpoints, and signature verification evidence.",
    metricLabel: "update checks",
    metricValue: checks.length,
    checks,
  });
}

function createDesktopQaEvidenceGate(
  input: DesktopPackagingReadinessInput,
): DesktopPackagingGate {
  const checks: DesktopPackagingCheck[] = [
    {
      id: "release-readiness",
      title: "Web release readiness",
      detail: "Desktop shell depends on the production web release surface.",
      status: input.releaseReadiness.status,
      badge: `${input.releaseReadiness.score}/100`,
      meta: [
        `${input.releaseReadiness.totals.coveredCriticalRoutes}/${input.releaseReadiness.totals.criticalRoutes} critical routes`,
        `${input.releaseReadiness.totals.blockedEnvironmentChecks} blocked env checks`,
      ],
    },
    {
      id: "offline-sync",
      title: "Offline handoff readiness",
      detail: "Desktop offline queues should be clean before installer QA.",
      status: mapOfflineSyncStatus(input.offlineSync.status),
      badge: `${input.offlineSync.score}/100`,
      meta: [
        `${input.offlineSync.totals.queueItems} queue items`,
        `${input.offlineSync.totals.integrityIssues} integrity issues`,
      ],
    },
    {
      id: "sync-reconciliation",
      title: "Desktop/cloud reconciliation",
      detail:
        "Conflict diffs and recovery choices should be resolved before release.",
      status: input.syncReconciliation.status,
      badge: `${input.syncReconciliation.score}/100`,
      meta: [
        `${input.syncReconciliation.totals.conflictDiffs} conflicts`,
        `${input.syncReconciliation.totals.failedExports} failed exports`,
      ],
    },
    {
      id: "operational-health",
      title: "Operational health",
      detail: input.operationalHealth
        ? "Operational health report is attached to desktop QA evidence."
        : "Operational health report is missing from desktop QA evidence.",
      status: input.operationalHealth
        ? mapOperationalHealthStatus(input.operationalHealth.status)
        : "review",
      badge: input.operationalHealth?.status ?? "missing",
      meta: input.operationalHealth
        ? [
            input.operationalHealth.checkedAt,
            `${input.operationalHealth.groups.length} health groups`,
          ]
        : ["health evidence missing"],
    },
  ];

  return createGate({
    id: "desktop-qa-evidence",
    title: "Desktop QA evidence",
    description:
      "Release gates, offline queues, desktop/cloud reconciliation, and health evidence.",
    metricLabel: "evidence checks",
    metricValue: checks.length,
    checks,
  });
}

function createReleaseNotesGate(input: {
  input: DesktopPackagingReadinessInput;
  releaseNotes: DesktopReleaseNotes;
}): DesktopPackagingGate {
  const recentDesktopAuditLogs = input.input.auditLogs.filter((log) =>
    /desktop|release|version|export|tauri|package/i.test(
      `${log.action} ${log.summary}`,
    ),
  );
  const checks: DesktopPackagingCheck[] = [
    {
      id: "release-note-sections",
      title: "Release note sections",
      detail:
        "Production release notes include installer, update, and QA sections.",
      status: input.releaseNotes.sections.length >= 4 ? "ready" : "review",
      badge: input.releaseNotes.sections.length.toLocaleString(),
      meta: input.releaseNotes.sections.map((section) => section.title),
    },
    {
      id: "audit-backed-notes",
      title: "Audit-backed notes",
      detail: recentDesktopAuditLogs.length
        ? "Recent release, export, or version audit activity is attached."
        : "Attach release, export, or version audit activity before publishing notes.",
      status: recentDesktopAuditLogs.length ? "ready" : "review",
      badge: recentDesktopAuditLogs.length.toLocaleString(),
      meta: recentDesktopAuditLogs.slice(0, 4).map((log) => log.summary),
    },
  ];

  return createGate({
    id: "release-notes",
    title: "Production release notes",
    description:
      "Stakeholder-ready notes for installers, channels, update posture, and QA evidence.",
    metricLabel: "note checks",
    metricValue: checks.length,
    checks,
  });
}

function createReleaseNotes(input: {
  input: DesktopPackagingReadinessInput;
  generatedAt: string;
}): DesktopReleaseNotes {
  const sections: DesktopReleaseNoteSection[] = [
    {
      title: "Desktop package",
      items: [
        `${input.input.source.productName} ${input.input.source.appVersion} uses ${input.input.source.identifier}.`,
        `Bundle targets: ${normalizeBundleTargets(input.input.source.bundleTargets).join(", ") || "none"}.`,
      ],
    },
    {
      title: "Release channels",
      items: input.input.source.releaseChannels.map(
        (channel) =>
          `${channel.label} channel ${channel.version}${channel.updateEndpoint ? ` -> ${channel.updateEndpoint}` : " has no update endpoint"}.`,
      ),
    },
    {
      title: "Signing and updates",
      items: [
        input.input.source.signing.updaterPublicKeyConfigured
          ? "Updater signing public key is configured."
          : "Configure Tauri updater signing keys before auto-update rollout.",
        input.input.source.updater.active
          ? "Desktop updater metadata is active."
          : "Desktop updater metadata is not active yet.",
      ],
    },
    {
      title: "Installer QA evidence",
      items: [
        `Release readiness ${input.input.releaseReadiness.score}/100 (${input.input.releaseReadiness.status}).`,
        `Offline sync ${input.input.offlineSync.score}/100 (${input.input.offlineSync.status}).`,
        `Desktop reconciliation ${input.input.syncReconciliation.score}/100 (${input.input.syncReconciliation.status}).`,
      ],
    },
  ];
  const title = `${input.input.source.productName} ${input.input.source.appVersion} Desktop Release Notes`;
  const markdown = renderReleaseNotesMarkdown({
    title,
    generatedAt: input.generatedAt,
    sections,
  });

  return {
    title,
    generatedAt: input.generatedAt,
    version: input.input.source.appVersion,
    channels: input.input.source.releaseChannels,
    sections,
    download: {
      fileName: `essence-desktop-release-notes-${input.input.source.appVersion}.md`,
      href: `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`,
      markdown,
    },
  };
}

function createReleasePacket(input: {
  input: DesktopPackagingReadinessInput;
  generatedAt: string;
  status: DesktopPackagingStatus;
  score: number;
  gates: DesktopPackagingGate[];
  releaseNotes: DesktopReleaseNotes;
}): DesktopPackagingReleasePacket {
  const payload = {
    kind: "essence-studio.desktop-packaging-readiness",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    package: {
      productName: input.input.source.productName,
      identifier: input.input.source.identifier,
      appVersion: input.input.source.appVersion,
      cargoVersion: input.input.source.cargoVersion,
      rustVersion: input.input.source.rustVersion,
      bundleTargets: normalizeBundleTargets(input.input.source.bundleTargets),
    },
    gates: input.gates.map((gate) => ({
      id: gate.id,
      title: gate.title,
      status: gate.status,
      score: gate.score,
      checks: gate.checks,
    })),
    releaseNotes: input.releaseNotes,
    auditLogIds: input.input.auditLogs.map((log) => log.id),
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "desktop-packaging-readiness-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    version: input.input.source.appVersion,
    download: {
      fileName: `essence-desktop-packaging-readiness-${input.input.source.appVersion}.json`,
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createGate(input: {
  id: DesktopPackagingGateId;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: number;
  checks: DesktopPackagingCheck[];
}): DesktopPackagingGate {
  const status = aggregateStatus(input.checks);

  return {
    ...input,
    status,
    score: average(input.checks.map((check) => statusScores[check.status])),
  };
}

function createNextActions(gates: DesktopPackagingGate[]) {
  return gates
    .flatMap((gate) =>
      gate.checks
        .filter((check) => check.status !== "ready")
        .map((check) => `${check.title}: ${check.detail}`),
    )
    .slice(0, 6);
}

function normalizeBundleTargets(targets: string[]) {
  const normalized = unique(targets.map((target) => target.toLowerCase()));

  if (normalized.includes("all")) {
    return ["windows", "macos", "linux"];
  }

  return normalized;
}

function countQaEvidence(input: DesktopPackagingReadinessInput) {
  return [
    input.releaseReadiness.packet.fileName,
    input.syncReconciliation.packet.fileName,
    input.operationalHealth?.checkedAt ?? null,
    input.offlineSync.totals.auditEvents ? "offline-sync-audit" : null,
  ].filter(Boolean).length;
}

function mapOfflineSyncStatus(
  status: DesktopOfflineSyncCenter["status"],
): DesktopPackagingStatus {
  if (status === "ready") return "ready";
  if (status === "attention") return "review";

  return "blocked";
}

function mapOperationalHealthStatus(
  status: OperationalHealthReport["status"],
): DesktopPackagingStatus {
  if (status === "healthy") return "ready";
  if (status === "warning") return "review";

  return "blocked";
}

function aggregateStatus(
  items: Array<{ status: DesktopPackagingStatus }>,
): DesktopPackagingStatus {
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "review")) return "review";

  return "ready";
}

function average(values: number[]) {
  if (!values.length) return 100;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function renderReleaseNotesMarkdown(input: {
  title: string;
  generatedAt: string;
  sections: DesktopReleaseNoteSection[];
}) {
  return [
    `# ${input.title}`,
    "",
    `Generated: ${input.generatedAt}`,
    "",
    ...input.sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      ...section.items.map((item) => `- ${item}`),
      "",
    ]),
  ].join("\n");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
