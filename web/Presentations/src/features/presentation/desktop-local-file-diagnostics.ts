import type { DesktopBridgeReadiness } from "./desktop-bridge-readiness"
import {
  desktopFileCommandPayloadForCommand,
  desktopRecentFileHandoffSummary,
  type DesktopFilePermissionScope,
} from "./desktop-file-command-payloads"
import type { DesktopMenuContractRuntime } from "./desktop-menu-contract"
import type {
  NativeDesktopFileCapabilities,
} from "./desktop-native-file-api"
import type {
  LocalDeckFileSession,
  LocalDeckFileStatus,
} from "./local-deck-file-state"
import type { RecentLocalDeckFile } from "./recent-local-deck-files"

export type DesktopLocalFileDiagnosticStatus =
  | "attention"
  | "blocked"
  | "ready"

export type DesktopLocalFileDiagnosticCheck = {
  detail: string
  id: string
  label: string
  status: DesktopLocalFileDiagnosticStatus
}

export type DesktopLocalFileDiagnosticsReport = {
  checks: DesktopLocalFileDiagnosticCheck[]
  readyCount: number
  status: DesktopLocalFileDiagnosticStatus
  summary: string
  totalCount: number
}

export type DesktopLocalFileDiagnosticsInput = {
  currentFileSession?: LocalDeckFileSession | null
  currentFileStatus?: LocalDeckFileStatus
  nativeCapabilities?: NativeDesktopFileCapabilities | null
  readiness: DesktopBridgeReadiness
  recentFiles?: RecentLocalDeckFile[]
  runtime?: DesktopMenuContractRuntime
}

type RequiredNativeScope = {
  access: "read" | "write"
  permissionScope: DesktopFilePermissionScope
}

const requiredNativeScopes = [
  { access: "read", permissionScope: "read-deck-file" },
  { access: "write", permissionScope: "write-deck-file" },
  { access: "read", permissionScope: "read-presentation-file" },
  { access: "write", permissionScope: "write-export-file" },
] satisfies RequiredNativeScope[]

function combineStatuses(
  statuses: DesktopLocalFileDiagnosticStatus[],
): DesktopLocalFileDiagnosticStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function check(
  checks: DesktopLocalFileDiagnosticCheck[],
  id: string,
  label: string,
  status: DesktopLocalFileDiagnosticStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function commandStatus(input: DesktopLocalFileDiagnosticsInput, commandId: "file.open" | "file.save") {
  const payload = desktopFileCommandPayloadForCommand(
    commandId,
    input.readiness,
    input.runtime,
  )

  if (payload?.status === "ready" && payload.channel === "native-shell") {
    return {
      detail: `${payload.label} routes through ${payload.permissionScope}.`,
      status: "ready",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  if (payload?.status === "fallback") {
    return {
      detail: `${payload.label} still works through a browser fallback; native scoped diagnostics are incomplete.`,
      status: "attention",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  return {
    detail: payload
      ? `${payload.label} is currently ${payload.status}.`
      : `${commandId} was not found in the desktop command payload map.`,
    status: "blocked",
  } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
}

function hasRequiredNativeScope(
  capabilities: NativeDesktopFileCapabilities,
  required: RequiredNativeScope,
) {
  return capabilities.scopes.some((scope) => {
    if (scope.permissionScope !== required.permissionScope) return false

    return required.access === "read" ? scope.canRead : scope.canWrite
  })
}

function nativeScopeStatus(
  capabilities: NativeDesktopFileCapabilities | null | undefined,
) {
  if (!capabilities) {
    return {
      detail:
        "Native file capability snapshot was not provided; run the desktop shell capability command before release smoke.",
      status: "attention",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  const missing = requiredNativeScopes.filter(
    (required) => !hasRequiredNativeScope(capabilities, required),
  )

  return {
    detail: missing.length
      ? `Missing scoped native access: ${missing
          .map((item) => `${item.permissionScope}:${item.access}`)
          .join(", ")}.`
      : `${requiredNativeScopes.length} scoped native file permissions are available.`,
    status: missing.length ? "blocked" : "ready",
  } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
}

function currentFileStatus(input: DesktopLocalFileDiagnosticsInput) {
  if (!input.currentFileStatus) {
    return {
      detail:
        "No active deck file status was provided; CLI diagnostics can still validate command scopes.",
      status: "attention",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  if (input.currentFileStatus.kind === "clean" && input.currentFileSession?.writable) {
    return {
      detail: `${input.currentFileStatus.fileName} is clean and writable.`,
      status: "ready",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  if (input.currentFileStatus.kind === "dirty" && input.currentFileSession?.writable) {
    return {
      detail: `${input.currentFileStatus.fileName} has unsaved changes; save before release smoke fixtures mutate cloud state.`,
      status: "attention",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  if (input.currentFileStatus.kind === "untracked") {
    return {
      detail:
        "The active deck is not backed by a local file yet; save an app-owned deck fixture before desktop release smoke.",
      status: "attention",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  return {
    detail: `${input.currentFileStatus.fileName} is not writable through the current local session.`,
    status: "attention",
  } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
}

function recentFileStatus(recentFiles: RecentLocalDeckFile[] | undefined) {
  const summary = desktopRecentFileHandoffSummary(recentFiles ?? [])

  if (summary.totalCount === 0) {
    return {
      detail:
        "No recent local deck fixtures are available for desktop open/reopen smoke checks.",
      status: "attention",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  if (summary.nativeReadyCount === summary.totalCount) {
    return {
      detail: `${summary.nativeReadyCount} recent local deck fixture(s) are ready.`,
      status: "ready",
    } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
  }

  return {
    detail: `${summary.nativeReadyCount} of ${summary.totalCount} recent local deck fixture(s) are ready; stale or browser-only entries need refresh.`,
    status: summary.nativeReadyCount === 0 ? "blocked" : "attention",
  } satisfies Pick<DesktopLocalFileDiagnosticCheck, "detail" | "status">
}

export function desktopLocalFileDiagnosticsReport(
  input: DesktopLocalFileDiagnosticsInput,
): DesktopLocalFileDiagnosticsReport {
  const checks: DesktopLocalFileDiagnosticCheck[] = []
  const open = commandStatus(input, "file.open")
  const save = commandStatus(input, "file.save")
  const nativeScopes = nativeScopeStatus(input.nativeCapabilities)
  const activeFile = currentFileStatus(input)
  const recents = recentFileStatus(input.recentFiles)

  check(checks, "scoped-open-command", "Scoped open command", open.status, open.detail)
  check(checks, "scoped-save-command", "Scoped save command", save.status, save.detail)
  check(
    checks,
    "native-permission-scopes",
    "Native permission scopes",
    nativeScopes.status,
    nativeScopes.detail,
  )
  check(
    checks,
    "active-local-file",
    "Active local file",
    activeFile.status,
    activeFile.detail,
  )
  check(
    checks,
    "recent-local-fixtures",
    "Recent local fixtures",
    recents.status,
    recents.detail,
  )

  const readyCount = checks.filter((item) => item.status === "ready").length

  return {
    checks,
    readyCount,
    status: combineStatuses(checks.map((item) => item.status)),
    summary: `${readyCount} of ${checks.length} desktop local file diagnostics are ready.`,
    totalCount: checks.length,
  }
}

export function serializeDesktopLocalFileDiagnosticsReport(
  report: DesktopLocalFileDiagnosticsReport,
) {
  return [
    `Desktop local file diagnostics: ${report.summary} Status: ${report.status}.`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}
