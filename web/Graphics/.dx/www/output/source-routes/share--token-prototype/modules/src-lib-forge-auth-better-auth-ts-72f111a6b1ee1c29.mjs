
export const dxSourceText = "\n\nconst noAuthResponse = () =>\n  new Response(null, {\n    status: 204,\n    headers: {\n      \"x-dx-auth\": \"disabled\",\n    },\n  })\n\nexport function betterAuth(options= {}) {\n  return {\n    api: {},\n    handler: noAuthResponse,\n    options,\n  }\n}\n\nexport function drizzleAdapter(..._input) {\n  return {\n    id: \"dx-no-auth-drizzle-adapter\",\n  }\n}\n\nexport function nextCookies() {\n  return {\n    id: \"dx-no-auth-next-cookies\",\n  } satisfies PluginReceipt\n}\n\nexport function emailOTP(options?) {\n  return {\n    id: \"dx-no-auth-email-otp\",\n    options,\n  } satisfies PluginReceipt\n}\n\nexport function admin(options?) {\n  return {\n    id: \"dx-no-auth-admin\",\n    options,\n  } satisfies PluginReceipt\n}\n\nexport async function hashPassword(password: string) {\n  return `dx-no-auth:${password}`\n}\n\nexport function toNextJsHandler(auth= {}) {\n  const handler = auth.handler ?? noAuthResponse\n\n  return {\n    DELETE: handler,\n    GET: handler,\n    PATCH: handler,\n    POST: handler,\n    PUT: handler,\n  }\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/auth/better-auth.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs",
  "kind": "ts",
  "hash": "72f111a6b1ee1c29",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "betterAuth",
    "drizzleAdapter",
    "nextCookies",
    "emailOTP",
    "admin",
    "toNextJsHandler"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/auth/better-auth.ts",
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
      "betterAuth",
      "drizzleAdapter",
      "nextCookies",
      "emailOTP",
      "admin",
      "toNextJsHandler"
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
  exportNames: ["betterAuth","drizzleAdapter","nextCookies","emailOTP","admin","toNextJsHandler"]
});


const noAuthResponse = () =>
  new Response(null, {
    status: 204,
    headers: {
      "x-dx-auth": "disabled",
    },
  })

export function betterAuth(options= {}) {
  return {
    api: {},
    handler: noAuthResponse,
    options,
  }
}

export function drizzleAdapter(..._input) {
  return {
    id: "dx-no-auth-drizzle-adapter",
  }
}

export function nextCookies() {
  return {
    id: "dx-no-auth-next-cookies",
  } satisfies PluginReceipt
}

export function emailOTP(options?) {
  return {
    id: "dx-no-auth-email-otp",
    options,
  } satisfies PluginReceipt
}

export function admin(options?) {
  return {
    id: "dx-no-auth-admin",
    options,
  } satisfies PluginReceipt
}

export async function hashPassword(password: string) {
  return `dx-no-auth:${password}`
}

export function toNextJsHandler(auth= {}) {
  const handler = auth.handler ?? noAuthResponse

  return {
    DELETE: handler,
    GET: handler,
    PATCH: handler,
    POST: handler,
    PUT: handler,
  }
}
export const dxRuntimeExports = Object.freeze({ betterAuth, drizzleAdapter, nextCookies, emailOTP, admin, toNextJsHandler });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
