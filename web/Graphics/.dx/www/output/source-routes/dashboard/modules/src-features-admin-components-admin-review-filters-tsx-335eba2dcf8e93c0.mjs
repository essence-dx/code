import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { Search } from \"lucide-react\";\nimport { Button } from \"@/components/ui/button\";\nimport { Input } from \"@/components/ui/input\";\nimport type { AdminReviewFilterOption } from \"@/features/admin/admin-review-model\";\n\ntype AdminReviewFiltersProps<TValue extends string> = {\n  query: string;\n  onQueryChange: (query: string) => void;\n  placeholder: string;\n  value: TValue;\n  onValueChange: (value: TValue) => void;\n  options: AdminReviewFilterOption<TValue>[];\n};\n\nexport function AdminReviewFilters<TValue extends string>({\n  query,\n  onQueryChange,\n  placeholder,\n  value,\n  onValueChange,\n  options,\n}: AdminReviewFiltersProps<TValue>) {\n  return (\n    <div className=\"flex flex-col gap-2 md:flex-row md:items-center md:justify-between\">\n      <div className=\"relative min-w-0 md:w-72\">\n        <Search className=\"pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground\" />\n        <Input\n          value={query}\n          onChange={(event) => onQueryChange(event.target.value)}\n          placeholder={placeholder}\n          className=\"h-9 pl-8\"\n        />\n      </div>\n      <div className=\"flex flex-wrap gap-1.5\">\n        {options.map((option) => (\n          <Button\n            key={option.value}\n            type=\"button\"\n            size=\"sm\"\n            variant={option.value === value ? \"secondary\" : \"outline\"}\n            className=\"h-8\"\n            onClick={() => onValueChange(option.value)}\n          >\n            {option.label}\n            <span className=\"rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[10px]\">\n              {option.count}\n            </span>\n          </Button>\n        ))}\n      </div>\n    </div>\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-review-filters.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-review-filters-tsx-335eba2dcf8e93c0.mjs",
  "kind": "tsx",
  "hash": "335eba2dcf8e93c0",
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
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
      "kind": "tsx",
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
    "source_path": "src/features/admin/components/admin-review-filters.tsx",
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
        "specifier": "@/features/admin/admin-review-model",
        "side_effect_only": false,
        "type_only": true
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
      "AdminReviewFilters"
    ],
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
