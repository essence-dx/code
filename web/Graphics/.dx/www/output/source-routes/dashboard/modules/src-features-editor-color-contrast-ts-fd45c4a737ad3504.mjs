
export const dxSourceText = "\n\nexport function getContrastReport(\n  foreground,\n  background,\n){\n  const foregroundRgb = parseHexColor(foreground);\n  const backgroundRgb = parseHexColor(background);\n\n  if (!foregroundRgb || !backgroundRgb) {\n    return null;\n  }\n\n  const light = getRelativeLuminance(foregroundRgb);\n  const dark = getRelativeLuminance(backgroundRgb);\n  const ratio =\n    (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);\n\n  return {\n    ratio,\n    label: ratio >= 7 ? \"AAA\" : ratio >= 4.5 ? \"AA\" : \"Low\",\n  };\n}\n\nfunction parseHexColor(value: string): RgbColor | null {\n  const normalized = value.trim().toLowerCase();\n  const match = normalized.match(/^#([0-9a-f]{6})$/);\n\n  if (!match?.[1]) {\n    return null;\n  }\n\n  return {\n    r: Number.parseInt(match[1].slice(0, 2), 16),\n    g: Number.parseInt(match[1].slice(2, 4), 16),\n    b: Number.parseInt(match[1].slice(4, 6), 16),\n  };\n}\n\nfunction getRelativeLuminance(color: RgbColor) {\n  const channels = [color.r, color.g, color.b].map((channel) => {\n    const value = channel / 255;\n\n    return value <= 0.03928\n      ? value / 12.92\n      : ((value + 0.055) / 1.055) ** 2.4;\n  });\n\n  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/color-contrast.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-color-contrast-ts-fd45c4a737ad3504.mjs",
  "kind": "ts",
  "hash": "fd45c4a737ad3504",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "getContrastReport"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/color-contrast.ts",
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
      "getContrastReport"
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
  exportNames: ["getContrastReport"]
});


export function getContrastReport(
  foreground,
  background,
){
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);

  if (!foregroundRgb || !backgroundRgb) {
    return null;
  }

  const light = getRelativeLuminance(foregroundRgb);
  const dark = getRelativeLuminance(backgroundRgb);
  const ratio =
    (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);

  return {
    ratio,
    label: ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Low",
  };
}

function parseHexColor(value: string): RgbColor | null {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{6})$/);

  if (!match?.[1]) {
    return null;
  }

  return {
    r: Number.parseInt(match[1].slice(0, 2), 16),
    g: Number.parseInt(match[1].slice(2, 4), 16),
    b: Number.parseInt(match[1].slice(4, 6), 16),
  };
}

function getRelativeLuminance(color: RgbColor) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;

    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export const dxRuntimeExports = Object.freeze({ getContrastReport });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
