
export const dxSourceText = "\"use client\";\n\ntype LocalAuthInput = {\n  email?: string;\n  name?: string;\n  password?: string;\n};\n\nconst fallbackUser = {\n  id: \"dx-local-user\",\n  name: \"DX Designer\",\n  email: \"designer@dx.local\",\n  emailVerified: true,\n} as const;\n\nconst fallbackSession = {\n  id: \"dx-local-session\",\n  userId: fallbackUser.id,\n  expiresAt: new Date(\"2099-01-01T00:00:00.000Z\"),\n  token: \"dx-local-session\",\n  createdAt: new Date(0),\n  updatedAt: new Date(0),\n} as const;\n\nfunction localAuthResponse(input?: LocalAuthInput) {\n  const user = {\n    ...fallbackUser,\n    email: input?.email?.trim() || fallbackUser.email,\n    name: input?.name?.trim() || fallbackUser.name,\n  };\n\n  return Promise.resolve({\n    data: {\n      user,\n      session: fallbackSession,\n    },\n    error: null,\n  });\n}\n\nexport const authClient = {\n  emailOtp: {\n    sendVerificationOtp: async () => ({ data: { ok: true }, error: null }),\n    verifyEmail: async () => ({ data: { ok: true }, error: null }),\n  },\n  signIn: {\n    email: localAuthResponse,\n  },\n  signOut: async () => ({ data: null, error: null }),\n  signUp: {\n    email: localAuthResponse,\n  },\n  useSession() {\n    return {\n      data: {\n        user: fallbackUser,\n        session: fallbackSession,\n      },\n      error: null,\n      isPending: false,\n      refetch: () => localAuthResponse(),\n    };\n  },\n};\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/auth-client.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-auth-client-ts-cb0514e33f1d1021.mjs",
  "kind": "ts",
  "hash": "cb0514e33f1d1021",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/auth-client.ts",
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
    "directives": [
      {
        "value": "use client",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
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
      "authClient"
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
