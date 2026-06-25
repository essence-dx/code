import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-auth-auth-panel-tsx-aa373267e6eaf065.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-data-ts-9e629658d07b3486.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-components-admin-dashboard-tsx-d0089ef0a2fef072.mjs";
export const dxSourceText = "import Link from \"next/link\";\nimport { AuthPanel } from \"@/components/auth/auth-panel\";\nimport { Button } from \"@/components/ui/button\";\nimport { Card, CardContent, CardHeader, CardTitle } from \"@/components/ui/card\";\nimport { AdminDashboard } from \"@/features/admin/components/admin-dashboard\";\nimport { getAdminDashboardData } from \"@/features/admin/admin-data\";\n\nexport default async function DashboardPage() {\n  const dashboard = await getAdminDashboardData();\n\n  if (!dashboard.authorized && !dashboard.currentUser) {\n    return <AuthPanel />;\n  }\n\n  if (!dashboard.authorized) {\n    return (\n      <main className=\"grid min-h-screen place-items-center bg-background px-4 text-foreground\">\n        <Card className=\"w-full max-w-md\">\n          <CardHeader>\n            <CardTitle>Admin access required</CardTitle>\n          </CardHeader>\n          <CardContent className=\"space-y-4\">\n            <p className=\"text-sm text-muted-foreground\">{dashboard.reason}</p>\n            <Button asChild>\n              <Link href=\"/\">Back to editor</Link>\n            </Button>\n          </CardContent>\n        </Card>\n      </main>\n    );\n  }\n\n  return <AdminDashboard data={dashboard} />;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/app/dashboard/page.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-app-dashboard-page-tsx-0e48b2dcf9b1bdc3.mjs",
  "kind": "tsx",
  "hash": "0e48b2dcf9b1bdc3",
  "dependencies": [
    {
      "specifier": "@/components/auth/auth-panel",
      "resolved_path": "src/components/auth/auth-panel.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-auth-auth-panel-tsx-aa373267e6eaf065.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/card",
      "resolved_path": "src/components/ui/card.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-card-tsx-62d56c5e9cb9789f.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-data",
      "resolved_path": "src/features/admin/admin-data.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-data-ts-9e629658d07b3486.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/components/admin-dashboard",
      "resolved_path": "src/features/admin/components/admin-dashboard.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-dashboard-tsx-d0089ef0a2fef072.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/link",
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
    "source_path": "src/app/dashboard/page.tsx",
    "source_kind": "tsx",
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
        "specifier": "next/link",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/auth/auth-panel",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/card",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/components/admin-dashboard",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-data",
        "side_effect_only": false,
        "type_only": false
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
    "export_names": [],
    "jsx": true,
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4]);
export default dxSourceModule;
