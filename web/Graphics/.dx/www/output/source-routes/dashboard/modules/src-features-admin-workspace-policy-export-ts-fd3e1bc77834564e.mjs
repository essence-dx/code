
export const dxSourceText = "import type {\n  WorkspacePolicyFinding,\n  WorkspacePolicyReviewReport,\n} from \"@/features/admin/workspace-policy\";\n\nexport function createWorkspacePolicyJson(report: WorkspacePolicyReviewReport) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function createWorkspacePolicyCsv(report: WorkspacePolicyReviewReport) {\n  const rows = [\n    [\"Policy score\", String(report.score)],\n    [\"Policy status\", report.status],\n    [\"Active shares\", String(report.activeShareCount)],\n    [\"Download shares\", String(report.downloadShareCount)],\n    [\"Comment shares\", String(report.commentShareCount)],\n    [\"Expired shares\", String(report.expiredShareCount)],\n    [\"Stale sessions\", String(report.staleSessionCount)],\n    [\"Expired sessions\", String(report.expiredSessionCount)],\n    [],\n    [\"Finding\", \"Status\", \"Value\", \"Detail\"],\n    ...report.findings.map((finding) => [\n      finding.label,\n      finding.status,\n      finding.value,\n      finding.detail,\n    ]),\n  ];\n\n  return rows.map((row) => row.map(escapeCsvCell).join(\",\")).join(\"\\n\");\n}\n\nexport function createWorkspacePolicyMarkdown(\n  report: WorkspacePolicyReviewReport,\n) {\n  const lines = [\n    \"# Essence Workspace Policy Review\",\n    \"\",\n    `- Status: ${report.status}`,\n    `- Score: ${report.score}/100`,\n    `- Active shares: ${report.activeShareCount}`,\n    `- Download shares: ${report.downloadShareCount}`,\n    `- Comment shares: ${report.commentShareCount}`,\n    `- Expired shares: ${report.expiredShareCount}`,\n    `- Stale sessions: ${report.staleSessionCount}`,\n    `- Expired sessions: ${report.expiredSessionCount}`,\n    \"\",\n    \"## Findings\",\n    \"\",\n    ...report.findings.flatMap(formatFinding),\n  ];\n\n  return lines.join(\"\\n\");\n}\n\nfunction formatFinding(finding: WorkspacePolicyFinding) {\n  return [\n    `### ${finding.label}`,\n    \"\",\n    `- Status: ${finding.status}`,\n    `- Value: ${finding.value}`,\n    `- Detail: ${finding.detail}`,\n    \"\",\n  ];\n}\n\nfunction escapeCsvCell(value: string) {\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/workspace-policy-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-workspace-policy-export-ts-fd3e1bc77834564e.mjs",
  "kind": "ts",
  "hash": "fd3e1bc77834564e",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/workspace-policy-export.ts",
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
        "specifier": "@/features/admin/workspace-policy",
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
      "createWorkspacePolicyJson",
      "createWorkspacePolicyCsv",
      "createWorkspacePolicyMarkdown"
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
