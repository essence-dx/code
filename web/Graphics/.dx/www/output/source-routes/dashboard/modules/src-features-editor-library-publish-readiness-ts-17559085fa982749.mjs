import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-component-documentation-readiness-ts-d0bd51a2a65eb7b7.mjs";
export const dxSourceText = "import type { ComponentUsageAnalytics } from \"@/features/editor/component-analytics\";\nimport {\n  getComponentDocumentationAuditRows,\n  getComponentDocumentationSummary,\n} from \"@/features/editor/component-documentation-readiness\";\nimport type { ComponentInstanceReviewReport } from \"@/features/editor/component-instance-review\";\nimport type { ComponentVariableCoverageReport } from \"@/features/editor/component-variable-coverage\";\nimport type { LocalLibraryStatus } from \"@/features/editor/component-library-manifest\";\nimport type {\n  DesignComponent,\n  DesignLibraryMetadata,\n} from \"@/features/editor/types\";\n\nexport type LibraryPublishReadinessStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type LibraryPublishReadinessItem = {\n  id: string;\n  label: string;\n  detail: string;\n  status: LibraryPublishReadinessStatus;\n};\n\nexport type LibraryPublishReadinessReport = {\n  label: string;\n  score: number;\n  canPublish: boolean;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  items: LibraryPublishReadinessItem[];\n};\n\ntype LibraryPublishReadinessInput = {\n  components: DesignComponent[];\n  analyticsByComponentId: Record<string, ComponentUsageAnalytics>;\n  libraryMetadata?: DesignLibraryMetadata;\n  libraryStatus: LocalLibraryStatus;\n  instanceReview: ComponentInstanceReviewReport;\n  variableCoverage: ComponentVariableCoverageReport;\n};\n\nexport function getLibraryPublishReadiness({\n  components,\n  analyticsByComponentId,\n  libraryMetadata,\n  libraryStatus,\n  instanceReview,\n  variableCoverage,\n}: LibraryPublishReadinessInput): LibraryPublishReadinessReport {\n  const documentationSummary = getComponentDocumentationSummary(\n    components,\n    analyticsByComponentId,\n  );\n  const auditRows = getComponentDocumentationAuditRows(\n    components,\n    analyticsByComponentId,\n  );\n  const componentCount = components.length;\n  const examplesReadyCount = auditRows.filter((row) => row.instanceCount > 0)\n    .length;\n  const variantsReadyCount = auditRows.filter((row) => row.variantCount > 0)\n    .length;\n  const codeConnectReadyCount = auditRows.filter(\n    (row) => row.codeConnectCount > 0,\n  ).length;\n  const hasExplicitMetadata = Boolean(\n    libraryMetadata?.name?.trim() && libraryMetadata.teamName?.trim(),\n  );\n\n  const items: LibraryPublishReadinessItem[] = [\n    {\n      id: \"metadata\",\n      label: \"Metadata\",\n      detail: hasExplicitMetadata\n        ? `${libraryMetadata?.name} / ${libraryMetadata?.teamName}`\n        : \"Library name and team will use local defaults\",\n      status: hasExplicitMetadata ? \"ready\" : \"review\",\n    },\n    {\n      id: \"components\",\n      label: \"Components\",\n      detail:\n        componentCount > 0\n          ? `${componentCount} component${componentCount === 1 ? \"\" : \"s\"} included`\n          : \"Create at least one component before publishing\",\n      status: componentCount > 0 ? \"ready\" : \"blocked\",\n    },\n    {\n      id: \"changes\",\n      label: \"Changes\",\n      detail:\n        libraryStatus.changedCount > 0\n          ? `${libraryStatus.changedCount} unpublished component change${\n              libraryStatus.changedCount === 1 ? \"\" : \"s\"\n            }`\n          : \"No unpublished component changes\",\n      status: libraryStatus.changedCount > 0 ? \"ready\" : \"review\",\n    },\n    {\n      id: \"documentation\",\n      label: \"Documentation\",\n      detail: `${documentationSummary.readyComponents} ready, ${documentationSummary.reviewComponents} review, ${documentationSummary.missingComponents} missing`,\n      status: getDocumentationStatus(\n        documentationSummary.missingComponents,\n        documentationSummary.reviewComponents,\n      ),\n    },\n    {\n      id: \"examples\",\n      label: \"Examples\",\n      detail: `${examplesReadyCount} of ${componentCount} component${\n        componentCount === 1 ? \"\" : \"s\"\n      } placed in a file`,\n      status: getCoverageStatus(examplesReadyCount, componentCount, \"review\"),\n    },\n    {\n      id: \"variants\",\n      label: \"Variants\",\n      detail: `${variantsReadyCount} of ${componentCount} component${\n        componentCount === 1 ? \"\" : \"s\"\n      } define variants`,\n      status: getCoverageStatus(variantsReadyCount, componentCount, \"review\"),\n    },\n    {\n      id: \"code-connect\",\n      label: \"Code Connect\",\n      detail: `${codeConnectReadyCount} of ${componentCount} component${\n        componentCount === 1 ? \"\" : \"s\"\n      } mapped to code`,\n      status: getCoverageStatus(\n        codeConnectReadyCount,\n        componentCount,\n        \"review\",\n      ),\n    },\n    {\n      id: \"variable-coverage\",\n      label: \"Variable coverage\",\n      detail: `${variableCoverage.coveragePercent}% coverage, ${variableCoverage.matchingRawPropertyCount} raw propert${\n        variableCoverage.matchingRawPropertyCount === 1 ? \"y\" : \"ies\"\n      } ready to bind`,\n      status: getVariableCoverageStatus(variableCoverage),\n    },\n    {\n      id: \"source-state\",\n      label: \"Source state\",\n      detail: `${instanceReview.pendingUpdateInstanceCount} pending, ${instanceReview.staleInstanceCount} stale, ${instanceReview.detachedInstanceCount} detached instances`,\n      status: getSourceStateStatus(instanceReview),\n    },\n  ];\n  const readyCount = items.filter((item) => item.status === \"ready\").length;\n  const reviewCount = items.filter((item) => item.status === \"review\").length;\n  const blockedCount = items.filter((item) => item.status === \"blocked\").length;\n  const score = Math.round(\n    ((readyCount + reviewCount * 0.5) / items.length) * 100,\n  );\n\n  return {\n    label: getReadinessLabel(blockedCount, reviewCount),\n    score,\n    canPublish: blockedCount === 0,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    items,\n  };\n}\n\nexport function getLibraryPublishReadinessCsv(\n  report: LibraryPublishReadinessReport,\n) {\n  const header: Array<keyof LibraryPublishReadinessItem> = [\n    \"id\",\n    \"label\",\n    \"status\",\n    \"detail\",\n  ];\n\n  return [\n    [\"score\", report.score].map(escapeCsvCell).join(\",\"),\n    [\"label\", report.label].map(escapeCsvCell).join(\",\"),\n    [\"canPublish\", report.canPublish ? \"yes\" : \"no\"].map(escapeCsvCell).join(\n      \",\",\n    ),\n    \"\",\n    header.join(\",\"),\n    ...report.items.map((item) =>\n      header.map((key) => escapeCsvCell(item[key])).join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nfunction getDocumentationStatus(\n  missingCount: number,\n  reviewCount: number,\n): LibraryPublishReadinessStatus {\n  if (missingCount > 0) {\n    return \"blocked\";\n  }\n\n  if (reviewCount > 0) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getCoverageStatus(\n  readyCount: number,\n  totalCount: number,\n  emptyStatus: LibraryPublishReadinessStatus,\n): LibraryPublishReadinessStatus {\n  if (totalCount === 0) {\n    return emptyStatus;\n  }\n\n  if (readyCount === totalCount) {\n    return \"ready\";\n  }\n\n  return \"review\";\n}\n\nfunction getSourceStateStatus(\n  instanceReview: ComponentInstanceReviewReport,\n): LibraryPublishReadinessStatus {\n  if (instanceReview.pendingUpdateInstanceCount > 0) {\n    return \"blocked\";\n  }\n\n  if (\n    instanceReview.staleInstanceCount > 0 ||\n    instanceReview.detachedInstanceCount > 0\n  ) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getVariableCoverageStatus(\n  report: ComponentVariableCoverageReport,\n): LibraryPublishReadinessStatus {\n  if (report.componentCount === 0) {\n    return \"review\";\n  }\n\n  if (report.coveragePercent >= 80) {\n    return \"ready\";\n  }\n\n  if (report.coveragePercent >= 40 || report.matchingRawPropertyCount > 0) {\n    return \"review\";\n  }\n\n  return \"blocked\";\n}\n\nfunction getReadinessLabel(blockedCount: number, reviewCount: number) {\n  if (blockedCount > 0) {\n    return \"Blocked\";\n  }\n\n  if (reviewCount > 0) {\n    return \"Needs review\";\n  }\n\n  return \"Ready\";\n}\n\nfunction escapeCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replace(/\"/g, '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/library-publish-readiness.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-library-publish-readiness-ts-17559085fa982749.mjs",
  "kind": "ts",
  "hash": "17559085fa982749",
  "dependencies": [
    {
      "specifier": "@/features/editor/component-documentation-readiness",
      "resolved_path": "src/features/editor/component-documentation-readiness.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-documentation-readiness-ts-d0bd51a2a65eb7b7.mjs",
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
    "source_path": "src/features/editor/library-publish-readiness.ts",
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
        "specifier": "@/features/editor/component-analytics",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/component-documentation-readiness",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-instance-review",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/component-variable-coverage",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/component-library-manifest",
        "side_effect_only": false,
        "type_only": true
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
      "getLibraryPublishReadiness",
      "getLibraryPublishReadinessCsv"
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
