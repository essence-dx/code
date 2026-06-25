import type {
  DesignActivityEvent,
  DesignCommandTelemetry,
  DesignCommandTelemetryArea,
  DesignCommandTelemetryStatus,
} from "@/features/editor/types";

export type SlowCommandTelemetryStatus = "ready" | "review" | "blocked";

export type SlowCommandTelemetryRow = {
  id: string;
  status: SlowCommandTelemetryStatus;
  label: string;
  detail: string;
  eventIds: string[];
  metric: number;
  recommendation: string;
};

export type SlowCommandTelemetryReport = {
  captured: boolean;
  status: SlowCommandTelemetryStatus;
  score: number;
  telemetryCount: number;
  slowCommandCount: number;
  failedCommandCount: number;
  canvasCommandCount: number;
  exportCommandCount: number;
  importCommandCount: number;
  collaborationCommandCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: SlowCommandTelemetryRow[];
  events: DesignActivityEvent[];
};

export type CommandTelemetryInput = {
  area: DesignCommandTelemetryArea;
  command: string;
  durationMs: number;
  status?: DesignCommandTelemetryStatus;
  itemCount?: number;
  detail?: string;
  thresholdMs?: number;
  capturedAt?: string;
};

const areaThresholds = {
  canvas: 80,
  export: 900,
  import: 700,
  collaboration: 1400,
} satisfies Record<DesignCommandTelemetryArea, number>;

export function createCommandTelemetry(
  input: CommandTelemetryInput,
): DesignCommandTelemetry {
  const durationMs = Math.max(0, Math.round(input.durationMs));

  return {
    area: input.area,
    command: input.command.trim() || input.area,
    durationMs,
    thresholdMs: input.thresholdMs ?? getCommandTelemetryThreshold(input.area),
    status: input.status ?? "ok",
    itemCount: input.itemCount,
    detail: input.detail,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
}

export function getCommandTelemetryThreshold(
  area: DesignCommandTelemetryArea,
) {
  return areaThresholds[area];
}

export function getSlowCommandTelemetryReport(
  events: DesignActivityEvent[],
): SlowCommandTelemetryReport {
  const telemetryEvents = events.filter(
    (event) => event.telemetry !== undefined,
  );
  const failedEvents = telemetryEvents.filter(
    (event) => event.telemetry?.status === "failed",
  );
  const slowEvents = telemetryEvents.filter((event) => isSlowEvent(event));
  const rows: SlowCommandTelemetryRow[] = [
    ...getMissingTelemetryRows(telemetryEvents.length),
    ...getFailedRows(failedEvents),
    ...getSlowRows(slowEvents),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 24 - reviewCount * 7);

  return {
    captured: telemetryEvents.length > 0,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    telemetryCount: telemetryEvents.length,
    slowCommandCount: slowEvents.length,
    failedCommandCount: failedEvents.length,
    canvasCommandCount: countTelemetryArea(telemetryEvents, "canvas"),
    exportCommandCount: countTelemetryArea(telemetryEvents, "export"),
    importCommandCount: countTelemetryArea(telemetryEvents, "import"),
    collaborationCommandCount: countTelemetryArea(
      telemetryEvents,
      "collaboration",
    ),
    blockedCount,
    reviewCount,
    readyCount,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "command-telemetry-ready",
              status: "ready",
              label: "Command telemetry ready",
              detail:
                "Captured editor commands are within the current latency thresholds.",
              eventIds: [],
              metric: telemetryEvents.length,
              recommendation:
                "Keep attaching command telemetry to release-review exports.",
            } satisfies SlowCommandTelemetryRow,
          ],
    events: telemetryEvents,
  };
}

export function getSlowCommandTelemetryCsv(
  report: SlowCommandTelemetryReport,
) {
  return [
    [
      "created_at",
      "kind",
      "label",
      "area",
      "command",
      "duration_ms",
      "threshold_ms",
      "status",
      "item_count",
      "detail",
    ].join(","),
    ...report.events.map((event) =>
      [
        event.createdAt,
        event.kind,
        event.label,
        event.telemetry?.area ?? "",
        event.telemetry?.command ?? "",
        event.telemetry?.durationMs ?? "",
        event.telemetry?.thresholdMs ?? "",
        event.telemetry?.status ?? "",
        event.telemetry?.itemCount ?? "",
        event.telemetry?.detail ?? event.detail ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getSlowCommandTelemetryMarkdown(
  report: SlowCommandTelemetryReport,
) {
  return [
    "# Slow Command Telemetry",
    "",
    `Captured: ${report.captured ? "yes" : "no"}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Telemetry events: ${report.telemetryCount}`,
    `Slow commands: ${report.slowCommandCount}`,
    `Failed commands: ${report.failedCommandCount}`,
    "",
    "## Review Queue",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Recent Telemetry",
    ...(report.events.length > 0
      ? report.events.slice(0, 20).map((event) => {
          const telemetry = event.telemetry;

          return telemetry
            ? `- ${event.label}: ${telemetry.area}/${telemetry.command} ${telemetry.durationMs}ms (${telemetry.status})`
            : `- ${event.label}: no telemetry`;
        })
      : ["- No command telemetry captured."]),
  ].join("\n");
}

function getMissingTelemetryRows(telemetryCount: number) {
  if (telemetryCount > 0) {
    return [];
  }

  return [
    {
      id: "command-telemetry-missing",
      status: "review",
      label: "Command telemetry missing",
      detail:
        "No timed editor commands have been captured in this document activity stream yet.",
      eventIds: [],
      metric: 0,
      recommendation:
        "Run canvas, export, import, or collaboration sync actions before release review.",
    } satisfies SlowCommandTelemetryRow,
  ];
}

function getFailedRows(events: DesignActivityEvent[]) {
  if (events.length === 0) {
    return [];
  }

  return [
    {
      id: "failed-commands",
      status: "blocked",
      label: "Failed commands",
      detail: `${events.length} timed command${events.length === 1 ? "" : "s"} failed.`,
      eventIds: events.map((event) => event.id),
      metric: events.length,
      recommendation:
        "Fix failed imports, exports, canvas actions, or collaboration sync before release handoff.",
    } satisfies SlowCommandTelemetryRow,
  ];
}

function getSlowRows(events: DesignActivityEvent[]) {
  if (events.length === 0) {
    return [];
  }

  const worstDuration = Math.max(
    ...events.map((event) => event.telemetry?.durationMs ?? 0),
  );

  return [
    {
      id: "slow-commands",
      status: events.some(isBlockedSlowEvent) ? "blocked" : "review",
      label: "Slow commands",
      detail: `${events.length} timed command${events.length === 1 ? "" : "s"} exceeded the area latency threshold.`,
      eventIds: events.map((event) => event.id),
      metric: worstDuration,
      recommendation:
        "Review the slowest commands before adding more release-critical workflows.",
    } satisfies SlowCommandTelemetryRow,
  ];
}

function isSlowEvent(event: DesignActivityEvent) {
  const telemetry = event.telemetry;

  return Boolean(telemetry && telemetry.durationMs > telemetry.thresholdMs);
}

function isBlockedSlowEvent(event: DesignActivityEvent) {
  const telemetry = event.telemetry;

  return Boolean(
    telemetry && telemetry.durationMs > Math.max(telemetry.thresholdMs * 2, 250),
  );
}

function countTelemetryArea(
  events: DesignActivityEvent[],
  area: DesignCommandTelemetryArea,
) {
  return events.filter((event) => event.telemetry?.area === area).length;
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
