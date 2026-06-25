import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { firstPartyExtensionManifests } from "@/features/extensions/first-party-extension-catalog";
import type {
  FirstPartyExtensionAuditTrail,
  FirstPartyExtensionInstallState,
  FirstPartyExtensionManifest,
  FirstPartyExtensionManifestReport,
  FirstPartyExtensionPermissionGrant,
  FirstPartyExtensionRegisteredCommand,
  FirstPartyExtensionRuntimeCenter,
  FirstPartyExtensionRuntimePacket,
  FirstPartyExtensionRuntimeStatus,
  FirstPartyExtensionValidationIssue,
} from "@/features/extensions/first-party-extension-runtime-types";
import { firstPartyExtensionPermissionScopes } from "@/features/extensions/first-party-extension-runtime-types";

export {
  firstPartyExtensionManifests,
  getFirstPartyExtensionManifest,
  isFirstPartyExtensionId,
} from "@/features/extensions/first-party-extension-catalog";

export type {
  FirstPartyExtensionAuditTrail,
  FirstPartyExtensionCommandCategory,
  FirstPartyExtensionCommandManifest,
  FirstPartyExtensionCommandRunMode,
  FirstPartyExtensionInstallState,
  FirstPartyExtensionManifest,
  FirstPartyExtensionManifestReport,
  FirstPartyExtensionPermissionGrant,
  FirstPartyExtensionPermissionScope,
  FirstPartyExtensionRegisteredCommand,
  FirstPartyExtensionRuntimeCenter,
  FirstPartyExtensionRuntimePacket,
  FirstPartyExtensionRuntimeStatus,
  FirstPartyExtensionSurface,
  FirstPartyExtensionValidationIssue,
} from "@/features/extensions/first-party-extension-runtime-types";

const permissionScopeSet = new Set<string>(firstPartyExtensionPermissionScopes);

export function createFirstPartyExtensionRuntimeCenter(input: {
  manifests?: FirstPartyExtensionManifest[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date | string;
}): FirstPartyExtensionRuntimeCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const manifests = input.manifests ?? firstPartyExtensionManifests;
  const auditTrails = createAuditTrails({
    manifests,
    auditLogs: input.auditLogs,
  });
  const installStateByExtension = createInstallStateByExtension(auditTrails);
  const reports = manifests
    .map((manifest) =>
      createManifestReport({
        manifest,
        installState:
          installStateByExtension.get(manifest.id) ??
          ("available" satisfies FirstPartyExtensionInstallState),
      }),
    )
    .sort(compareReports);
  const permissionMatrix = reports.flatMap((report) => report.permissionGrants);
  const commandRegistry = createCommandRegistry(reports, permissionMatrix);
  const status = aggregateStatus(reports.map((report) => report.status));
  const score = average(
    reports.map((report) => report.score),
    100,
  );
  const nextActions = createNextActions(reports);

  return {
    generatedAt,
    status,
    score,
    manifests: reports,
    commandRegistry,
    permissionMatrix,
    auditTrails,
    runtimePacket: createRuntimePacket({
      generatedAt,
      status,
      score,
      manifests: reports,
      commandRegistry,
      permissionMatrix,
      auditTrails,
      nextActions,
    }),
    nextActions,
    totals: {
      manifests: reports.length,
      installedExtensions: reports.filter(
        (report) => report.installState === "installed",
      ).length,
      blockedManifests: reports.filter((report) => report.status === "blocked")
        .length,
      registeredCommands: commandRegistry.length,
      permissionGrants: permissionMatrix.length,
      auditTrailEvents: auditTrails.length,
      runtimePackets: 1,
    },
  };
}

function createManifestReport(input: {
  manifest: FirstPartyExtensionManifest;
  installState: FirstPartyExtensionInstallState;
}): FirstPartyExtensionManifestReport {
  const issues = validateManifest(input.manifest);
  const permissionGrants = createPermissionGrants(input.manifest);
  const status = getReportStatus({
    issues,
    installState: input.installState,
  });
  const score = getReportScore({
    status,
    installState: input.installState,
    issues,
  });

  return {
    id: `extension-report-${input.manifest.id}`,
    manifest: input.manifest,
    status,
    score,
    installState: input.installState,
    issues,
    permissionGrants,
    commandCount: input.manifest.commands.length,
    permissionCount: input.manifest.permissions.length,
    nextAction: createReportNextAction({
      manifest: input.manifest,
      status,
      installState: input.installState,
      issues,
    }),
  };
}

function validateManifest(
  manifest: FirstPartyExtensionManifest,
): FirstPartyExtensionValidationIssue[] {
  const issues: FirstPartyExtensionValidationIssue[] = [];
  const commandIds = new Set<string>();

  if (!/^essence\.extension\.[a-z0-9-]+$/.test(manifest.id)) {
    issues.push(createIssue("id", "error", "Extension id is not namespaced."));
  }

  if (!manifest.name.trim()) {
    issues.push(createIssue("name", "error", "Extension name is required."));
  }

  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    issues.push(
      createIssue("version", "error", "Extension version must be semver."),
    );
  }

  if (manifest.publisher !== "Essence Studio") {
    issues.push(
      createIssue(
        "publisher",
        "error",
        "Only Essence Studio signed first-party publishers are allowed.",
      ),
    );
  }

  if (!manifest.entrypoint.startsWith("essence://extensions/")) {
    issues.push(
      createIssue(
        "entrypoint",
        "error",
        "Extension entrypoint must use the internal essence:// protocol.",
      ),
    );
  }

  if (!manifest.integrity.startsWith("sha256-")) {
    issues.push(
      createIssue("integrity", "error", "Extension integrity hash is missing."),
    );
  }

  if (!manifest.permissions.length) {
    issues.push(
      createIssue(
        "permissions",
        "error",
        "Extension must declare explicit scoped permissions.",
      ),
    );
  }

  for (const permission of manifest.permissions) {
    if (!permissionScopeSet.has(permission)) {
      issues.push(
        createIssue(
          "permissions",
          "error",
          `${permission} is not an allowed permission scope.`,
        ),
      );
    }
  }

  if (!manifest.commands.length) {
    issues.push(
      createIssue("commands", "error", "Extension must register commands."),
    );
  }

  for (const command of manifest.commands) {
    if (!command.id.startsWith(`${manifest.id}.`)) {
      issues.push(
        createIssue(
          "commands",
          "error",
          `${command.id} is outside the extension command namespace.`,
        ),
      );
    }

    if (commandIds.has(command.id)) {
      issues.push(
        createIssue("commands", "error", `${command.id} is duplicated.`),
      );
    }
    commandIds.add(command.id);

    for (const requiredPermission of command.requiredPermissions) {
      if (!manifest.permissions.includes(requiredPermission)) {
        issues.push(
          createIssue(
            "commands",
            "error",
            `${command.id} requires ${requiredPermission} without a manifest grant.`,
          ),
        );
      }
    }

    if (
      command.runMode === "mutating" &&
      !command.requiredPermissions.includes("audit:write")
    ) {
      issues.push(
        createIssue(
          "commands",
          "error",
          `${command.id} mutates data without audit write scope.`,
        ),
      );
    }
  }

  if (manifest.permissions.length > 6) {
    issues.push(
      createIssue(
        "permissions",
        "warning",
        "Extension has a broad permission set and should be reviewed.",
      ),
    );
  }

  return issues;
}

function createPermissionGrants(
  manifest: FirstPartyExtensionManifest,
): FirstPartyExtensionPermissionGrant[] {
  return manifest.permissions.map((scope) => ({
    id: `permission-${manifest.id}-${scope}`,
    extensionId: manifest.id,
    extensionName: manifest.name,
    scope,
    status: permissionScopeSet.has(scope) ? "ready" : "blocked",
    detail: permissionScopeSet.has(scope)
      ? `${scope} is scoped to ${manifest.name}.`
      : `${scope} is not allowed by the first-party runtime.`,
  }));
}

function createCommandRegistry(
  reports: FirstPartyExtensionManifestReport[],
  permissionMatrix: FirstPartyExtensionPermissionGrant[],
): FirstPartyExtensionRegisteredCommand[] {
  return reports
    .filter(
      (report) =>
        report.status !== "blocked" && report.installState === "installed",
    )
    .flatMap((report) =>
      report.manifest.commands
        .filter((command) =>
          command.requiredPermissions.every((scope) =>
            permissionMatrix.some(
              (grant) =>
                grant.extensionId === report.manifest.id &&
                grant.scope === scope &&
                grant.status === "ready",
            ),
          ),
        )
        .map((command) => ({
          id: command.id,
          extensionId: report.manifest.id,
          extensionName: report.manifest.name,
          title: command.title,
          category: command.category,
          runMode: command.runMode,
          surface: command.surface,
          requiredPermissions: command.requiredPermissions,
          scopedPermissionSummary: command.requiredPermissions.join(", "),
          auditAction:
            command.runMode === "read-only"
              ? "extension.command.previewed"
              : "extension.command.requested",
        })),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

function createAuditTrails(input: {
  manifests: FirstPartyExtensionManifest[];
  auditLogs: WorkspaceAuditLogSummary[];
}): FirstPartyExtensionAuditTrail[] {
  const manifestById = new Map(
    input.manifests.map((manifest) => [manifest.id, manifest]),
  );

  return input.auditLogs
    .filter(
      (log) =>
        log.action === "extension.installed" ||
        log.action === "extension.removed",
    )
    .map((log) => {
      const extensionId = getAuditExtensionId(log);
      const manifest = manifestById.get(extensionId);

      return {
        id: log.id,
        extensionId,
        extensionName: manifest?.name ?? extensionId,
        action: log.action as "extension.installed" | "extension.removed",
        actorEmail: log.actorEmail,
        summary: log.summary,
        createdAt: log.createdAt,
      };
    })
    .filter((trail) => Boolean(trail.extensionId))
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
}

function createInstallStateByExtension(
  auditTrails: FirstPartyExtensionAuditTrail[],
) {
  const states = new Map<string, FirstPartyExtensionInstallState>();

  for (const trail of auditTrails) {
    if (states.has(trail.extensionId)) continue;

    states.set(
      trail.extensionId,
      trail.action === "extension.installed" ? "installed" : "removed",
    );
  }

  return states;
}

function getAuditExtensionId(log: WorkspaceAuditLogSummary) {
  const metadataId =
    typeof log.metadata.extensionId === "string"
      ? log.metadata.extensionId
      : "";

  return metadataId || log.targetId || "";
}

function getReportStatus(input: {
  issues: FirstPartyExtensionValidationIssue[];
  installState: FirstPartyExtensionInstallState;
}): FirstPartyExtensionRuntimeStatus {
  if (input.issues.some((issue) => issue.severity === "error")) {
    return "blocked";
  }

  if (input.installState !== "installed") return "review";
  if (input.issues.length) return "review";

  return "ready";
}

function getReportScore(input: {
  status: FirstPartyExtensionRuntimeStatus;
  installState: FirstPartyExtensionInstallState;
  issues: FirstPartyExtensionValidationIssue[];
}) {
  if (input.status === "blocked") return 24;
  if (input.status === "review") {
    return input.installState === "installed" ? 74 : 68;
  }

  const warningPenalty = input.issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  return Math.max(82, 100 - warningPenalty * 8);
}

function createReportNextAction(input: {
  manifest: FirstPartyExtensionManifest;
  status: FirstPartyExtensionRuntimeStatus;
  installState: FirstPartyExtensionInstallState;
  issues: FirstPartyExtensionValidationIssue[];
}) {
  const issue = input.issues.find(
    (candidate) => candidate.severity === "error",
  );

  if (issue) return `${input.manifest.name}: ${issue.message}`;
  if (input.installState === "removed") {
    return `${input.manifest.name}: reinstall when the team needs these commands again.`;
  }
  if (input.installState === "available") {
    return `${input.manifest.name}: install extension to register commands.`;
  }
  if (input.status === "review") {
    return `${input.manifest.name}: review broad permissions before command use.`;
  }

  return `${input.manifest.name}: commands are registered with scoped permissions.`;
}

function createNextActions(reports: FirstPartyExtensionManifestReport[]) {
  const actions = reports
    .filter((report) => report.status !== "ready")
    .concat(reports.filter((report) => report.status === "ready"))
    .slice(0, 6)
    .map((report) => report.nextAction);

  return actions.length
    ? actions
    : ["Add a first-party extension manifest before registering commands."];
}

function createRuntimePacket(input: {
  generatedAt: string;
  status: FirstPartyExtensionRuntimeStatus;
  score: number;
  manifests: FirstPartyExtensionManifestReport[];
  commandRegistry: FirstPartyExtensionRegisteredCommand[];
  permissionMatrix: FirstPartyExtensionPermissionGrant[];
  auditTrails: FirstPartyExtensionAuditTrail[];
  nextActions: string[];
}): FirstPartyExtensionRuntimePacket {
  const payload = {
    kind: "essence-studio.first-party-extension-runtime",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    manifests: input.manifests.map((report) => ({
      id: report.manifest.id,
      name: report.manifest.name,
      version: report.manifest.version,
      status: report.status,
      score: report.score,
      installState: report.installState,
      issues: report.issues,
      commandCount: report.commandCount,
      permissionCount: report.permissionCount,
    })),
    commandRegistry: input.commandRegistry,
    permissionMatrix: input.permissionMatrix,
    auditTrails: input.auditTrails,
    nextActions: input.nextActions,
  };

  return {
    id: "first-party-extension-runtime-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    fileName: "first-party-extension-runtime.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

function createIssue(
  field: string,
  severity: FirstPartyExtensionValidationIssue["severity"],
  message: string,
): FirstPartyExtensionValidationIssue {
  return {
    id: `${field}-${severity}-${message.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    field,
    severity,
    message,
  };
}

function compareReports(
  left: FirstPartyExtensionManifestReport,
  right: FirstPartyExtensionManifestReport,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    installWeight(left.installState) - installWeight(right.installState) ||
    left.manifest.name.localeCompare(right.manifest.name)
  );
}

function aggregateStatus(statuses: FirstPartyExtensionRuntimeStatus[]) {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

function statusWeight(status: FirstPartyExtensionRuntimeStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function installWeight(state: FirstPartyExtensionInstallState) {
  if (state === "installed") return 0;
  if (state === "available") return 1;

  return 2;
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}
