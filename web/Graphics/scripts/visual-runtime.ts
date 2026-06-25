import {
  getRuntimeObservabilityReport,
  type RuntimeIssue,
  type RuntimeIssueSeverity,
  type RuntimeIssueSource,
} from "../src/features/editor/runtime-observability";
import type { PageLike } from "./visual-browser";

type RuntimeConsoleMessageLike = {
  type?: () => string;
  text?: () => string;
  location?: () => {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
};

type RuntimeObservablePage = PageLike & {
  on?: (event: "console" | "pageerror", handler: (value: unknown) => void) => void;
  off?: (event: "console" | "pageerror", handler: (value: unknown) => void) => void;
  removeListener?: (
    event: "console" | "pageerror",
    handler: (value: unknown) => void,
  ) => void;
};

type RuntimeCaptureOptions = {
  source: RuntimeIssueSource;
  surfaceId: string;
  surfaceLabel: string;
  url: string;
};

export function startRuntimeIssueCapture(
  page: PageLike,
  options: RuntimeCaptureOptions,
) {
  const observablePage = page as RuntimeObservablePage;
  const issues: RuntimeIssue[] = [];

  const handleConsole = (value: unknown) => {
    const message = value as RuntimeConsoleMessageLike;
    const type = message.type?.() ?? "log";
    const severity = getConsoleSeverity(type);

    if (!severity) {
      return;
    }

    issues.push({
      id: getIssueId(options, issues.length, "console"),
      source: options.source,
      surfaceId: options.surfaceId,
      surfaceLabel: options.surfaceLabel,
      url: options.url,
      kind: "console",
      severity,
      message: message.text?.() ?? "Console message captured without text.",
      location: message.location?.(),
      capturedAt: new Date().toISOString(),
    });
  };

  const handlePageError = (value: unknown) => {
    issues.push({
      id: getIssueId(options, issues.length, "page-error"),
      source: options.source,
      surfaceId: options.surfaceId,
      surfaceLabel: options.surfaceLabel,
      url: options.url,
      kind: "page-error",
      severity: "error",
      message: value instanceof Error ? value.message : String(value),
      capturedAt: new Date().toISOString(),
    });
  };

  observablePage.on?.("console", handleConsole);
  observablePage.on?.("pageerror", handlePageError);

  return {
    issues,
    report: () =>
      getRuntimeObservabilityReport({
        issues,
        captured: Boolean(observablePage.on),
      }),
    stop: () => {
      observablePage.off?.("console", handleConsole);
      observablePage.off?.("pageerror", handlePageError);
      observablePage.removeListener?.("console", handleConsole);
      observablePage.removeListener?.("pageerror", handlePageError);
    },
  };
}

export function getRuntimeIssueSummary(issues: RuntimeIssue[]) {
  return getRuntimeObservabilityReport({ issues, captured: true });
}

function getConsoleSeverity(type: string): RuntimeIssueSeverity | null {
  if (type === "error" || type === "assert") {
    return "error";
  }

  if (type === "warning" || type === "warn") {
    return "warning";
  }

  if (type === "info") {
    return "info";
  }

  return null;
}

function getIssueId(
  options: RuntimeCaptureOptions,
  index: number,
  kind: RuntimeIssue["kind"],
) {
  return [
    options.source,
    options.surfaceId.replace(/[^a-z0-9-]/gi, "-"),
    kind,
    index + 1,
  ].join("-");
}
