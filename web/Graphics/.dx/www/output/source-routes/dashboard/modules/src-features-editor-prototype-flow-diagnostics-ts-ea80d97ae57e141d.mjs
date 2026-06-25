
export const dxSourceText = "import type { DesignDocument } from \"@/features/editor/types\";\n\nexport type PrototypeFlowPageNode = {\n  pageId: string;\n  pageName: string;\n  prototypeStart: boolean;\n  outgoingCount: number;\n  incomingCount: number;\n  brokenCount: number;\n};\n\nexport type PrototypeFlowIssue = {\n  id: string;\n  severity: \"high\" | \"medium\" | \"low\";\n  pageId: string;\n  pageName: string;\n  layerId?: string;\n  layerName?: string;\n  targetPageId?: string;\n  label: string;\n  detail: string;\n};\n\nexport type PrototypeFlowDiagnostics = {\n  pageCount: number;\n  startPageCount: number;\n  hotspotCount: number;\n  brokenCount: number;\n  warningCount: number;\n  deadEndCount: number;\n  unreachableCount: number;\n  pages: PrototypeFlowPageNode[];\n  issues: PrototypeFlowIssue[];\n};\n\nexport function getPrototypeFlowDiagnostics(\n  document: DesignDocument,\n): PrototypeFlowDiagnostics {\n  const pagesById = new Map(document.pages.map((page) => [page.id, page]));\n  const nodes = new Map<string, PrototypeFlowPageNode>(\n    document.pages.map((page) => [\n      page.id,\n      {\n        pageId: page.id,\n        pageName: page.name,\n        prototypeStart: Boolean(page.prototypeStart),\n        outgoingCount: 0,\n        incomingCount: 0,\n        brokenCount: 0,\n      },\n    ]),\n  );\n  const issues: PrototypeFlowIssue[] = [];\n  let hotspotCount = 0;\n\n  for (const page of document.pages) {\n    const node = nodes.get(page.id);\n\n    for (const layer of page.layers) {\n      if (!layer.prototype) {\n        continue;\n      }\n\n      hotspotCount += 1;\n\n      if (node) {\n        node.outgoingCount += 1;\n      }\n\n      const targetPage = pagesById.get(layer.prototype.targetPageId);\n\n      if (targetPage) {\n        const targetNode = nodes.get(targetPage.id);\n\n        if (targetNode) {\n          targetNode.incomingCount += 1;\n        }\n        continue;\n      }\n\n      if (node) {\n        node.brokenCount += 1;\n      }\n\n      issues.push({\n        id: `${page.id}:${layer.id}`,\n        severity: \"high\",\n        pageId: page.id,\n        pageName: page.name,\n        layerId: layer.id,\n        layerName: layer.name,\n        targetPageId: layer.prototype.targetPageId,\n        label: \"Broken hotspot target\",\n        detail: `${layer.name} targets missing page ${layer.prototype.targetPageId}.`,\n      });\n    }\n  }\n\n  const pageNodes = Array.from(nodes.values());\n\n  if (hotspotCount > 0 && document.pages.every((page) => !page.prototypeStart)) {\n    const firstPage = document.pages[0];\n\n    if (firstPage) {\n      issues.push({\n        id: `${firstPage.id}:missing-start`,\n        severity: \"high\",\n        pageId: firstPage.id,\n        pageName: firstPage.name,\n        label: \"Missing start page\",\n        detail: \"Prototype has hotspots but no page is marked as a starting point.\",\n      });\n    }\n  }\n\n  if (document.pages.filter((page) => page.prototypeStart).length > 1) {\n    for (const page of document.pages.filter((item) => item.prototypeStart)) {\n      issues.push({\n        id: `${page.id}:multiple-starts`,\n        severity: \"medium\",\n        pageId: page.id,\n        pageName: page.name,\n        label: \"Multiple start pages\",\n        detail: \"This file has more than one prototype start page.\",\n      });\n    }\n  }\n\n  for (const page of pageNodes) {\n    if (!page.prototypeStart && page.incomingCount === 0 && page.outgoingCount > 0) {\n      issues.push({\n        id: `${page.pageId}:unreachable`,\n        severity: \"medium\",\n        pageId: page.pageId,\n        pageName: page.pageName,\n        label: \"Unreachable prototype page\",\n        detail: \"Page has outgoing hotspots but no incoming path from another page.\",\n      });\n    }\n\n    if (page.incomingCount > 0 && page.outgoingCount === 0) {\n      issues.push({\n        id: `${page.pageId}:dead-end`,\n        severity: \"low\",\n        pageId: page.pageId,\n        pageName: page.pageName,\n        label: \"Prototype dead end\",\n        detail: \"Page can be reached but has no outgoing hotspot.\",\n      });\n    }\n  }\n\n  return {\n    pageCount: document.pages.length,\n    startPageCount: document.pages.filter((page) => page.prototypeStart).length,\n    hotspotCount,\n    brokenCount: issues.filter((issue) => issue.label === \"Broken hotspot target\")\n      .length,\n    warningCount: issues.length,\n    deadEndCount: issues.filter((issue) => issue.label === \"Prototype dead end\")\n      .length,\n    unreachableCount: issues.filter(\n      (issue) => issue.label === \"Unreachable prototype page\",\n    ).length,\n    pages: pageNodes,\n    issues: issues.sort((left, right) => {\n      if (left.severity !== right.severity) {\n        return getSeverityRank(left.severity) - getSeverityRank(right.severity);\n      }\n\n      return left.pageName.localeCompare(right.pageName);\n    }),\n  };\n}\n\nexport function getPrototypeFlowDiagnosticsCsv(\n  report: PrototypeFlowDiagnostics,\n) {\n  return [\n    [\"severity\", \"page\", \"layer\", \"label\", \"detail\", \"targetPageId\"],\n    ...report.issues.map((issue) => [\n      issue.severity,\n      issue.pageName,\n      issue.layerName ?? \"\",\n      issue.label,\n      issue.detail,\n      issue.targetPageId ?? \"\",\n    ]),\n  ]\n    .map((row) => row.map(formatCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getPrototypeFlowDiagnosticsMarkdown(\n  report: PrototypeFlowDiagnostics,\n) {\n  const lines = [\n    \"# Prototype Flow Review\",\n    \"\",\n    `Pages: ${report.pageCount}`,\n    `Start pages: ${report.startPageCount}`,\n    `Hotspots: ${report.hotspotCount}`,\n    `Broken targets: ${report.brokenCount}`,\n    `Unreachable pages: ${report.unreachableCount}`,\n    `Dead ends: ${report.deadEndCount}`,\n    \"\",\n    \"## Issues\",\n    \"\",\n  ];\n\n  if (report.issues.length === 0) {\n    lines.push(\"- No prototype flow issues found.\");\n  }\n\n  for (const issue of report.issues) {\n    const layer = issue.layerName ? ` / ${issue.layerName}` : \"\";\n    lines.push(\n      `- ${issue.severity.toUpperCase()} - ${issue.pageName}${layer}: ${issue.label}. ${issue.detail}`,\n    );\n  }\n\n  lines.push(\"\", \"## Pages\", \"\");\n\n  for (const page of report.pages) {\n    lines.push(\n      `- ${page.pageName}${page.prototypeStart ? \" (start)\" : \"\"}: out ${page.outgoingCount}, in ${page.incomingCount}, broken ${page.brokenCount}`,\n    );\n  }\n\n  return lines.join(\"\\n\");\n}\n\nexport function getRecommendedPrototypeStartPageId(\n  report: PrototypeFlowDiagnostics,\n) {\n  if (report.startPageCount === 1) {\n    return null;\n  }\n\n  return (\n    report.pages.find(\n      (page) => page.prototypeStart && page.outgoingCount > 0,\n    )?.pageId ??\n    report.pages.find((page) => page.outgoingCount > 0 && page.incomingCount === 0)\n      ?.pageId ??\n    report.pages.find((page) => page.outgoingCount > 0)?.pageId ??\n    report.pages[0]?.pageId ??\n    null\n  );\n}\n\nfunction getSeverityRank(severity: PrototypeFlowIssue[\"severity\"]) {\n  if (severity === \"high\") {\n    return 0;\n  }\n\n  if (severity === \"medium\") {\n    return 1;\n  }\n\n  return 2;\n}\n\nfunction formatCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/prototype-flow-diagnostics.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs",
  "kind": "ts",
  "hash": "ea80d97ae57e141d",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/prototype-flow-diagnostics.ts",
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
      "getPrototypeFlowDiagnostics",
      "getPrototypeFlowDiagnosticsCsv",
      "getPrototypeFlowDiagnosticsMarkdown",
      "getRecommendedPrototypeStartPageId"
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
