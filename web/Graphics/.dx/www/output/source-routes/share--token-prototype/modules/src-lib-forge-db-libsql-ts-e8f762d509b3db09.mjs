
export const dxSourceText = "\n\nfunction createQueryChain(result: unknown[] = []): QueryChain {\n  const promise = Promise.resolve(result);\n\n  return new Proxy(\n    {},\n    {\n      get(_target, property) {\n        if (property === \"then\") {\n          return promise.then.bind(promise);\n        }\n\n        if (property === \"catch\") {\n          return promise.catch.bind(promise);\n        }\n\n        if (property === \"finally\") {\n          return promise.finally.bind(promise);\n        }\n\n        if (property === \"execute\" || property === \"all\") {\n          return () => Promise.resolve(result);\n        }\n\n        if (property === \"get\") {\n          return () => Promise.resolve(result[0]);\n        }\n\n        if (property === \"run\") {\n          return () => Promise.resolve({ rowsAffected: 0 });\n        }\n\n        return () => createQueryChain(result);\n      },\n    },\n  ) as QueryChain;\n}\n\nfunction createQueryNamespace(): Record<string, QueryChain> {\n  return new Proxy(\n    {},\n    {\n      get() {\n        return createQueryChain();\n      },\n    },\n  ) as Record<string, QueryChain>;\n}\n\nexport function drizzle<TSchema = Record<string, unknown>>(\n  _client,\n  config?,\n){\n  return {\n    schema: config?.schema,\n    select: () => createQueryChain(),\n    insert: () => createQueryChain(),\n    update: () => createQueryChain(),\n    delete: () => createQueryChain(),\n    query: createQueryNamespace(),\n    run: async () => ({ rowsAffected: 0 }),\n    all: async () => [],\n    get: async () => undefined,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/db/libsql.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-db-libsql-ts-e8f762d509b3db09.mjs",
  "kind": "ts",
  "hash": "e8f762d509b3db09",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "drizzle"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/db/libsql.ts",
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
      "drizzle"
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
  exportNames: ["drizzle"]
});


function createQueryChain(result: unknown[] = []): QueryChain {
  const promise = Promise.resolve(result);

  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return promise.then.bind(promise);
        }

        if (property === "catch") {
          return promise.catch.bind(promise);
        }

        if (property === "finally") {
          return promise.finally.bind(promise);
        }

        if (property === "execute" || property === "all") {
          return () => Promise.resolve(result);
        }

        if (property === "get") {
          return () => Promise.resolve(result[0]);
        }

        if (property === "run") {
          return () => Promise.resolve({ rowsAffected: 0 });
        }

        return () => createQueryChain(result);
      },
    },
  ) as QueryChain;
}

function createQueryNamespace(): Record<string, QueryChain> {
  return new Proxy(
    {},
    {
      get() {
        return createQueryChain();
      },
    },
  ) as Record<string, QueryChain>;
}

export function drizzle<TSchema = Record<string, unknown>>(
  _client,
  config?,
){
  return {
    schema: config?.schema,
    select: () => createQueryChain(),
    insert: () => createQueryChain(),
    update: () => createQueryChain(),
    delete: () => createQueryChain(),
    query: createQueryNamespace(),
    run: async () => ({ rowsAffected: 0 }),
    all: async () => [],
    get: async () => undefined,
  };
}
export const dxRuntimeExports = Object.freeze({ drizzle });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
