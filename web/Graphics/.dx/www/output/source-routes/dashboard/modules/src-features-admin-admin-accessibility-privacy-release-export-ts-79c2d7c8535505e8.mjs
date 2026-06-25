
export const dxSourceText = "import type { AccessibilityPrivacyReleaseChecklist } from \"@/features/admin/admin-accessibility-privacy-release\";\n\nexport function getAccessibilityPrivacyReleaseJson(\n  report: AccessibilityPrivacyReleaseChecklist,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAccessibilityPrivacyReleaseCsv(\n  report: AccessibilityPrivacyReleaseChecklist,\n) {\n  return [\n    [\n      \"id\",\n      \"surface\",\n      \"status\",\n      \"label\",\n      \"value\",\n      \"evidence_count\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.surface,\n        row.status,\n        row.label,\n        row.value,\n        row.evidenceCount,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"status\",\n      \"score\",\n      \"documents\",\n      \"checked_layers\",\n      \"text_layers\",\n      \"interactive_layers\",\n      \"high_accessibility_issues\",\n      \"medium_accessibility_issues\",\n      \"low_accessibility_issues\",\n      \"prototype_issues\",\n      \"prototype_broken\",\n      \"privacy_reviews\",\n    ].join(\",\"),\n    [\n      report.status,\n      report.score,\n      report.documentCount,\n      report.checkedLayerCount,\n      report.textLayerCount,\n      report.interactiveLayerCount,\n      report.highAccessibilityIssueCount,\n      report.mediumAccessibilityIssueCount,\n      report.lowAccessibilityIssueCount,\n      report.prototypeIssueCount,\n      report.prototypeBrokenCount,\n      report.privacyReviewCount,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n  ].join(\"\\n\");\n}\n\nexport function getAccessibilityPrivacyReleaseMarkdown(\n  report: AccessibilityPrivacyReleaseChecklist,\n) {\n  return [\n    \"# Accessibility And Privacy Release Checklist\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Documents reviewed: ${report.documentCount}`,\n    `- Checked layers: ${report.checkedLayerCount}`,\n    `- Text layers: ${report.textLayerCount}`,\n    `- Interactive layers: ${report.interactiveLayerCount}`,\n    `- High accessibility issues: ${report.highAccessibilityIssueCount}`,\n    `- Medium accessibility issues: ${report.mediumAccessibilityIssueCount}`,\n    `- Low accessibility issues: ${report.lowAccessibilityIssueCount}`,\n    `- Prototype issues: ${report.prototypeIssueCount}`,\n    `- Broken prototype targets: ${report.prototypeBrokenCount}`,\n    `- Privacy review rows: ${report.privacyReviewCount}`,\n    \"\",\n    \"## Checklist\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.surface} / ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-accessibility-privacy-release-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-accessibility-privacy-release-export-ts-79c2d7c8535505e8.mjs",
  "kind": "ts",
  "hash": "79c2d7c8535505e8",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-accessibility-privacy-release-export.ts",
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
        "specifier": "@/features/admin/admin-accessibility-privacy-release",
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
      "getAccessibilityPrivacyReleaseJson",
      "getAccessibilityPrivacyReleaseCsv",
      "getAccessibilityPrivacyReleaseMarkdown"
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
