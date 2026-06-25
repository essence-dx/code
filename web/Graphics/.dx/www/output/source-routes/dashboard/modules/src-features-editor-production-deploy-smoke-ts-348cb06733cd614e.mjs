import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs";
export const dxSourceText = "import {\n  getPrototypeFlowDiagnostics,\n  type PrototypeFlowDiagnostics,\n} from \"@/features/editor/prototype-flow-diagnostics\";\nimport type { DesignDocument, DesignPage } from \"@/features/editor/types\";\n\nexport type ProductionDeploySmokeStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type ProductionDeploySmokeKind =\n  | \"admin\"\n  | \"auth\"\n  | \"embed\"\n  | \"editor\"\n  | \"prototype\"\n  | \"release-handoff\"\n  | \"share\";\n\nexport type ProductionDeploySmokeRow = {\n  id: string;\n  status: ProductionDeploySmokeStatus;\n  kind: ProductionDeploySmokeKind;\n  label: string;\n  route: string;\n  method: \"GET\" | \"POST\" | \"UI\";\n  required: boolean;\n  waitFor: string;\n  evidence: string;\n  detail: string;\n  command: string;\n  recommendation: string;\n};\n\nexport type ProductionDeploySmokeReport = {\n  generatedAt: string;\n  baseUrl: string;\n  shareToken: string;\n  status: ProductionDeploySmokeStatus;\n  score: number;\n  routeCount: number;\n  requiredRouteCount: number;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  prototypeStartPageCount: number;\n  prototypeHotspotCount: number;\n  commands: string[];\n  rows: ProductionDeploySmokeRow[];\n};\n\nexport const defaultProductionDeploySmokeShareToken = \"visual-fixture\";\n\nexport function getProductionDeploySmokeReport({\n  document,\n  activePage,\n  baseUrl = \"https://<deployment-url>\",\n  generatedAt = new Date().toISOString(),\n  shareToken = defaultProductionDeploySmokeShareToken,\n}: {\n  document: DesignDocument;\n  activePage: DesignPage;\n  baseUrl?: string;\n  generatedAt?: string;\n  shareToken?: string;\n}): ProductionDeploySmokeReport {\n  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);\n  const normalizedShareToken =\n    shareToken.trim() || defaultProductionDeploySmokeShareToken;\n  const prototype = getPrototypeFlowDiagnostics(document);\n  const rows = getDeploySmokeRows({\n    activePage,\n    baseUrl: normalizedBaseUrl,\n    document,\n    prototype,\n    shareToken: normalizedShareToken,\n  });\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n\n  return {\n    generatedAt,\n    baseUrl: normalizedBaseUrl,\n    shareToken: normalizedShareToken,\n    status:\n      blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),\n    routeCount: rows.length,\n    requiredRouteCount: rows.filter((row) => row.required).length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    prototypeStartPageCount: prototype.startPageCount,\n    prototypeHotspotCount: prototype.hotspotCount,\n    commands: getSmokeCommands(normalizedBaseUrl, normalizedShareToken),\n    rows,\n  };\n}\n\nexport function getProductionDeploySmokeJson(\n  report: ProductionDeploySmokeReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getProductionDeploySmokeCsv(\n  report: ProductionDeploySmokeReport,\n) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"kind\",\n      \"method\",\n      \"route\",\n      \"required\",\n      \"wait_for\",\n      \"evidence\",\n      \"detail\",\n      \"command\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.kind,\n        row.method,\n        row.route,\n        row.required,\n        row.waitFor,\n        row.evidence,\n        row.detail,\n        row.command,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getProductionDeploySmokeMarkdown(\n  report: ProductionDeploySmokeReport,\n) {\n  return [\n    \"# Production Deploy Smoke Checklist\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Base URL: ${report.baseUrl}`,\n    `Share token: ${report.shareToken}`,\n    `Routes: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"Run this handoff against an already deployed Vercel URL. It does not require a local production build.\",\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n    \"\",\n    \"## Routes\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.method} ${row.route}) - wait for \"${row.waitFor}\". Evidence: ${row.evidence}. ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction getDeploySmokeRows({\n  activePage,\n  baseUrl,\n  document,\n  prototype,\n  shareToken,\n}: {\n  activePage: DesignPage;\n  baseUrl: string;\n  document: DesignDocument;\n  prototype: PrototypeFlowDiagnostics;\n  shareToken: string;\n}) {\n  const hasActivePage = document.pages.some((page) => page.id === activePage.id);\n  const hasPrototypeStart = prototype.startPageCount > 0;\n  const hasPrototypeBlockers = prototype.issues.some(\n    (issue) => issue.severity === \"high\",\n  );\n  const activityCount = document.activityEvents?.length ?? 0;\n\n  return [\n    {\n      id: \"auth-email-password-otp\",\n      status: \"ready\",\n      kind: \"auth\",\n      label: \"Email/password and OTP auth\",\n      route: \"/api/auth/[...all]\",\n      method: \"POST\",\n      required: true,\n      waitFor: \"session cookie after OTP verification\",\n      evidence: \"Sign in with seeded admin and confirm the editor unlocks.\",\n      detail:\n        \"Better Auth handles email/password and OTP verification through the Next.js auth route.\",\n      command:\n        \"Run an interactive sign-in smoke with admin@mail.com after deployment.\",\n      recommendation:\n        \"Confirm BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, BREVO_API_KEY, and Turso envs are set on Vercel before the smoke.\",\n    },\n    {\n      id: \"editor-home\",\n      status: hasActivePage ? \"ready\" : \"blocked\",\n      kind: \"editor\",\n      label: \"Authenticated editor\",\n      route: \"/\",\n      method: \"GET\",\n      required: true,\n      waitFor: \"Files\",\n      evidence: \"Route probe should find the file browser and editor shell.\",\n      detail: hasActivePage\n        ? `Active page ${activePage.name} is present for editor smoke coverage.`\n        : \"The document active page is missing from the page list.\",\n      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} bun run visual:routes`,\n      recommendation:\n        \"Use the seeded visual fixture so the editor route has stable layers, comments, and prototype data.\",\n    },\n    {\n      id: \"admin-dashboard\",\n      status: \"ready\",\n      kind: \"admin\",\n      label: \"Admin dashboard\",\n      route: \"/dashboard\",\n      method: \"GET\",\n      required: true,\n      waitFor: \"Admin\",\n      evidence:\n        \"Route probe should render admin workspace health, users, shares, and audit panels.\",\n      detail: \"The admin route is part of the authenticated production smoke set.\",\n      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} bun run visual:routes`,\n      recommendation:\n        \"Seed admin@mail.com and verify the account has administrator access before probing Vercel.\",\n    },\n    {\n      id: \"public-share-handoff\",\n      status: shareToken ? \"ready\" : \"review\",\n      kind: \"share\",\n      label: \"Public share handoff\",\n      route: `/share/${shareToken || \"<token>\"}`,\n      method: \"GET\",\n      required: true,\n      waitFor: \"shared file\",\n      evidence:\n        \"Route probe should load a public handoff without an authenticated session.\",\n      detail: shareToken\n        ? `Using share token ${shareToken} for public handoff coverage.`\n        : \"No share token is configured for public handoff smoke coverage.\",\n      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken || \"<token>\"} bun run visual:routes`,\n      recommendation:\n        \"Use the seeded visual fixture token or create a fresh handoff link before production approval.\",\n    },\n    {\n      id: \"public-prototype\",\n      status: hasPrototypeBlockers || !hasPrototypeStart ? \"review\" : \"ready\",\n      kind: \"prototype\",\n      label: \"Public prototype preview\",\n      route: `/share/${shareToken || \"<token>\"}/prototype`,\n      method: \"GET\",\n      required: true,\n      waitFor: \"Prototype\",\n      evidence:\n        \"Route probe should load the share prototype view and find prototype UI text.\",\n      detail: hasPrototypeStart\n        ? `${prototype.startPageCount} start page and ${prototype.hotspotCount} hotspot${prototype.hotspotCount === 1 ? \"\" : \"s\"} are available.`\n        : \"No prototype start page is marked for this document.\",\n      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken || \"<token>\"} bun run visual:routes`,\n      recommendation:\n        \"Mark one prototype start page and clear broken hotspot targets before calling the prototype route fully ready.\",\n    },\n    {\n      id: \"public-embed\",\n      status: shareToken ? \"ready\" : \"review\",\n      kind: \"embed\",\n      label: \"Public embed preview\",\n      route: `/embed/${shareToken || \"<token>\"}`,\n      method: \"GET\",\n      required: true,\n      waitFor: \"Prototype\",\n      evidence:\n        \"Route probe should load an iframe-friendly public embed surface without an authenticated session.\",\n      detail: shareToken\n        ? `Using share token ${shareToken} for public embed coverage.`\n        : \"No share token is configured for public embed smoke coverage.\",\n      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken || \"<token>\"} bun run visual:routes`,\n      recommendation:\n        \"Use the embed route for controlled external surfaces and keep the source share expiry reviewed.\",\n    },\n    {\n      id: \"release-handoff-export\",\n      status: activityCount > 0 ? \"ready\" : \"review\",\n      kind: \"release-handoff\",\n      label: \"Release handoff export\",\n      route: \"Extensions > Performance release export\",\n      method: \"UI\",\n      required: true,\n      waitFor: \"JSON and Handoff downloads\",\n      evidence:\n        \"Download performance, runtime, baseline, collaboration, and deploy-smoke evidence before release approval.\",\n      detail: activityCount > 0\n        ? `${activityCount} activity event${activityCount === 1 ? \"\" : \"s\"} are available for release context.`\n        : \"No activity events are available to attach to release handoff context.\",\n      command: \"Export JSON and Handoff from the Extensions production panels.\",\n      recommendation:\n        \"Attach the JSON and Markdown exports to the release notes for reviewer repeatability.\",\n    },\n  ] satisfies ProductionDeploySmokeRow[];\n}\n\nfunction getSmokeCommands(baseUrl: string, shareToken: string) {\n  return [\n    \"bun run seed:admin\",\n    \"bun run visual:seed-fixture\",\n    `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken} bun run visual:routes`,\n    \"bun run visual:summary -- --routes artifacts/visual-regression/<run-id>/route-health.json\",\n  ];\n}\n\nfunction normalizeBaseUrl(value: string) {\n  return value.trim().replace(/\\/+$/, \"\") || \"https://<deployment-url>\";\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/production-deploy-smoke.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-production-deploy-smoke-ts-348cb06733cd614e.mjs",
  "kind": "ts",
  "hash": "348cb06733cd614e",
  "dependencies": [
    {
      "specifier": "@/features/editor/prototype-flow-diagnostics",
      "resolved_path": "src/features/editor/prototype-flow-diagnostics.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs",
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
    "source_path": "src/features/editor/production-deploy-smoke.ts",
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
        "specifier": "@/features/editor/prototype-flow-diagnostics",
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
      "getProductionDeploySmokeReport",
      "getProductionDeploySmokeJson",
      "getProductionDeploySmokeCsv",
      "getProductionDeploySmokeMarkdown",
      "defaultProductionDeploySmokeShareToken"
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
