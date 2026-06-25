
export const dxSourceText = "import type { AdminReleaseIncidentTimelineReport } from \"@/features/admin/admin-release-incident-timeline\";\n\nexport function getAdminReleaseIncidentTimelineJson(\n  report: AdminReleaseIncidentTimelineReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminReleaseIncidentTimelineCsv(\n  report: AdminReleaseIncidentTimelineReport,\n) {\n  return [\n    [\n      \"id\",\n      \"source\",\n      \"status\",\n      \"severity\",\n      \"occurred_at\",\n      \"title\",\n      \"actor\",\n      \"target\",\n      \"summary\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.timeline.map((event) =>\n      [\n        event.id,\n        event.source,\n        event.status,\n        event.severity,\n        event.occurredAt,\n        event.title,\n        event.actor,\n        event.target,\n        event.summary,\n        event.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"id\",\n      \"status\",\n      \"label\",\n      \"value\",\n      \"event_count\",\n      \"sources\",\n      \"latest_at\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.correlations.map((correlation) =>\n      [\n        correlation.id,\n        correlation.status,\n        correlation.label,\n        correlation.value,\n        correlation.eventCount,\n        correlation.sources.join(\"; \"),\n        correlation.latestAt,\n        correlation.detail,\n        correlation.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminReleaseIncidentTimelineMarkdown(\n  report: AdminReleaseIncidentTimelineReport,\n) {\n  return [\n    \"# Release Incident Timeline\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Events: ${report.eventCount}`,\n    `Blocked events: ${report.blockedEventCount}`,\n    `Review events: ${report.reviewEventCount}`,\n    \"\",\n    \"## Sources\",\n    \"\",\n    `- Deploy checks: ${report.deployEventCount}`,\n    `- Audit events: ${report.auditEventCount}`,\n    `- Notifications: ${report.notificationEventCount}`,\n    `- Runtime observations: ${report.runtimeEventCount}`,\n    `- Rollback evidence: ${report.rollbackEventCount}`,\n    `- Manifest evidence: ${report.manifestEventCount}`,\n    \"\",\n    \"## Correlations\",\n    \"\",\n    ...report.correlations.map(\n      (correlation) =>\n        `- [${correlation.status}] ${correlation.label} (${correlation.value}): ${correlation.detail} Recommendation: ${correlation.recommendation}`,\n    ),\n    \"\",\n    \"## Timeline\",\n    \"\",\n    ...report.timeline.map(\n      (event) =>\n        `- [${event.status}] ${event.occurredAt} ${event.source} / ${event.title}: ${event.summary} Recommendation: ${event.recommendation}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-incident-timeline-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-incident-timeline-export-ts-806ed7cd6d953764.mjs",
  "kind": "ts",
  "hash": "806ed7cd6d953764",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-incident-timeline-export.ts",
    "source_kind": "ts",
    "parser_backend": "oxc-parser",
    "diagnostics": 0,
    "compatibility_reference": {
      "upstream_crates": [
        "turbopack-ecmascript"
      ],
      "reference_only": true,
      "runtime_build_adoption": false,
      "public_runtime_dependency": false,
      "vendor_root": "vendor/next-rust",
      "vendor_commit": "f3f56ecec2f3f8cefa0f0a1323ea406740251d5c",
      "next_transform_references": [
        "next-custom-transforms::track_dynamic_imports",
        "next-custom-transforms::react_server_components"
      ],
      "copied_code": false
    },
    "output_model": {
      "contract": "dx.www.moduleGraph",
      "compiler_owns_output": true,
      "public_architecture": "DX-owned source graph analysis"
    },
    "runtime_boundaries": {
      "next_runtime_required": false,
      "react_runtime_required": false,
      "rsc_required": false,
      "node_modules_required": false
    },
    "directives": [],
    "static_imports": [
      {
        "specifier": "@/features/admin/admin-release-incident-timeline",
        "side_effect_only": false,
        "type_only": true
      }
    ],
    "dynamic_imports": [],
    "unresolved_dynamic_imports": [],
    "unsupported_dynamic_imports": [],
    "dynamic_import_analysis": {
      "status": "none-observed",
      "static_count": 0,
      "unresolved_count": 0,
      "unsupported_count": 0,
      "boundary": "source-owned dynamic import analysis; static specifiers become evidence, expressions remain unresolved, and unsupported call forms stay as adapter-boundary receipts"
    },
    "export_names": [
      "getAdminReleaseIncidentTimelineJson",
      "getAdminReleaseIncidentTimelineCsv",
      "getAdminReleaseIncidentTimelineMarkdown"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: false,
  transformKind: "metadata-only",
  exportNames: []
});
export const dxRuntimeExports = Object.freeze({});
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
