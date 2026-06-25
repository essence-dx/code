
export const dxSourceText = "import { Buffer } from \"node:buffer\";\nimport type { AdminWorkspaceOperationsStatus } from \"@/features/admin/admin-workspace-operations-types\";\n\nexport const DEFAULT_WORKSPACE_OPERATIONS_STORAGE_BUDGET_BYTES =\n  100 * 1024 * 1024;\nexport const DEPLOY_SMOKE_REVIEW_HOURS = 72;\nexport const DEPLOY_SMOKE_BLOCKED_HOURS = 168;\n\nexport function getDocumentByteSize(document: unknown) {\n  try {\n    return Buffer.byteLength(JSON.stringify(document), \"utf8\");\n  } catch {\n    return 0;\n  }\n}\n\nexport function getAgeHours(value: string, now: number) {\n  const timestamp = new Date(value).getTime();\n\n  if (!Number.isFinite(timestamp)) {\n    return null;\n  }\n\n  return Math.max(0, (now - timestamp) / (1000 * 60 * 60));\n}\n\nexport function getLatestDate(values: string[]) {\n  return values\n    .map((value) => {\n      const timestamp = new Date(value).getTime();\n      return Number.isFinite(timestamp) ? { value, timestamp } : null;\n    })\n    .filter((value): value is { value: string; timestamp: number } =>\n      Boolean(value),\n    )\n    .sort((left, right) => right.timestamp - left.timestamp)[0]?.value ?? null;\n}\n\nexport function isRecent(value: string, now: number, days: number) {\n  const timestamp = new Date(value).getTime();\n  return (\n    Number.isFinite(timestamp) && now - timestamp <= days * 24 * 60 * 60 * 1000\n  );\n}\n\nexport function getWorstStatus(\n  statuses: AdminWorkspaceOperationsStatus[],\n  fallback: AdminWorkspaceOperationsStatus,\n) {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  if (statuses.includes(\"review\")) {\n    return \"review\";\n  }\n\n  return statuses.length > 0 ? \"ready\" : fallback;\n}\n\nexport function uniqueStrings(values: string[]) {\n  return [...new Set(values.filter(Boolean))];\n}\n\nexport function formatWorkspaceOperationsBytes(bytes: number) {\n  if (bytes >= 1024 * 1024) {\n    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;\n  }\n\n  if (bytes >= 1024) {\n    return `${(bytes / 1024).toFixed(1)} KB`;\n  }\n\n  return `${bytes} B`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-operations-utils.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-operations-utils-ts-d690ef4b2a2e106a.mjs",
  "kind": "ts",
  "hash": "d690ef4b2a2e106a",
  "dependencies": [
    {
      "specifier": "node:buffer",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
      "node_modules_required": false
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-workspace-operations-utils.ts",
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
        "specifier": "node:buffer",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-workspace-operations-types",
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
      "getDocumentByteSize",
      "getAgeHours",
      "getLatestDate",
      "isRecent",
      "getWorstStatus",
      "uniqueStrings",
      "formatWorkspaceOperationsBytes",
      "DEFAULT_WORKSPACE_OPERATIONS_STORAGE_BUDGET_BYTES",
      "DEPLOY_SMOKE_REVIEW_HOURS",
      "DEPLOY_SMOKE_BLOCKED_HOURS"
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
