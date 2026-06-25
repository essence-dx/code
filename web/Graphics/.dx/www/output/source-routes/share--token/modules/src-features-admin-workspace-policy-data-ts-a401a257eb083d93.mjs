import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-db-schema-ts-24b183fcc50e5ffb.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-workspace-policy-ts-1328e128ed00d73c.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs";
export const dxSourceText = "import { desc, eq } from \"drizzle-orm\";\nimport { adminAuditEvent } from \"@/db/schema\";\nimport type { getDb } from \"@/db/client\";\nimport {\n  WORKSPACE_POLICY_ACTION,\n  getWorkspacePolicySettingsFromEvents,\n  type WorkspacePolicySettings,\n} from \"@/features/admin/workspace-policy\";\n\nexport async function getWorkspacePolicySettingsFromDb(\n  db: ReturnType<typeof getDb>,\n): Promise<WorkspacePolicySettings> {\n  const rows = await db\n    .select({\n      action: adminAuditEvent.action,\n      actorEmail: adminAuditEvent.actorEmail,\n      metadata: adminAuditEvent.metadata,\n      createdAt: adminAuditEvent.createdAt,\n    })\n    .from(adminAuditEvent)\n    .where(eq(adminAuditEvent.action, WORKSPACE_POLICY_ACTION))\n    .orderBy(desc(adminAuditEvent.createdAt))\n    .limit(1);\n\n  return getWorkspacePolicySettingsFromEvents(rows);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/workspace-policy-data.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-admin-workspace-policy-data-ts-a401a257eb083d93.mjs",
  "kind": "ts",
  "hash": "a401a257eb083d93",
  "dependencies": [
    {
      "specifier": "@/db/schema",
      "resolved_path": "src/db/schema.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-db-schema-ts-24b183fcc50e5ffb.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/workspace-policy",
      "resolved_path": "src/features/admin/workspace-policy.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-admin-workspace-policy-ts-1328e128ed00d73c.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "drizzle-orm",
      "resolved_path": "src/lib/forge/db/drizzle-orm.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
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
    "source_path": "src/features/admin/workspace-policy-data.ts",
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
        "specifier": "drizzle-orm",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/db/schema",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/db/client",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/workspace-policy",
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
