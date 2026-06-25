
export const dxSourceText = "import type {\n  AdminCollaborationEventIngestionReport,\n  AdminCollaborationEventRecord,\n  AdminCollaborationIncidentRow,\n  AdminCollaborationReplayWindow,\n} from \"@/features/admin/admin-collaboration-event-ingestion\";\n\nexport function getAdminCollaborationEventIngestionJson(\n  report: AdminCollaborationEventIngestionReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminCollaborationEventIngestionCsv(\n  report: AdminCollaborationEventIngestionReport,\n) {\n  const incidentHeader: Array<keyof AdminCollaborationIncidentRow> = [\n    \"id\",\n    \"fileId\",\n    \"fileName\",\n    \"status\",\n    \"category\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"latestAt\",\n  ];\n  const windowHeader: Array<keyof AdminCollaborationReplayWindow> = [\n    \"fileId\",\n    \"fileName\",\n    \"ownerEmail\",\n    \"status\",\n    \"firstEventAt\",\n    \"latestEventAt\",\n    \"retentionExpiresAt\",\n    \"eventCount\",\n    \"chatCount\",\n    \"presenceCount\",\n    \"activityCount\",\n    \"roomActionCount\",\n    \"purgeCandidate\",\n    \"recommendation\",\n  ];\n  const eventHeader: Array<keyof AdminCollaborationEventRecord> = [\n    \"id\",\n    \"fileId\",\n    \"fileName\",\n    \"kind\",\n    \"signal\",\n    \"actorRef\",\n    \"privacy\",\n    \"detail\",\n    \"createdAt\",\n    \"retentionExpiresAt\",\n  ];\n\n  return [\n    [\"section\", ...incidentHeader],\n    ...report.incidents.map((row) => [\"incident\", ...incidentHeader.map((key) => row[key])]),\n    [],\n    [\"section\", ...windowHeader],\n    ...report.replayWindows.map((row) => [\"replay-window\", ...windowHeader.map((key) => row[key])]),\n    [],\n    [\"section\", ...eventHeader],\n    ...report.recentEvents.map((row) => [\"event\", ...eventHeader.map((key) => row[key])]),\n  ]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminCollaborationEventIngestionMarkdown(\n  report: AdminCollaborationEventIngestionReport,\n) {\n  return [\n    \"# Collaboration Event Ingestion\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Retention: ${report.retentionDays} days`,\n    `Replay window: ${report.replayWindowDays} days`,\n    `Durable events: ${report.durableEventCount}`,\n    `Redacted events: ${report.redactedEventCount}`,\n    `Purge candidates: ${report.purgeCandidateCount}`,\n    `Latest purge: ${report.latestPurgeAt ?? \"none\"}`,\n    \"\",\n    \"## Incidents\",\n    \"\",\n    ...report.incidents.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - File: ${row.fileName}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Replay Windows\",\n    \"\",\n    ...report.replayWindows.slice(0, 20).map((window) =>\n      [\n        `- [${window.status}] ${window.fileName}`,\n        `  - Events: ${window.eventCount}`,\n        `  - Latest: ${window.latestEventAt ?? \"none\"}`,\n        `  - Retention expires: ${window.retentionExpiresAt ?? \"none\"}`,\n        `  - Purge candidate: ${window.purgeCandidate ? \"yes\" : \"no\"}`,\n        `  - Recommendation: ${window.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-event-ingestion-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-event-ingestion-export-ts-506603c07997fb6f.mjs",
  "kind": "ts",
  "hash": "506603c07997fb6f",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-collaboration-event-ingestion-export.ts",
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
        "specifier": "@/features/admin/admin-collaboration-event-ingestion",
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
      "getAdminCollaborationEventIngestionJson",
      "getAdminCollaborationEventIngestionCsv",
      "getAdminCollaborationEventIngestionMarkdown"
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
