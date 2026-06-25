export interface DesktopReadinessInput {
  isDesktopRuntime: boolean;
  hasOnlineActions: boolean;
}

export type DesktopReadinessStatus = "ready" | "limited";

export interface DesktopReadinessCapability {
  id: "local-import" | "local-export" | "media-recovery" | "render-handoff" | "runtime-diagnostics" | "online-actions";
  label: string;
  status: DesktopReadinessStatus;
  detail: string;
}

export interface DesktopReadinessReport {
  runtimeLabel: "Browser" | "Desktop app";
  status: DesktopReadinessStatus;
  summary: string;
  capabilities: DesktopReadinessCapability[];
}

export function createDesktopReadinessReport({
  isDesktopRuntime,
  hasOnlineActions,
}: DesktopReadinessInput): DesktopReadinessReport {
  const capabilities: DesktopReadinessCapability[] = [
    {
      id: "local-import",
      label: "Local import",
      status: isDesktopRuntime ? "ready" : "limited",
      detail: isDesktopRuntime ? "Desktop file picker is ready." : "Browser import is ready; desktop file picker is inactive.",
    },
    {
      id: "local-export",
      label: "Local export",
      status: isDesktopRuntime ? "ready" : "limited",
      detail: isDesktopRuntime ? "Exports can save through the desktop save dialog." : "Exports download through the browser.",
    },
    {
      id: "media-recovery",
      label: "Media recovery",
      status: isDesktopRuntime ? "ready" : "limited",
      detail: isDesktopRuntime ? "Saved desktop media can be restored when projects reopen." : "Browser media recovery uses local browser storage.",
    },
    {
      id: "render-handoff",
      label: "Render handoff",
      status: isDesktopRuntime ? "ready" : "limited",
      detail: isDesktopRuntime ? "Long or file-backed exports can use the native render adapter." : "Short browser renders are ready; long or file-backed exports recommend the desktop app.",
    },
    {
      id: "runtime-diagnostics",
      label: "Runtime diagnostics",
      status: isDesktopRuntime ? "ready" : "limited",
      detail: isDesktopRuntime ? "Local storage, media library, and native render checks can run in settings." : "Desktop-only diagnostics are available in the desktop app.",
    },
    {
      id: "online-actions",
      label: "Online actions",
      status: hasOnlineActions ? "ready" : "limited",
      detail: hasOnlineActions ? "Account sync and online AI actions can connect." : "Account sync and online AI actions need the online workspace connection.",
    },
  ];

  const isReady = capabilities.every((capability) => capability.status === "ready");

  return {
    runtimeLabel: isDesktopRuntime ? "Desktop app" : "Browser",
    status: isReady ? "ready" : "limited",
    summary: isReady
      ? "Desktop import, export, recovery, render handoff, diagnostics, and online actions are ready."
      : "Local editing is ready; some desktop or online actions are limited in this runtime.",
    capabilities,
  };
}
