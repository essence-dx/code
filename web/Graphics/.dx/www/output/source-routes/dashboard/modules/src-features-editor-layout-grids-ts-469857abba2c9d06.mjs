
export const dxSourceText = "import type {\n  DesignLayoutGrid,\n  DesignLayoutGridAlignment,\n  DesignLayoutGridKind,\n  DesignLayoutGridStyle,\n} from \"@/features/editor/types\";\n\nexport const layoutGridKindOptions = [\n  { value: \"grid\", label: \"Grid\" },\n  { value: \"columns\", label: \"Columns\" },\n  { value: \"rows\", label: \"Rows\" },\n] as const satisfies ReadonlyArray<{\n  value: DesignLayoutGridKind;\n  label: string;\n}>;\n\nexport const layoutGridAlignmentOptions = [\n  { value: \"stretch\", label: \"Stretch\" },\n  { value: \"start\", label: \"Start\" },\n  { value: \"center\", label: \"Center\" },\n  { value: \"end\", label: \"End\" },\n] as const satisfies ReadonlyArray<{\n  value: DesignLayoutGridAlignment;\n  label: string;\n}>;\n\nexport const layoutGridPresetOptions = [\n  {\n    id: \"mobile-columns\",\n    label: \"Mobile\",\n    grid: {\n      name: \"Mobile columns\",\n      kind: \"columns\",\n      count: 4,\n      gutter: 16,\n      margin: 16,\n      alignment: \"stretch\",\n      color: \"#38bdf8\",\n      opacity: 0.18,\n      size: 8,\n    },\n  },\n  {\n    id: \"desktop-columns\",\n    label: \"Desktop\",\n    grid: {\n      name: \"Desktop columns\",\n      kind: \"columns\",\n      count: 12,\n      gutter: 24,\n      margin: 64,\n      alignment: \"stretch\",\n      color: \"#60a5fa\",\n      opacity: 0.16,\n      size: 8,\n    },\n  },\n  {\n    id: \"rows-8\",\n    label: \"Rows\",\n    grid: {\n      name: \"8px rows\",\n      kind: \"rows\",\n      count: 16,\n      gutter: 8,\n      margin: 24,\n      alignment: \"stretch\",\n      color: \"#a78bfa\",\n      opacity: 0.16,\n      size: 8,\n    },\n  },\n  {\n    id: \"square-8\",\n    label: \"8px\",\n    grid: {\n      name: \"8px grid\",\n      kind: \"grid\",\n      count: 8,\n      gutter: 0,\n      margin: 0,\n      alignment: \"stretch\",\n      color: \"#f8fafc\",\n      opacity: 0.1,\n      size: 8,\n    },\n  },\n] as const satisfies ReadonlyArray<{\n  id: string;\n  label: string;\n  grid: Omit<DesignLayoutGrid, \"id\" | \"visible\">;\n}>;\n\nexport const defaultLayoutGrid: DesignLayoutGrid = {\n  id: \"\",\n  name: \"Layout grid\",\n  kind: \"columns\",\n  visible: true,\n  color: \"#38bdf8\",\n  opacity: 0.16,\n  size: 8,\n  count: 12,\n  gutter: 24,\n  margin: 64,\n  alignment: \"stretch\",\n};\n\nexport function normalizeLayoutGrid(grid: DesignLayoutGrid): DesignLayoutGrid {\n  return {\n    ...defaultLayoutGrid,\n    ...grid,\n    opacity: clampNumber(grid.opacity, 0.02, 1),\n    size: Math.max(1, Math.round(grid.size)),\n    count: Math.max(1, Math.round(grid.count)),\n    gutter: Math.max(0, Math.round(grid.gutter)),\n    margin: Math.max(0, Math.round(grid.margin)),\n  };\n}\n\nexport function getLayoutGridSignature(grids?: DesignLayoutGrid[]) {\n  return (grids ?? [])\n    .map(normalizeLayoutGrid)\n    .map((grid) =>\n      [\n        grid.name,\n        grid.kind,\n        grid.visible ? \"visible\" : \"hidden\",\n        grid.count,\n        grid.size,\n        grid.gutter,\n        grid.margin,\n        grid.alignment,\n        grid.color,\n        Number(grid.opacity.toFixed(2)),\n      ].join(\":\"),\n    )\n    .join(\"|\");\n}\n\nexport function getLayoutGridStyleSignature(\n  styles?: Record<string, DesignLayoutGridStyle>,\n) {\n  return Object.values(styles ?? {})\n    .map((style) =>\n      [style.name, getLayoutGridSignature([styleToGrid(style)])].join(\":\"),\n    )\n    .sort()\n    .join(\"|\");\n}\n\nexport function gridToStyleValue(\n  grid: DesignLayoutGrid,\n): DesignLayoutGridStyle[\"grid\"] {\n  const normalized = normalizeLayoutGrid(grid);\n\n  return {\n    name: normalized.name,\n    kind: normalized.kind,\n    color: normalized.color,\n    opacity: normalized.opacity,\n    size: normalized.size,\n    count: normalized.count,\n    gutter: normalized.gutter,\n    margin: normalized.margin,\n    alignment: normalized.alignment,\n  };\n}\n\nexport function styleToGrid(style: DesignLayoutGridStyle): DesignLayoutGrid {\n  return normalizeLayoutGrid({\n    ...style.grid,\n    id: style.id,\n    visible: true,\n  });\n}\n\nexport function getLayoutGridCssColor(grid: DesignLayoutGrid) {\n  const opacity = clampNumber(grid.opacity, 0, 1);\n  const hex = grid.color.trim();\n\n  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {\n    const red = Number.parseInt(hex.slice(1, 3), 16);\n    const green = Number.parseInt(hex.slice(3, 5), 16);\n    const blue = Number.parseInt(hex.slice(5, 7), 16);\n\n    return `rgb(${red} ${green} ${blue} / ${opacity})`;\n  }\n\n  return `color-mix(in oklch, ${grid.color} ${Math.round(\n    opacity * 100,\n  )}%, transparent)`;\n}\n\nfunction clampNumber(value: number, min: number, max: number) {\n  if (!Number.isFinite(value)) {\n    return min;\n  }\n\n  return Math.min(max, Math.max(min, value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/layout-grids.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-layout-grids-ts-469857abba2c9d06.mjs",
  "kind": "ts",
  "hash": "469857abba2c9d06",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/layout-grids.ts",
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
        "specifier": "@/features/editor/types",
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
      "normalizeLayoutGrid",
      "getLayoutGridSignature",
      "getLayoutGridStyleSignature",
      "gridToStyleValue",
      "styleToGrid",
      "getLayoutGridCssColor",
      "layoutGridKindOptions",
      "layoutGridAlignmentOptions",
      "layoutGridPresetOptions",
      "defaultLayoutGrid"
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
