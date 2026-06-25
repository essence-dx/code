import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-db-schema-ts-24b183fcc50e5ffb.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-db-libsql-client-ts-de1158ecfb2e1166.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-db-libsql-ts-e8f762d509b3db09.mjs";
export const dxSourceText = "import { createClient } from \"@libsql/client\";\nimport { drizzle, type LibSQLDatabase } from \"drizzle-orm/libsql\";\nimport * as schema from \"@/db/schema\";\n\ntype AppDatabase = LibSQLDatabase<typeof schema>;\n\nlet cachedDb: AppDatabase | null = null;\n\nexport function getDb() {\n  if (cachedDb) {\n    return cachedDb;\n  }\n\n  const url = process.env.TURSO_DATABASE_URL;\n  const authToken = process.env.TURSO_AUTH_TOKEN;\n\n  if (!url) {\n    throw new Error(\"TURSO_DATABASE_URL is required.\");\n  }\n\n  if (url.startsWith(\"libsql://\") && !authToken) {\n    throw new Error(\"Database auth token is required for remote databases.\");\n  }\n\n  cachedDb = drizzle(\n    createClient({\n      url,\n      authToken,\n    }),\n    { schema },\n  );\n\n  return cachedDb;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/db/client.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-db-client-ts-b11a4f30c3f08fac.mjs",
  "kind": "ts",
  "hash": "b11a4f30c3f08fac",
  "dependencies": [
    {
      "specifier": "@/db/schema",
      "resolved_path": "src/db/schema.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-db-schema-ts-24b183fcc50e5ffb.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@libsql/client",
      "resolved_path": "src/lib/forge/db/libsql-client.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-db-libsql-client-ts-de1158ecfb2e1166.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "drizzle-orm/libsql",
      "resolved_path": "src/lib/forge/db/libsql.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-db-libsql-ts-e8f762d509b3db09.mjs",
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
    "source_path": "src/db/client.ts",
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
        "specifier": "@libsql/client",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "drizzle-orm/libsql",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/db/schema",
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
    "export_names": [
      "getDb"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
