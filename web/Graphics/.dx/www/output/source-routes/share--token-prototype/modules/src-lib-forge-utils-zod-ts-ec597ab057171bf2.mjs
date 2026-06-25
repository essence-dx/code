
export const dxSourceText = "type ParseResult<T> =\n  | { success: true; data: T }\n  | { success: false; error: ZodError };\n\nexport class ZodError extends Error {\n  readonly issues: unknown[];\n\n  constructor(issues: unknown[] = []) {\n    super(\"Validation failed.\");\n    this.name = \"ZodError\";\n    this.issues = issues;\n  }\n}\n\nclass ForgeSchema<T = unknown> {\n  constructor(private readonly parser: (input: unknown) => T = (input) => input as T) {}\n\n  parse(input: unknown): T {\n    return this.parser(input);\n  }\n\n  safeParse(input: unknown): ParseResult<T> {\n    try {\n      return {\n        success: true,\n        data: this.parse(input),\n      };\n    } catch (error) {\n      return {\n        success: false,\n        error: error instanceof ZodError ? error : new ZodError([error]),\n      };\n    }\n  }\n\n  optional() {\n    return new ForgeSchema<T | undefined>((input) =>\n      input === undefined ? undefined : this.parse(input),\n    );\n  }\n\n  nullable() {\n    return new ForgeSchema<T | null>((input) =>\n      input === null ? null : this.parse(input),\n    );\n  }\n\n  nullish() {\n    return this.optional().nullable();\n  }\n\n  default(value: T) {\n    return new ForgeSchema<T>((input) =>\n      input === undefined ? value : this.parse(input),\n    );\n  }\n\n  catch(value: T) {\n    return new ForgeSchema<T>((input) => {\n      try {\n        return this.parse(input);\n      } catch {\n        return value;\n      }\n    });\n  }\n\n  array() {\n    return z.array(this);\n  }\n\n  min() {\n    return this;\n  }\n\n  max() {\n    return this;\n  }\n\n  length() {\n    return this;\n  }\n\n  trim() {\n    return this;\n  }\n\n  email() {\n    return this;\n  }\n\n  url() {\n    return this;\n  }\n\n  uuid() {\n    return this;\n  }\n\n  regex() {\n    return this;\n  }\n\n  int() {\n    return this;\n  }\n\n  positive() {\n    return this;\n  }\n\n  nonnegative() {\n    return this;\n  }\n\n  finite() {\n    return this;\n  }\n\n  datetime() {\n    return this;\n  }\n\n  refine() {\n    return this;\n  }\n\n  superRefine() {\n    return this;\n  }\n\n  transform<TNext>(transformer: (value: T) => TNext) {\n    return new ForgeSchema<TNext>((input) => transformer(this.parse(input)));\n  }\n}\n\nclass ForgeObjectSchema<TShape extends Record<string, ForgeSchema>> extends ForgeSchema<{\n  [K in keyof TShape]: ReturnType<TShape[K][\"parse\"]>;\n}> {\n  constructor(readonly shape: TShape) {\n    super((input) => {\n      const source =\n        typeof input === \"object\" && input !== null\n          ? (input as Record<string, unknown>)\n          : {};\n      const output: Record<string, unknown> = {};\n\n      for (const [key, schema] of Object.entries(shape)) {\n        output[key] = schema.parse(source[key]);\n      }\n\n      return output as { [K in keyof TShape]: ReturnType<TShape[K][\"parse\"]> };\n    });\n  }\n\n  extend<TNext extends Record<string, ForgeSchema>>(shape: TNext) {\n    return new ForgeObjectSchema({\n      ...this.shape,\n      ...shape,\n    });\n  }\n\n  merge<TNext extends ForgeObjectSchema<Record<string, ForgeSchema>>>(schema: TNext) {\n    return this.extend(schema.shape);\n  }\n\n  partial() {\n    return this;\n  }\n\n  pick() {\n    return this;\n  }\n\n  omit() {\n    return this;\n  }\n\n  strict() {\n    return this;\n  }\n\n  passthrough() {\n    return this;\n  }\n}\n\nfunction schema<T>(parser?: (input: unknown) => T) {\n  return new ForgeSchema(parser);\n}\n\nexport const z = {\n  ZodError,\n  any: () => schema<unknown>(),\n  unknown: () => schema<unknown>(),\n  string: () =>\n    schema<string>((input) => (input === undefined || input === null ? \"\" : String(input))),\n  number: () => schema<number>((input) => Number(input)),\n  boolean: () => schema<boolean>((input) => Boolean(input)),\n  date: () =>\n    schema<Date>((input) => (input instanceof Date ? input : new Date(String(input)))),\n  literal: <T extends string | number | boolean | null>(value: T) =>\n    schema<T>((input) => {\n      if (input !== value) {\n        throw new ZodError([{ expected: value, received: input }]);\n      }\n\n      return value;\n    }),\n  enum: <T extends readonly [string, ...string[]]>(values: T) =>\n    schema<T[number]>((input) => {\n      const value = String(input);\n      if (!values.includes(value)) {\n        throw new ZodError([{ expected: values, received: input }]);\n      }\n\n      return value;\n    }),\n  nativeEnum: <T extends Record<string, string | number>>(values: T) =>\n    schema<T[keyof T]>((input) => input as T[keyof T]),\n  object: <TShape extends Record<string, ForgeSchema>>(shape: TShape) =>\n    new ForgeObjectSchema(shape),\n  array: <TItem>(item: ForgeSchema<TItem>) =>\n    schema<TItem[]>((input) =>\n      Array.isArray(input) ? input.map((value) => item.parse(value)) : [],\n    ),\n  record: <TValue>(value: ForgeSchema<TValue>) =>\n    schema<Record<string, TValue>>((input) => {\n      const source =\n        typeof input === \"object\" && input !== null\n          ? (input as Record<string, unknown>)\n          : {};\n      return Object.fromEntries(\n        Object.entries(source).map(([key, item]) => [key, value.parse(item)]),\n      );\n    }),\n  union: <TSchemas extends ForgeSchema[]>(schemas: TSchemas) =>\n    schema<ReturnType<TSchemas[number][\"parse\"]>>((input) => {\n      for (const item of schemas) {\n        const result = item.safeParse(input);\n        if (result.success) {\n          return result.data;\n        }\n      }\n\n      throw new ZodError([{ message: \"No union option matched.\" }]);\n    }),\n  discriminatedUnion: (_key: string, schemas: ForgeSchema[]) => z.union(schemas),\n  coerce: {\n    string: () => z.string(),\n    number: () => z.number(),\n    boolean: () => z.boolean(),\n    date: () => z.date(),\n  },\n  instanceof: <T>(constructor: new (...args: never[]) => T) =>\n    schema<T>((input) => {\n      if (!(input instanceof constructor)) {\n        throw new ZodError([{ expected: constructor.name, received: input }]);\n      }\n\n      return input;\n    }),\n};\n\nexport namespace z {\n  export type infer<TSchema> = TSchema extends ForgeSchema<infer TValue>\n    ? TValue\n    : unknown;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/utils/zod.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs",
  "kind": "ts",
  "hash": "ec597ab057171bf2",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/utils/zod.ts",
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
      "z"
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
