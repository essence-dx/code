
export const dxSourceText = "import type {\n  DesignDocument,\n  DesignLayer,\n  DesignPage,\n} from \"@/features/editor/types\";\n\nexport type DocumentStats = {\n  pageCount: number;\n  layerCount: number;\n  componentCount: number;\n  variableCount: number;\n  commentCount: number;\n  unresolvedCommentCount: number;\n  prototypeHotspotCount: number;\n  prototypeStartPages: Array<{\n    id: string;\n    name: string;\n  }>;\n  brokenPrototypeHotspots: Array<{\n    pageName: string;\n    layerName: string;\n    targetPageId: string;\n  }>;\n  activePagePrototypeHotspots: Array<{\n    id: string;\n    name: string;\n    targetPageName: string;\n    targetExists: boolean;\n    trigger: string;\n    action: string;\n    transition: string;\n    durationMs: number;\n    preserveScroll: boolean;\n    scrollBehavior: string;\n    overlayPosition: string;\n    deviceFrame: string;\n    smartAnimate: boolean;\n  }>;\n  activePage: DesignPage;\n  activePageBounds: {\n    width: number;\n    height: number;\n  };\n  layerTypeCounts: Array<{\n    type: DesignLayer[\"type\"];\n    count: number;\n  }>;\n};\n\nexport function getDocumentStats(document: DesignDocument): DocumentStats {\n  const activePage =\n    document.pages.find((page) => page.id === document.activePageId) ??\n    document.pages[0] ??\n    createFallbackPage();\n  const layers = activePage.layers;\n  const comments = document.pages.flatMap((page) => page.comments ?? []);\n  const pagesById = new Map(document.pages.map((page) => [page.id, page]));\n\n  return {\n    pageCount: document.pages.length,\n    layerCount: layers.length,\n    componentCount: Object.keys(document.components ?? {}).length,\n    variableCount: Object.keys(\n      document.variableDefinitions ?? document.variables ?? {},\n    ).length,\n    commentCount: comments.length,\n    unresolvedCommentCount: comments.filter((comment) => !comment.resolved)\n      .length,\n    prototypeHotspotCount: document.pages.reduce(\n      (count, page) =>\n        count + page.layers.filter((layer) => layer.prototype).length,\n      0,\n    ),\n    prototypeStartPages: document.pages\n      .filter((page) => page.prototypeStart)\n      .map((page) => ({ id: page.id, name: page.name })),\n    brokenPrototypeHotspots: document.pages.flatMap((page) =>\n      page.layers\n        .filter(\n          (layer) =>\n            layer.prototype?.targetPageId &&\n            !pagesById.has(layer.prototype.targetPageId),\n        )\n        .map((layer) => ({\n          pageName: page.name,\n          layerName: layer.name,\n          targetPageId: layer.prototype?.targetPageId ?? \"\",\n        })),\n    ),\n    activePagePrototypeHotspots: layers\n      .filter((layer) => layer.prototype)\n      .map((layer) => ({\n        id: layer.id,\n        name: layer.name,\n        targetPageName:\n          pagesById.get(layer.prototype?.targetPageId ?? \"\")?.name ??\n          \"Unknown page\",\n        targetExists: pagesById.has(layer.prototype?.targetPageId ?? \"\"),\n        trigger: layer.prototype?.trigger ?? \"click\",\n        action: layer.prototype?.action ?? \"navigate\",\n        transition: layer.prototype?.transition ?? \"instant\",\n        durationMs: layer.prototype?.durationMs ?? 0,\n        preserveScroll: layer.prototype?.preserveScroll ?? false,\n        scrollBehavior:\n          layer.prototype?.scrollBehavior ??\n          (layer.prototype?.preserveScroll ? \"preserve\" : \"reset\"),\n        overlayPosition: layer.prototype?.overlayPosition ?? \"center\",\n        deviceFrame: layer.prototype?.deviceFrame ?? \"none\",\n        smartAnimate: layer.prototype?.smartAnimate ?? false,\n      })),\n    activePage,\n    activePageBounds: getLayerBounds(layers),\n    layerTypeCounts: getLayerTypeCounts(layers),\n  };\n}\n\nfunction getLayerTypeCounts(layers: DesignLayer[]) {\n  const counts = new Map<DesignLayer[\"type\"], number>();\n\n  layers.forEach((layer) => {\n    counts.set(layer.type, (counts.get(layer.type) ?? 0) + 1);\n  });\n\n  return Array.from(counts.entries())\n    .map(([type, count]) => ({ type, count }))\n    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));\n}\n\nfunction getLayerBounds(layers: DesignLayer[]) {\n  if (layers.length === 0) {\n    return { width: 0, height: 0 };\n  }\n\n  const minX = Math.min(...layers.map((layer) => layer.x));\n  const minY = Math.min(...layers.map((layer) => layer.y));\n  const maxX = Math.max(...layers.map((layer) => layer.x + layer.width));\n  const maxY = Math.max(...layers.map((layer) => layer.y + layer.height));\n\n  return {\n    width: Math.round(maxX - minX),\n    height: Math.round(maxY - minY),\n  };\n}\n\nfunction createFallbackPage(): DesignPage {\n  return {\n    id: \"missing\",\n    name: \"Missing page\",\n    background: \"#0f172a\",\n    layers: [],\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/document-stats.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-document-stats-ts-a755d567b350cb73.mjs",
  "kind": "ts",
  "hash": "a755d567b350cb73",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/document-stats.ts",
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
      "getDocumentStats"
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
