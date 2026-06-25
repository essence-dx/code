import type { AdminReleaseIncidentTimelineReport } from "@/features/admin/admin-release-incident-timeline";

export function getAdminReleaseIncidentTimelineJson(
  report: AdminReleaseIncidentTimelineReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminReleaseIncidentTimelineCsv(
  report: AdminReleaseIncidentTimelineReport,
) {
  return [
    [
      "id",
      "source",
      "status",
      "severity",
      "occurred_at",
      "title",
      "actor",
      "target",
      "summary",
      "recommendation",
    ].join(","),
    ...report.timeline.map((event) =>
      [
        event.id,
        event.source,
        event.status,
        event.severity,
        event.occurredAt,
        event.title,
        event.actor,
        event.target,
        event.summary,
        event.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "id",
      "status",
      "label",
      "value",
      "event_count",
      "sources",
      "latest_at",
      "detail",
      "recommendation",
    ].join(","),
    ...report.correlations.map((correlation) =>
      [
        correlation.id,
        correlation.status,
        correlation.label,
        correlation.value,
        correlation.eventCount,
        correlation.sources.join("; "),
        correlation.latestAt,
        correlation.detail,
        correlation.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminReleaseIncidentTimelineMarkdown(
  report: AdminReleaseIncidentTimelineReport,
) {
  return [
    "# Release Incident Timeline",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Events: ${report.eventCount}`,
    `Blocked events: ${report.blockedEventCount}`,
    `Review events: ${report.reviewEventCount}`,
    "",
    "## Sources",
    "",
    `- Deploy checks: ${report.deployEventCount}`,
    `- Audit events: ${report.auditEventCount}`,
    `- Notifications: ${report.notificationEventCount}`,
    `- Runtime observations: ${report.runtimeEventCount}`,
    `- Rollback evidence: ${report.rollbackEventCount}`,
    `- Manifest evidence: ${report.manifestEventCount}`,
    "",
    "## Correlations",
    "",
    ...report.correlations.map(
      (correlation) =>
        `- [${correlation.status}] ${correlation.label} (${correlation.value}): ${correlation.detail} Recommendation: ${correlation.recommendation}`,
    ),
    "",
    "## Timeline",
    "",
    ...report.timeline.map(
      (event) =>
        `- [${event.status}] ${event.occurredAt} ${event.source} / ${event.title}: ${event.summary} Recommendation: ${event.recommendation}`,
    ),
  ].join("\n");
}

function escapeCsvCell(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
