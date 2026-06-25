import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs";
export const dxSourceText = "import { exportPageToSvgFrame } from \"@/features/editor/exporters/svg-exporter\";\nimport type { DesignDocument, DesignLayer } from \"@/features/editor/types\";\n\nexport type PrototypePreviewModel = {\n  startPageId: string;\n  pages: PrototypePreviewPage[];\n};\n\nexport type PrototypePreviewPage = {\n  id: string;\n  name: string;\n  prototypeStart: boolean;\n  svg: string;\n  width: number;\n  height: number;\n  hotspots: PrototypePreviewHotspot[];\n};\n\nexport type PrototypePreviewHotspot = {\n  id: string;\n  name: string;\n  targetPageId: string;\n  targetPageName: string;\n  targetExists: boolean;\n  trigger: string;\n  action: string;\n  transition: string;\n  durationMs: number;\n  preserveScroll: boolean;\n  scrollBehavior: string;\n  overlayPosition: string;\n  closeOnOutside: boolean;\n  deviceFrame: string;\n  smartAnimate: boolean;\n  left: number;\n  top: number;\n  width: number;\n  height: number;\n};\n\nexport function getPrototypePreviewModel(\n  document: DesignDocument,\n): PrototypePreviewModel {\n  const pagesById = new Map(document.pages.map((page) => [page.id, page]));\n  const startPage =\n    document.pages.find((page) => page.prototypeStart) ??\n    pagesById.get(document.activePageId) ??\n    document.pages[0];\n\n  return {\n    startPageId: startPage?.id ?? \"missing\",\n    pages: document.pages.map((page) => {\n      const frame = exportPageToSvgFrame(page);\n\n      return {\n        id: page.id,\n        name: page.name,\n        prototypeStart: page.prototypeStart ?? false,\n        svg: frame.svg,\n        width: frame.bounds.width,\n        height: frame.bounds.height,\n        hotspots: page.layers\n          .filter(isPrototypeHotspot)\n          .map((layer) => {\n            const targetPage = pagesById.get(layer.prototype.targetPageId);\n\n            return {\n              id: layer.id,\n              name: layer.name,\n              targetPageId: layer.prototype.targetPageId,\n              targetPageName: targetPage?.name ?? \"Unknown page\",\n              targetExists: Boolean(targetPage),\n              trigger: layer.prototype.trigger,\n              action: layer.prototype.action ?? \"navigate\",\n              transition: layer.prototype.transition,\n              durationMs: layer.prototype.durationMs,\n              preserveScroll: layer.prototype.preserveScroll ?? false,\n              scrollBehavior:\n                layer.prototype.scrollBehavior ??\n                (layer.prototype.preserveScroll ? \"preserve\" : \"reset\"),\n              overlayPosition: layer.prototype.overlayPosition ?? \"center\",\n              closeOnOutside: layer.prototype.closeOnOutside ?? true,\n              deviceFrame: layer.prototype.deviceFrame ?? \"none\",\n              smartAnimate: layer.prototype.smartAnimate ?? false,\n              left: toPercent(layer.x - frame.bounds.x, frame.bounds.width),\n              top: toPercent(layer.y - frame.bounds.y, frame.bounds.height),\n              width: toPercent(layer.width, frame.bounds.width),\n              height: toPercent(layer.height, frame.bounds.height),\n            };\n          }),\n      };\n    }),\n  };\n}\n\nfunction isPrototypeHotspot(\n  layer: DesignLayer,\n): layer is DesignLayer & {\n  prototype: NonNullable<DesignLayer[\"prototype\"]>;\n} {\n  return Boolean(layer.visible && layer.prototype?.targetPageId);\n}\n\nfunction toPercent(value: number, total: number) {\n  if (total <= 0) {\n    return 0;\n  }\n\n  return (value / total) * 100;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/prototype-preview.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-prototype-preview-ts-703337c4f24faf12.mjs",
  "kind": "ts",
  "hash": "703337c4f24faf12",
  "dependencies": [
    {
      "specifier": "@/features/editor/exporters/svg-exporter",
      "resolved_path": "src/features/editor/exporters/svg-exporter.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs",
      "kind": "ts",
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
    "source_path": "src/features/editor/prototype-preview.ts",
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
        "specifier": "@/features/editor/exporters/svg-exporter",
        "side_effect_only": false,
        "type_only": false
      },
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
      "getPrototypePreviewModel"
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
