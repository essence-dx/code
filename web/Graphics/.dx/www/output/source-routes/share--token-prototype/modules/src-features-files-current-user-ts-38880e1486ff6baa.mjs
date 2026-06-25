import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-auth-ts-de3814526e1d4ec2.mjs";
export const dxSourceText = "import { headers } from \"next/headers\";\nimport { auth } from \"@/lib/auth\";\n\nexport async function getRequiredUser() {\n  const session = await auth.api.getSession({\n    headers: await headers(),\n  });\n\n  if (!session) {\n    throw new Error(\"Authentication is required.\");\n  }\n\n  return session.user;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/files/current-user.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-files-current-user-ts-38880e1486ff6baa.mjs",
  "kind": "ts",
  "hash": "38880e1486ff6baa",
  "dependencies": [
    {
      "specifier": "@/lib/auth",
      "resolved_path": "src/lib/auth.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-auth-ts-de3814526e1d4ec2.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/headers",
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
    "source_path": "src/features/files/current-user.ts",
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
        "specifier": "next/headers",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/auth",
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
