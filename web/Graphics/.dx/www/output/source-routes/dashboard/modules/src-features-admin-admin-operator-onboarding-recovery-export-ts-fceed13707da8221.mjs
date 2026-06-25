
export const dxSourceText = "import type { AdminOperatorOnboardingRecoveryReport } from \"@/features/admin/admin-operator-onboarding-recovery\";\n\nexport function getAdminOperatorOnboardingRecoveryJson(\n  report: AdminOperatorOnboardingRecoveryReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminOperatorOnboardingRecoveryCsv(\n  report: AdminOperatorOnboardingRecoveryReport,\n) {\n  return [\n    [\n      \"playbook_id\",\n      \"track\",\n      \"playbook_status\",\n      \"step_id\",\n      \"step_status\",\n      \"owner\",\n      \"label\",\n      \"evidence\",\n      \"expected_result\",\n      \"command\",\n      \"latest_at\",\n    ].join(\",\"),\n    ...report.playbooks.flatMap((playbook) =>\n      playbook.steps.map((step) =>\n        [\n          playbook.id,\n          playbook.track,\n          playbook.status,\n          step.id,\n          step.status,\n          step.owner,\n          step.label,\n          redactOperatorOnboardingRecoveryText(step.evidence),\n          step.expectedResult,\n          step.command ?? \"\",\n          step.latestAt ?? \"\",\n        ]\n          .map(escapeCsvCell)\n          .join(\",\"),\n      ),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminOperatorOnboardingRecoveryMarkdown(\n  report: AdminOperatorOnboardingRecoveryReport,\n) {\n  return [\n    \"# Operator Onboarding And Recovery Playbooks\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Playbooks: ${report.readyPlaybookCount} ready, ${report.reviewPlaybookCount} review, ${report.blockedPlaybookCount} blocked`,\n    `Steps: ${report.readyStepCount} ready, ${report.reviewStepCount} review, ${report.blockedStepCount} blocked`,\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map(\n      (command) => `- \\`${redactOperatorOnboardingRecoveryText(command)}\\``,\n    ),\n    \"\",\n    \"## Playbooks\",\n    \"\",\n    ...report.playbooks.flatMap((playbook) => [\n      `### ${playbook.title}`,\n      \"\",\n      `- Track: ${playbook.track}`,\n      `- Status: ${playbook.status}`,\n      `- Owner: ${playbook.owner}`,\n      `- Objective: ${playbook.objective}`,\n      `- Handoff export: ${playbook.handoffExportId}`,\n      \"\",\n      ...playbook.steps.flatMap((step) => [\n        `#### ${step.label}`,\n        \"\",\n        `- Status: ${step.status}`,\n        `- Owner: ${step.owner}`,\n        `- Evidence: ${redactOperatorOnboardingRecoveryText(step.evidence)}`,\n        `- Expected result: ${step.expectedResult}`,\n        step.command\n          ? `- Command: \\`${redactOperatorOnboardingRecoveryText(step.command)}\\``\n          : \"- Command: none\",\n        \"\",\n      ]),\n    ]),\n    \"## Handoff Exports\",\n    \"\",\n    ...report.handoffExports.flatMap((handoff) => [\n      `- ${handoff.label} (${handoff.status})`,\n      `  - File: ${handoff.filename}`,\n      `  - Summary: ${handoff.summary}`,\n      `  - Command: ${handoff.command}`,\n    ]),\n  ].join(\"\\n\");\n}\n\nexport function redactOperatorOnboardingRecoveryText(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(\n      /\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi,\n      \"[redacted-token]\",\n    )\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string | number | boolean) {\n  const stringValue = String(value);\n\n  if (\n    stringValue.includes(\",\") ||\n    stringValue.includes('\"') ||\n    stringValue.includes(\"\\n\")\n  ) {\n    return `\"${stringValue.replaceAll('\"', '\"\"')}\"`;\n  }\n\n  return stringValue;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-operator-onboarding-recovery-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-onboarding-recovery-export-ts-fceed13707da8221.mjs",
  "kind": "ts",
  "hash": "fceed13707da8221",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-operator-onboarding-recovery-export.ts",
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
        "specifier": "@/features/admin/admin-operator-onboarding-recovery",
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
      "getAdminOperatorOnboardingRecoveryJson",
      "getAdminOperatorOnboardingRecoveryCsv",
      "getAdminOperatorOnboardingRecoveryMarkdown",
      "redactOperatorOnboardingRecoveryText"
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
