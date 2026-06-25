
export const dxSourceText = "\nclass ColumnBuilder {\n  readonly config: ColumnConfig;\n\n  constructor(name: string, type: string, options?: unknown) {\n    this.config = {\n      name,\n      type,\n      options,\n      modifiers: [],\n    };\n  }\n\n  private add(name: string, ...args: unknown[]) {\n    this.config.modifiers.push({ name, args });\n    return this;\n  }\n\n  primaryKey(...args: unknown[]) {\n    return this.add(\"primaryKey\", ...args);\n  }\n\n  notNull() {\n    return this.add(\"notNull\");\n  }\n\n  unique(...args: unknown[]) {\n    return this.add(\"unique\", ...args);\n  }\n\n  default(value: unknown) {\n    return this.add(\"default\", value);\n  }\n\n  defaultNow() {\n    return this.add(\"defaultNow\");\n  }\n\n  references(...args: unknown[]) {\n    return this.add(\"references\", ...args);\n  }\n\n  $defaultFn(factory: () => unknown) {\n    return this.add(\"$defaultFn\", factory);\n  }\n\n  $type<T>() {\n    return this as ColumnBuilder & { __type?: T };\n  }\n}\n\n\nfunction column(name: string, type: string, options?: unknown) {\n  return new ColumnBuilder(name, type, options);\n}\n\nexport function text(name, options?) {\n  return column(name, \"text\", options);\n}\n\nexport function integer(name, options?) {\n  return column(name, \"integer\", options);\n}\n\nexport function real(name, options?) {\n  return column(name, \"real\", options);\n}\n\nexport function blob(name, options?) {\n  return column(name, \"blob\", options);\n}\n\nexport function numeric(name, options?) {\n  return column(name, \"numeric\", options);\n}\n\nfunction indexBuilder(name: string, unique: boolean) {\n  return {\n    name,\n    unique,\n    on: (...columns: unknown[]) => ({ name, unique, columns }),\n    where: (...conditions: unknown[]) => ({ name, unique, conditions }),\n  };\n}\n\nexport function index(name) {\n  return indexBuilder(name, false);\n}\n\nexport function uniqueIndex(name) {\n  return indexBuilder(name, true);\n}\n\nexport function primaryKey(...columns) {\n  return { kind: \"primaryKey\", columns };\n}\n\nexport function sqliteTable(\n  name,\n  columns,\n  extraConfig?) => unknown,\n): TableDefinition {\n  return {\n    ...columns,\n    __tableName: name,\n    __columns: columns,\n    __extraConfig: extraConfig?.(columns),\n    $inferSelect: {},\n    $inferInsert: {},\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/db/sqlite-core.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-db-sqlite-core-ts-b21da59e31504108.mjs",
  "kind": "ts",
  "hash": "b21da59e31504108",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "text",
    "integer",
    "real",
    "blob",
    "numeric",
    "index",
    "uniqueIndex",
    "primaryKey",
    "sqliteTable"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/db/sqlite-core.ts",
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
      "text",
      "integer",
      "real",
      "blob",
      "numeric",
      "index",
      "uniqueIndex",
      "primaryKey",
      "sqliteTable"
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
  exportNames: ["text","integer","real","blob","numeric","index","uniqueIndex","primaryKey","sqliteTable"]
});

class ColumnBuilder {
  readonly config: ColumnConfig;

  constructor(name: string, type: string, options?: unknown) {
    this.config = {
      name,
      type,
      options,
      modifiers: [],
    };
  }

  private add(name: string, ...args: unknown[]) {
    this.config.modifiers.push({ name, args });
    return this;
  }

  primaryKey(...args: unknown[]) {
    return this.add("primaryKey", ...args);
  }

  notNull() {
    return this.add("notNull");
  }

  unique(...args: unknown[]) {
    return this.add("unique", ...args);
  }

  default(value: unknown) {
    return this.add("default", value);
  }

  defaultNow() {
    return this.add("defaultNow");
  }

  references(...args: unknown[]) {
    return this.add("references", ...args);
  }

  $defaultFn(factory: () => unknown) {
    return this.add("$defaultFn", factory);
  }

  $type<T>() {
    return this as ColumnBuilder & { __type?: T };
  }
}


function column(name: string, type: string, options?: unknown) {
  return new ColumnBuilder(name, type, options);
}

export function text(name, options?) {
  return column(name, "text", options);
}

export function integer(name, options?) {
  return column(name, "integer", options);
}

export function real(name, options?) {
  return column(name, "real", options);
}

export function blob(name, options?) {
  return column(name, "blob", options);
}

export function numeric(name, options?) {
  return column(name, "numeric", options);
}

function indexBuilder(name: string, unique: boolean) {
  return {
    name,
    unique,
    on: (...columns: unknown[]) => ({ name, unique, columns }),
    where: (...conditions: unknown[]) => ({ name, unique, conditions }),
  };
}

export function index(name) {
  return indexBuilder(name, false);
}

export function uniqueIndex(name) {
  return indexBuilder(name, true);
}

export function primaryKey(...columns) {
  return { kind: "primaryKey", columns };
}

export function sqliteTable(
  name,
  columns,
  extraConfig?) => unknown,
): TableDefinition {
  return {
    ...columns,
    __tableName: name,
    __columns: columns,
    __extraConfig: extraConfig?.(columns),
    $inferSelect: {},
    $inferInsert: {},
  };
}
export const dxRuntimeExports = Object.freeze({ text, integer, real, blob, numeric, index, uniqueIndex, primaryKey, sqliteTable });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
