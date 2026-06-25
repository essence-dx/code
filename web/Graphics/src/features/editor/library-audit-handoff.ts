import { getComponentDependencyGraphMermaid } from "@/features/editor/component-dependency-review";
import type { LibraryReleaseArchive } from "@/features/editor/library-release-archive";

export function getLibraryAuditHandoffMarkdown(
  archive: LibraryReleaseArchive,
) {
  const dependencyGraph = getComponentDependencyGraphMermaid(
    archive.reports.dependency,
  );
  const readinessItems = archive.reports.publishReadiness.items.map(
    (item) => `- ${item.label}: ${item.status} - ${item.detail}`,
  );
  const riskItems = archive.reports.publishRisk.items.map(
    (item) =>
      `- ${item.label}: ${item.severity} - ${item.detail} (impact ${item.impact})`,
  );
  const approvalRows = archive.reports.releaseApproval?.items.map(
    (item) =>
      `- ${item.label}: ${
        item.acknowledged ? "acknowledged" : "open"
      } - ${item.detail}${item.note?.trim() ? ` / note: ${item.note}` : ""}`,
  );
  const approval = archive.reports.releaseApproval;
  const governanceRows = [
    `- Release: ${archive.library.name} v${archive.library.targetVersion}`,
    `- Readiness: ${archive.reports.publishReadiness.label} (${archive.reports.publishReadiness.score}/100)`,
    `- Risk: ${archive.reports.publishRisk.label} (${archive.reports.publishRisk.score}/100)`,
    `- Approval: ${approval ? `${approval.acknowledgedCount}/${approval.itemCount} acknowledged, ${approval.outstandingCount} open` : "No approval report exported"}`,
    `- Integrity: ${archive.integrity.payloadHash} (${archive.integrity.algorithm})`,
    `- Evidence rows: ${archive.integrity.reportRowCount}`,
  ];
  const driftRows = archive.reports.tokenDrift.rows.slice(0, 12).map((row) => {
    const variable = row.variableName
      ? `${row.variableName}: ${row.variableValue}`
      : "no matching variable";

    return `- ${row.category} / ${row.styleName} / ${row.property}: ${row.styleValue} -> ${variable}. ${row.suggestion}`;
  });
  const dependencyRows = archive.reports.dependency.rows
    .filter((row) => row.status !== "ready")
    .slice(0, 12)
    .map(
      (row) =>
        `- ${row.componentName} -> ${row.dependencyName}: ${row.status} - ${row.detail}`,
    );
  const dependencyImpactRows = archive.reports.dependency.impactSummaries
    .slice(0, 8)
    .map(
      (summary) =>
        `- ${summary.componentName}: impact ${summary.riskScore}, depends on ${summary.dependsOnCount}, used by ${summary.usedByCount}, issues ${summary.issueCount}`,
    );
  const variableCoverageRows = archive.reports.variableCoverage.rows
    .filter((row) => row.status !== "ready")
    .slice(0, 12)
    .map(
      (row) =>
        `- ${row.componentName}: ${row.coveragePercent}% coverage, ${row.boundPropertyCount}/${row.bindablePropertyCount} bound. ${row.detail}`,
    );

  return [
    `# ${archive.releaseNotes.title} Audit Handoff`,
    "",
    `Exported: ${archive.exportedAt}`,
    `Team: ${archive.library.teamName}`,
    `Readiness: ${archive.reports.publishReadiness.label} (${archive.reports.publishReadiness.score}/100)`,
    `Risk: ${archive.reports.publishRisk.label} (${archive.reports.publishRisk.score}/100)`,
    `Integrity: ${archive.integrity.payloadHash} (${archive.integrity.algorithm})`,
    "",
    "## Release Notes",
    archive.releaseNotes.notes,
    "",
    "## Publish Readiness",
    ...readinessItems,
    "",
    "## Publish Risk",
    ...riskItems,
    "",
    "## Governance Handoff",
    ...governanceRows,
    "",
    "## Release Approval",
    ...(approvalRows && approvalRows.length > 0
      ? approvalRows
      : ["- No release approval items required."]),
    "",
    "## Archive Integrity",
    `- Algorithm: ${archive.integrity.algorithm}`,
    `- Payload hash: ${archive.integrity.payloadHash}`,
    `- Payload length: ${archive.integrity.payloadLength}`,
    `- Components: ${archive.integrity.componentCount}`,
    `- Report rows: ${archive.integrity.reportRowCount}`,
    "",
    "## Dependency Graph",
    "```mermaid",
    dependencyGraph,
    "```",
    "",
    "## Dependency Impact",
    ...(dependencyImpactRows.length > 0
      ? dependencyImpactRows
      : ["- No component dependency impact detected."]),
    "",
    "## Dependency Issues",
    ...(dependencyRows.length > 0
      ? dependencyRows
      : ["- No dependency issues found."]),
    "",
    "## Token Drift",
    ...(driftRows.length > 0 ? driftRows : ["- No token drift found."]),
    "",
    "## Component Variable Coverage",
    `- Overall: ${archive.reports.variableCoverage.coveragePercent}%`,
    `- Bound properties: ${archive.reports.variableCoverage.boundPropertyCount}/${archive.reports.variableCoverage.bindablePropertyCount}`,
    `- Matching raw properties: ${archive.reports.variableCoverage.matchingRawPropertyCount}`,
    ...(variableCoverageRows.length > 0
      ? variableCoverageRows
      : ["- Component sources meet the current variable coverage goal."]),
  ].join("\n");
}
