import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport * as React from \"react\";\nimport { Minus, Plus } from \"lucide-react\";\nimport { Button } from \"@/components/ui/button\";\nimport { Input } from \"@/components/ui/input\";\nimport { cn } from \"@/lib/utils\";\n\ntype NumberInputProps = Omit<\n  React.ComponentProps<typeof Input>,\n  \"type\" | \"value\" | \"onChange\" | \"min\" | \"max\" | \"step\"\n> & {\n  value: number;\n  onChange: (value: number) => void;\n  min?: number;\n  max?: number;\n  step?: number;\n  inputClassName?: string;\n};\n\nfunction NumberInput({\n  value,\n  onChange,\n  min,\n  max,\n  step = 1,\n  className,\n  inputClassName,\n  onBlur,\n  onKeyDown,\n  ...props\n}: NumberInputProps) {\n  const [draft, setDraft] = React.useState(formatNumber(value));\n\n  React.useEffect(() => {\n    setDraft(formatNumber(value));\n  }, [value]);\n\n  function commit(nextDraft = draft) {\n    const nextValue = parseNumber(nextDraft);\n\n    if (nextValue === null) {\n      setDraft(formatNumber(value));\n      return;\n    }\n\n    update(clampNumber(nextValue, min, max));\n  }\n\n  function update(nextValue: number) {\n    const roundedValue = roundToStep(nextValue, step);\n\n    setDraft(formatNumber(roundedValue));\n    onChange(roundedValue);\n  }\n\n  function nudge(direction: 1 | -1) {\n    const currentValue = parseNumber(draft) ?? value;\n    update(clampNumber(currentValue + step * direction, min, max));\n  }\n\n  return (\n    <div\n      className={cn(\n        \"flex h-8 w-full min-w-0 items-center overflow-hidden rounded-lg border border-input bg-transparent text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30\",\n        className,\n      )}\n    >\n      <Button\n        type=\"button\"\n        variant=\"ghost\"\n        size=\"icon\"\n        tabIndex={-1}\n        className=\"h-full w-7 shrink-0 rounded-none text-muted-foreground hover:text-foreground\"\n        onClick={() => nudge(-1)}\n        disabled={min !== undefined && value <= min}\n        aria-label=\"Decrease value\"\n      >\n        <Minus className=\"size-3\" />\n      </Button>\n      <Input\n        {...props}\n        type=\"text\"\n        inputMode=\"decimal\"\n        value={draft}\n        className={cn(\n          \"h-full min-w-0 border-0 bg-transparent px-1 text-center font-mono text-xs shadow-none focus-visible:ring-0\",\n          inputClassName,\n        )}\n        onChange={(event) => {\n          const nextDraft = event.target.value;\n          const nextValue = parseNumber(nextDraft);\n\n          setDraft(nextDraft);\n\n          if (nextValue !== null) {\n            onChange(clampNumber(nextValue, min, max));\n          }\n        }}\n        onBlur={(event) => {\n          commit(event.target.value);\n          onBlur?.(event);\n        }}\n        onKeyDown={(event) => {\n          if (event.key === \"ArrowUp\") {\n            event.preventDefault();\n            nudge(1);\n          }\n\n          if (event.key === \"ArrowDown\") {\n            event.preventDefault();\n            nudge(-1);\n          }\n\n          if (event.key === \"Enter\") {\n            event.currentTarget.blur();\n          }\n\n          if (event.key === \"Escape\") {\n            setDraft(formatNumber(value));\n            event.currentTarget.blur();\n          }\n\n          onKeyDown?.(event);\n        }}\n      />\n      <Button\n        type=\"button\"\n        variant=\"ghost\"\n        size=\"icon\"\n        tabIndex={-1}\n        className=\"h-full w-7 shrink-0 rounded-none text-muted-foreground hover:text-foreground\"\n        onClick={() => nudge(1)}\n        disabled={max !== undefined && value >= max}\n        aria-label=\"Increase value\"\n      >\n        <Plus className=\"size-3\" />\n      </Button>\n    </div>\n  );\n}\n\nfunction parseNumber(value: string) {\n  if (!value.trim() || value === \"-\" || value === \".\") {\n    return null;\n  }\n\n  const parsed = Number(value);\n\n  return Number.isFinite(parsed) ? parsed : null;\n}\n\nfunction clampNumber(value: number, min?: number, max?: number) {\n  if (min !== undefined && value < min) {\n    return min;\n  }\n\n  if (max !== undefined && value > max) {\n    return max;\n  }\n\n  return value;\n}\n\nfunction roundToStep(value: number, step: number) {\n  if (!Number.isFinite(step) || step <= 0) {\n    return value;\n  }\n\n  const decimals = Math.max(0, `${step}`.split(\".\")[1]?.length ?? 0);\n\n  return Number(value.toFixed(decimals));\n}\n\nfunction formatNumber(value: number) {\n  return Number.isFinite(value) ? String(value) : \"0\";\n}\n\nexport { NumberInput };\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/number-input.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-number-input-tsx-3171f8b602462d96.mjs",
  "kind": "tsx",
  "hash": "3171f8b602462d96",
  "dependencies": [
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/input",
      "resolved_path": "src/components/ui/input.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/lib/utils",
      "resolved_path": "src/lib/utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-utils-ts-cb488a6352482fc7.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "react",
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
    "source_path": "src/components/ui/number-input.tsx",
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
    "directives": [
      {
        "value": "use client",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/input",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/utils",
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3]);
export default dxSourceModule;
