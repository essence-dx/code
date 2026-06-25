
export const dxSourceText = "\n  ? T\n  : Record<string, unknown>;\n  ? T\n  : Record<string, unknown>;\n\nfunction expression<T = unknown>(\n  operator: string,\n  ...args: unknown[]\n): DrizzleExpression<T> {\n  return {\n    kind: \"drizzle-expression\",\n    operator,\n    args,\n  };\n}\n\nexport const sql = Object.assign(\n  (strings: TemplateStringsArray | string, ...values: unknown[]) =>\n    expression(\"sql\", strings, ...values),\n  {\n    raw: (value: string) => expression(\"sql.raw\", value),\n    empty: () => expression(\"sql.empty\"),\n    join: (chunks: unknown[], separator?: unknown) =>\n      expression(\"sql.join\", chunks, separator),\n    placeholder: (name: string) => expression(\"sql.placeholder\", name),\n  },\n);\n\nexport function and(...conditions) {\n  return expression(\"and\", ...conditions.filter(Boolean));\n}\n\nexport function or(...conditions) {\n  return expression(\"or\", ...conditions.filter(Boolean));\n}\n\nexport function not(condition) {\n  return expression(\"not\", condition);\n}\n\nexport function eq(left, right) {\n  return expression(\"eq\", left, right);\n}\n\nexport function ne(left, right) {\n  return expression(\"ne\", left, right);\n}\n\nexport function gt(left, right) {\n  return expression(\"gt\", left, right);\n}\n\nexport function gte(left, right) {\n  return expression(\"gte\", left, right);\n}\n\nexport function lt(left, right) {\n  return expression(\"lt\", left, right);\n}\n\nexport function lte(left, right) {\n  return expression(\"lte\", left, right);\n}\n\nexport function isNull(value) {\n  return expression(\"isNull\", value);\n}\n\nexport function isNotNull(value) {\n  return expression(\"isNotNull\", value);\n}\n\nexport function inArray(value, candidates) {\n  return expression(\"inArray\", value, candidates);\n}\n\nexport function like(value, pattern) {\n  return expression(\"like\", value, pattern);\n}\n\nexport function exists(value) {\n  return expression(\"exists\", value);\n}\n\nexport function count(value?) {\n  return expression<number>(\"count\", value);\n}\n\nexport function desc(value) {\n  return expression(\"desc\", value);\n}\n\nexport function asc(value) {\n  return expression(\"asc\", value);\n}\n\nfunction relation(kind: \"one\" | \"many\") {\n  return (...args: unknown[]) => expression(`relations.${kind}`, ...args);\n}\n\nexport function relations<TTable, TResult>(\n  table,\n  builder) => TResult,\n) {\n  return {\n    table,\n    relations: builder({\n      one: relation(\"one\"),\n      many: relation(\"many\"),\n    }),\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/db/drizzle-orm.ts",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs",
  "kind": "ts",
  "hash": "03b4cc666c52123e",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "and",
    "or",
    "not",
    "eq",
    "ne",
    "gt",
    "gte",
    "lt",
    "lte",
    "isNull",
    "isNotNull",
    "inArray",
    "like",
    "exists",
    "count",
    "desc",
    "asc",
    "relations"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/db/drizzle-orm.ts",
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
      "and",
      "or",
      "not",
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "isNull",
      "isNotNull",
      "inArray",
      "like",
      "exists",
      "count",
      "desc",
      "asc",
      "relations"
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
  exportNames: ["and","or","not","eq","ne","gt","gte","lt","lte","isNull","isNotNull","inArray","like","exists","count","desc","asc","relations"]
});

  ? T
  : Record<string, unknown>;
  ? T
  : Record<string, unknown>;

function expression<T = unknown>(
  operator: string,
  ...args: unknown[]
): DrizzleExpression<T> {
  return {
    kind: "drizzle-expression",
    operator,
    args,
  };
}

export const sql = Object.assign(
  (strings: TemplateStringsArray | string, ...values: unknown[]) =>
    expression("sql", strings, ...values),
  {
    raw: (value: string) => expression("sql.raw", value),
    empty: () => expression("sql.empty"),
    join: (chunks: unknown[], separator?: unknown) =>
      expression("sql.join", chunks, separator),
    placeholder: (name: string) => expression("sql.placeholder", name),
  },
);

export function and(...conditions) {
  return expression("and", ...conditions.filter(Boolean));
}

export function or(...conditions) {
  return expression("or", ...conditions.filter(Boolean));
}

export function not(condition) {
  return expression("not", condition);
}

export function eq(left, right) {
  return expression("eq", left, right);
}

export function ne(left, right) {
  return expression("ne", left, right);
}

export function gt(left, right) {
  return expression("gt", left, right);
}

export function gte(left, right) {
  return expression("gte", left, right);
}

export function lt(left, right) {
  return expression("lt", left, right);
}

export function lte(left, right) {
  return expression("lte", left, right);
}

export function isNull(value) {
  return expression("isNull", value);
}

export function isNotNull(value) {
  return expression("isNotNull", value);
}

export function inArray(value, candidates) {
  return expression("inArray", value, candidates);
}

export function like(value, pattern) {
  return expression("like", value, pattern);
}

export function exists(value) {
  return expression("exists", value);
}

export function count(value?) {
  return expression<number>("count", value);
}

export function desc(value) {
  return expression("desc", value);
}

export function asc(value) {
  return expression("asc", value);
}

function relation(kind: "one" | "many") {
  return (...args: unknown[]) => expression(`relations.${kind}`, ...args);
}

export function relations<TTable, TResult>(
  table,
  builder) => TResult,
) {
  return {
    table,
    relations: builder({
      one: relation("one"),
      many: relation("many"),
    }),
  };
}
export const dxRuntimeExports = Object.freeze({ and, or, not, eq, ne, gt, gte, lt, lte, isNull, isNotNull, inArray, like, exists, count, desc, asc, relations });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
