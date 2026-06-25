
export const dxSourceText = "  | \"visual-snapshot\"\n  | \"route-probe\"\n  | \"release-review\"\n  | \"manual\";\n\n\n\n  capturedAt: string;\n};\n\n\n\n\nexport function getRuntimeObservabilityReport({\n  issues = [],\n  captured = true,\n}){\n  const normalizedIssues = issues.map(normalizeRuntimeIssue);\n  const errorIssues = normalizedIssues.filter(\n    (issue) => issue.severity === \"error\",\n  );\n  const warningIssues = normalizedIssues.filter(\n    (issue) => issue.severity === \"warning\",\n  );\n  const infoIssues = normalizedIssues.filter(\n    (issue) => issue.severity === \"info\",\n  );\n  const rows: RuntimeObservabilityRow[] = [\n    ...getMissingCaptureRows(captured),\n    ...getErrorRows(errorIssues),\n    ...getWarningRows(warningIssues),\n  ];\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const score = Math.max(0, 100 - blockedCount * 28 - reviewCount * 8);\n\n  return {\n    captured,\n    status:\n      blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score,\n    issueCount: normalizedIssues.length,\n    errorCount: errorIssues.length,\n    warningCount: warningIssues.length,\n    infoCount: infoIssues.length,\n    blockedCount,\n    reviewCount,\n    readyCount,\n    rows:\n      rows.length > 0\n        ? rows\n        : [\n            {\n              id: \"runtime-observability-ready\",\n              status: \"ready\",\n              label: \"Runtime evidence clean\",\n              detail:\n                \"No console errors, page errors, or warning-level runtime signals were captured.\",\n              issueIds: [],\n              metric: score,\n              recommendation:\n                \"Attach this runtime evidence to visual QA and release-review exports.\",\n            } satisfies RuntimeObservabilityRow,\n          ],\n    issues: normalizedIssues,\n  };\n}\n\nexport function getRuntimeObservabilityMarkdown(\n  report,\n) {\n  return [\n    \"# Runtime Observability\",\n    \"\",\n    `Captured: ${report.captured ? \"yes\" : \"no\"}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Issues: ${report.issueCount}`,\n    `Errors: ${report.errorCount}`,\n    `Warnings: ${report.warningCount}`,\n    `Info: ${report.infoCount}`,\n    \"\",\n    \"## Review Queue\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Captured Issues\",\n    ...(report.issues.length > 0\n      ? report.issues.map(\n          (issue) =>\n            `- [${issue.severity}] ${issue.surfaceLabel} ${issue.kind}: ${issue.message}`,\n        )\n      : [\"- No runtime issues captured.\"]),\n  ].join(\"\\n\");\n}\n\nfunction normalizeRuntimeIssue(issue: RuntimeIssue): RuntimeIssue {\n  return {\n    ...issue,\n    message: issue.message.trim() || \"Runtime issue captured without message.\",\n    url: issue.url || \"unknown\",\n  };\n}\n\nfunction getMissingCaptureRows(captured: boolean) {\n  if (captured) {\n    return [];\n  }\n\n  return [\n    {\n      id: \"runtime-capture-missing\",\n      status: \"review\",\n      label: \"Runtime evidence missing\",\n      detail:\n        \"No browser runtime capture was attached to this release-review export.\",\n      issueIds: [],\n      metric: 1,\n      recommendation:\n        \"Run visual route probes or snapshot capture with runtime issue output before release approval.\",\n    } satisfies RuntimeObservabilityRow,\n  ];\n}\n\nfunction getErrorRows(issues: RuntimeIssue[]) {\n  if (issues.length === 0) {\n    return [];\n  }\n\n  return [\n    {\n      id: \"runtime-errors\",\n      status: \"blocked\",\n      label: \"Runtime errors\",\n      detail: `${issues.length} console or page error${issues.length === 1 ? \"\" : \"s\"} were captured.`,\n      issueIds: issues.map((issue) => issue.id),\n      metric: issues.length,\n      recommendation:\n        \"Fix runtime errors before updating visual QA baselines or approving release handoff.\",\n    } satisfies RuntimeObservabilityRow,\n  ];\n}\n\nfunction getWarningRows(issues: RuntimeIssue[]) {\n  if (issues.length === 0) {\n    return [];\n  }\n\n  return [\n    {\n      id: \"runtime-warnings\",\n      status: \"review\",\n      label: \"Runtime warnings\",\n      detail: `${issues.length} warning-level console signal${issues.length === 1 ? \"\" : \"s\"} were captured.`,\n      issueIds: issues.map((issue) => issue.id),\n      metric: issues.length,\n      recommendation:\n        \"Review warning-level runtime signals before marking visual QA as clean.\",\n    } satisfies RuntimeObservabilityRow,\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/runtime-observability.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-runtime-observability-ts-358aa81f0970aab3.mjs",
  "kind": "ts",
  "hash": "358aa81f0970aab3",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "getRuntimeObservabilityReport",
    "getRuntimeObservabilityMarkdown"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/runtime-observability.ts",
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
    "static_imports": [],
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
      "getRuntimeObservabilityReport",
      "getRuntimeObservabilityMarkdown"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: true,
  transformKind: "typescript-helper-runtime",
  exportNames: ["getRuntimeObservabilityReport","getRuntimeObservabilityMarkdown"]
});
  | "visual-snapshot"
  | "route-probe"
  | "release-review"
  | "manual";



  capturedAt: string;
};




export function getRuntimeObservabilityReport({
  issues = [],
  captured = true,
}){
  const normalizedIssues = issues.map(normalizeRuntimeIssue);
  const errorIssues = normalizedIssues.filter(
    (issue) => issue.severity === "error",
  );
  const warningIssues = normalizedIssues.filter(
    (issue) => issue.severity === "warning",
  );
  const infoIssues = normalizedIssues.filter(
    (issue) => issue.severity === "info",
  );
  const rows: RuntimeObservabilityRow[] = [
    ...getMissingCaptureRows(captured),
    ...getErrorRows(errorIssues),
    ...getWarningRows(warningIssues),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 28 - reviewCount * 8);

  return {
    captured,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    issueCount: normalizedIssues.length,
    errorCount: errorIssues.length,
    warningCount: warningIssues.length,
    infoCount: infoIssues.length,
    blockedCount,
    reviewCount,
    readyCount,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "runtime-observability-ready",
              status: "ready",
              label: "Runtime evidence clean",
              detail:
                "No console errors, page errors, or warning-level runtime signals were captured.",
              issueIds: [],
              metric: score,
              recommendation:
                "Attach this runtime evidence to visual QA and release-review exports.",
            } satisfies RuntimeObservabilityRow,
          ],
    issues: normalizedIssues,
  };
}

export function getRuntimeObservabilityMarkdown(
  report,
) {
  return [
    "# Runtime Observability",
    "",
    `Captured: ${report.captured ? "yes" : "no"}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Issues: ${report.issueCount}`,
    `Errors: ${report.errorCount}`,
    `Warnings: ${report.warningCount}`,
    `Info: ${report.infoCount}`,
    "",
    "## Review Queue",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Captured Issues",
    ...(report.issues.length > 0
      ? report.issues.map(
          (issue) =>
            `- [${issue.severity}] ${issue.surfaceLabel} ${issue.kind}: ${issue.message}`,
        )
      : ["- No runtime issues captured."]),
  ].join("\n");
}

function normalizeRuntimeIssue(issue: RuntimeIssue): RuntimeIssue {
  return {
    ...issue,
    message: issue.message.trim() || "Runtime issue captured without message.",
    url: issue.url || "unknown",
  };
}

function getMissingCaptureRows(captured: boolean) {
  if (captured) {
    return [];
  }

  return [
    {
      id: "runtime-capture-missing",
      status: "review",
      label: "Runtime evidence missing",
      detail:
        "No browser runtime capture was attached to this release-review export.",
      issueIds: [],
      metric: 1,
      recommendation:
        "Run visual route probes or snapshot capture with runtime issue output before release approval.",
    } satisfies RuntimeObservabilityRow,
  ];
}

function getErrorRows(issues: RuntimeIssue[]) {
  if (issues.length === 0) {
    return [];
  }

  return [
    {
      id: "runtime-errors",
      status: "blocked",
      label: "Runtime errors",
      detail: `${issues.length} console or page error${issues.length === 1 ? "" : "s"} were captured.`,
      issueIds: issues.map((issue) => issue.id),
      metric: issues.length,
      recommendation:
        "Fix runtime errors before updating visual QA baselines or approving release handoff.",
    } satisfies RuntimeObservabilityRow,
  ];
}

function getWarningRows(issues: RuntimeIssue[]) {
  if (issues.length === 0) {
    return [];
  }

  return [
    {
      id: "runtime-warnings",
      status: "review",
      label: "Runtime warnings",
      detail: `${issues.length} warning-level console signal${issues.length === 1 ? "" : "s"} were captured.`,
      issueIds: issues.map((issue) => issue.id),
      metric: issues.length,
      recommendation:
        "Review warning-level runtime signals before marking visual QA as clean.",
    } satisfies RuntimeObservabilityRow,
  ];
}
export const dxRuntimeExports = Object.freeze({ getRuntimeObservabilityReport, getRuntimeObservabilityMarkdown });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
