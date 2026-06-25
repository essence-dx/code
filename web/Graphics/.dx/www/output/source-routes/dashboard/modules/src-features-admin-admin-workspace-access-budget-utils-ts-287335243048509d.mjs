
export const dxSourceText = "import type { AdminWorkspaceAccessBudgetStatus } from \"@/features/admin/admin-workspace-access-budget-types\";\n\nexport const accessBudgetStatusWeight: Record<\n  AdminWorkspaceAccessBudgetStatus,\n  number\n> = {\n  blocked: 0,\n  review: 1,\n  ready: 2,\n};\n\nexport function getEmailDomain(email: string) {\n  const [, domain = \"\"] = email.toLowerCase().trim().split(\"@\");\n\n  return domain;\n}\n\nexport function getLatestIso(left: string | null, right: string | null) {\n  if (!left) {\n    return right;\n  }\n\n  if (!right) {\n    return left;\n  }\n\n  return new Date(right).getTime() > new Date(left).getTime() ? right : left;\n}\n\nexport function getMostCommonDomain(emails: string[]) {\n  const counts = new Map<string, number>();\n\n  for (const email of emails) {\n    const domain = getEmailDomain(email);\n\n    if (domain) {\n      counts.set(domain, (counts.get(domain) ?? 0) + 1);\n    }\n  }\n\n  return [...counts.entries()].sort(\n    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),\n  )[0]?.[0];\n}\n\nexport function isElevatedRole(role: string) {\n  return role === \"editor\" || role === \"commenter\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-access-budget-utils.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-access-budget-utils-ts-287335243048509d.mjs",
  "kind": "ts",
  "hash": "287335243048509d",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-workspace-access-budget-utils.ts",
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
        "specifier": "@/features/admin/admin-workspace-access-budget-types",
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
      "getEmailDomain",
      "getLatestIso",
      "getMostCommonDomain",
      "isElevatedRole",
      "accessBudgetStatusWeight"
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
