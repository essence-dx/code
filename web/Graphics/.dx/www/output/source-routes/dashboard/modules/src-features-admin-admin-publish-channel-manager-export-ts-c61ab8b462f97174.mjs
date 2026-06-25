
export const dxSourceText = "import type {\n  AdminPublishChannelManagerReport,\n  AdminPublishChannelRow,\n} from \"@/features/admin/admin-publish-channel-manager-types\";\n\nexport function getAdminPublishChannelManagerJson(\n  report: AdminPublishChannelManagerReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminPublishChannelManagerCsv(\n  report: AdminPublishChannelManagerReport,\n) {\n  const header: Array<keyof AdminPublishChannelRow> = [\n    \"id\",\n    \"channelId\",\n    \"kind\",\n    \"status\",\n    \"category\",\n    \"label\",\n    \"targetUrl\",\n    \"detail\",\n    \"recommendation\",\n    \"latestAt\",\n  ];\n\n  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminPublishChannelManagerMarkdown(\n  report: AdminPublishChannelManagerReport,\n) {\n  return [\n    \"# Publish Channel Manager\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Channels: ${report.channelCount}`,\n    `Prototype: ${report.prototypeChannelCount}`,\n    `Share: ${report.shareChannelCount}`,\n    `Site-style: ${report.siteChannelCount}`,\n    `Release: ${report.releaseChannelCount}`,\n    `Stale: ${report.staleChannelCount}`,\n    `Approvals ready: ${report.approvalReadyCount}`,\n    `Rollback linked: ${report.rollbackLinkedCount}`,\n    `Smoke blocked: ${report.routeSmokeBlockedCount}`,\n    \"\",\n    \"## Channels\",\n    \"\",\n    ...report.channels.map((channel) =>\n      [\n        `- [${channel.status}] ${channel.label} (${channel.kind})`,\n        `  - Target: ${channel.targetUrl}`,\n        `  - Smoke: ${channel.routeSmokeStatus} (${channel.routeSmokeLabel})`,\n        `  - Approval: ${channel.approvalState}`,\n        `  - Rollback: ${channel.rollbackState}`,\n        `  - Blockers: ${channel.blockers.length > 0 ? channel.blockers.join(\"; \") : \"none\"}`,\n        `  - Warnings: ${channel.warnings.length > 0 ? channel.warnings.join(\"; \") : \"none\"}`,\n        `  - Recommendation: ${channel.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-publish-channel-manager-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-publish-channel-manager-export-ts-c61ab8b462f97174.mjs",
  "kind": "ts",
  "hash": "c61ab8b462f97174",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-publish-channel-manager-export.ts",
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
        "specifier": "@/features/admin/admin-publish-channel-manager-types",
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
      "getAdminPublishChannelManagerJson",
      "getAdminPublishChannelManagerCsv",
      "getAdminPublishChannelManagerMarkdown"
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
