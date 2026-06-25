
export const dxSourceText = "import type { AdminEmbedSecurityReport } from \"@/features/admin/admin-embed-security\";\n\nexport function getAdminEmbedSecurityJson(report: AdminEmbedSecurityReport) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminEmbedSecurityCsv(report: AdminEmbedSecurityReport) {\n  const rows = [\n    [\n      \"target_id\",\n      \"status\",\n      \"file\",\n      \"owner\",\n      \"frame_policy\",\n      \"sandbox_preset\",\n      \"allowed_origins\",\n      \"observed_origins\",\n      \"blocked_origins\",\n      \"events\",\n      \"last_7d\",\n      \"latest_at\",\n      \"recommendation\",\n    ],\n    ...report.targets.map((target) => [\n      target.id,\n      target.status,\n      target.fileName,\n      target.ownerEmail,\n      target.framePolicy,\n      target.sandboxPreset,\n      target.allowedOrigins.join(\"; \"),\n      target.observedOrigins.join(\"; \"),\n      target.blockedObservedOrigins.join(\"; \"),\n      target.eventCount,\n      target.last7dCount,\n      target.latestAt ?? \"\",\n      target.recommendation,\n    ]),\n  ];\n\n  return rows\n    .map((row) => row.map((value) => csvEscape(String(value))).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminEmbedSecurityMarkdown(\n  report: AdminEmbedSecurityReport,\n) {\n  return [\n    \"# Embed Security\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    \"\",\n    \"## Metrics\",\n    \"\",\n    `- Embed shares: ${report.embedShareCount}`,\n    `- Configured allowlists: ${report.configuredAllowlistCount}`,\n    `- Allowlist policies: ${report.allowlistPolicyCount}`,\n    `- Self policies: ${report.selfPolicyCount}`,\n    `- Blocked observed origins: ${report.blockedObservedOriginCount}`,\n    `- Missing host evidence: ${report.missingHostEvidenceCount}`,\n    \"\",\n    \"## Review Queue\",\n    \"\",\n    ...report.rows.slice(0, 20).map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction csvEscape(value: string) {\n  if (!/[\",\\n]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-embed-security-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-embed-security-export-ts-eedf2fd421dba283.mjs",
  "kind": "ts",
  "hash": "eedf2fd421dba283",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-embed-security-export.ts",
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
        "specifier": "@/features/admin/admin-embed-security",
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
      "getAdminEmbedSecurityJson",
      "getAdminEmbedSecurityCsv",
      "getAdminEmbedSecurityMarkdown"
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
