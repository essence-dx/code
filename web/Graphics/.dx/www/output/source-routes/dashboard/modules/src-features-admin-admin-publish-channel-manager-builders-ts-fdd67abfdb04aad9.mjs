import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs";
export const dxSourceText = "import { getPrototypeFlowDiagnostics } from \"@/features/editor/prototype-flow-diagnostics\";\nimport type {\n  AdminPublishApprovalState,\n  AdminPublishChannel,\n  AdminPublishChannelKind,\n  AdminPublishChannelManagerInput,\n  AdminPublishChannelShare,\n  AdminPublishChannelStatus,\n  AdminPublishRollbackState,\n} from \"@/features/admin/admin-publish-channel-manager-types\";\n\nexport function toShareChannel({\n  baseUrl,\n  file,\n  latestApproval,\n  now,\n  productionDeploySmoke,\n  rollbackReadiness,\n  share,\n}: {\n  baseUrl: string;\n  file: AdminPublishChannelManagerInput[\"files\"][number] | undefined;\n  latestApproval: AdminPublishChannelManagerInput[\"releaseApprovalSnapshots\"][number] | null;\n  now: number;\n  productionDeploySmoke: AdminPublishChannelManagerInput[\"productionDeploySmoke\"];\n  rollbackReadiness: AdminPublishChannelManagerInput[\"rollbackReadiness\"];\n  share: AdminPublishChannelShare;\n}): AdminPublishChannel {\n  const kind = getShareKind(share);\n  const smoke = getSmokeRoute(productionDeploySmoke, kind);\n  const prototype = file ? getPrototypeFlowDiagnostics(file.document) : null;\n  const approvalState = getApprovalState(latestApproval);\n  const rollbackState = getRollbackState(rollbackReadiness, share.fileId);\n  const expired = share.expiresAt ? new Date(share.expiresAt).getTime() < now : false;\n  const warnings = [\n    share.allowDownload ? \"Download is enabled on this public channel.\" : \"\",\n    share.allowComments ? \"Comments are enabled on this public channel.\" : \"\",\n    !share.expiresAt ? \"No expiry is set for this public channel.\" : \"\",\n    approvalState === \"missing\" ? \"No release approval snapshot is attached.\" : \"\",\n    rollbackState !== \"linked\" ? \"No rollback version link is available.\" : \"\",\n    prototype && kind === \"prototype\" && prototype.warningCount > 0\n      ? `${prototype.warningCount} prototype warnings need review.`\n      : \"\",\n  ].filter(Boolean);\n  const blockers = [\n    !file ? \"Source file is missing from the admin file window.\" : \"\",\n    expired ? \"Public channel is expired.\" : \"\",\n    smoke.status === \"blocked\" ? \"Route smoke is blocked.\" : \"\",\n    prototype && kind === \"prototype\" && prototype.brokenCount > 0\n      ? \"Prototype has broken targets.\"\n      : \"\",\n  ].filter(Boolean);\n  const status = getChannelStatus({ blockers, routeSmokeStatus: smoke.status, warnings });\n\n  return {\n    id: `share-${share.id}`,\n    kind,\n    status,\n    label: `${share.fileName} ${share.permissionPreset}`,\n    fileId: share.fileId,\n    fileName: share.fileName,\n    ownerEmail: share.ownerEmail,\n    targetUrl: joinUrl(baseUrl, share.sharePath),\n    shareId: share.id,\n    permissionPreset: share.permissionPreset,\n    approvalState,\n    rollbackState,\n    routeSmokeStatus: smoke.status,\n    routeSmokeLabel: smoke.label,\n    routeSmokeAt: productionDeploySmoke.generatedAt,\n    expiresAt: share.expiresAt,\n    latestAt: share.createdAt,\n    blockerCount: blockers.length,\n    reviewCount: warnings.length,\n    evidence: getEvidence({ approvalState, rollbackState, smokeStatus: smoke.status }),\n    blockers,\n    warnings,\n    recommendation:\n      status === \"ready\"\n        ? \"Channel is ready for production handoff.\"\n        : \"Refresh smoke, approval, rollback, expiry, or prototype evidence before publishing.\",\n  };\n}\n\nexport function toPrototypeGapChannel({\n  baseUrl,\n  file,\n  latestApproval,\n  productionDeploySmoke,\n  rollbackReadiness,\n}: {\n  baseUrl: string;\n  file: AdminPublishChannelManagerInput[\"files\"][number];\n  latestApproval: AdminPublishChannelManagerInput[\"releaseApprovalSnapshots\"][number] | null;\n  productionDeploySmoke: AdminPublishChannelManagerInput[\"productionDeploySmoke\"];\n  rollbackReadiness: AdminPublishChannelManagerInput[\"rollbackReadiness\"];\n}): AdminPublishChannel {\n  const prototype = getPrototypeFlowDiagnostics(file.document);\n  const smoke = getSmokeRoute(productionDeploySmoke, \"prototype\");\n  const approvalState = getApprovalState(latestApproval);\n  const rollbackState = getRollbackState(rollbackReadiness, file.fileId);\n  const blockers = [\n    prototype.brokenCount > 0 ? \"Prototype has broken targets.\" : \"\",\n    prototype.startPageCount === 0 ? \"Prototype start page is missing.\" : \"\",\n  ].filter(Boolean);\n  const warnings = [\n    \"No active prototype share channel exists for this interactive file.\",\n    approvalState === \"missing\" ? \"No release approval snapshot is attached.\" : \"\",\n    rollbackState !== \"linked\" ? \"No rollback version link is available.\" : \"\",\n  ].filter(Boolean);\n  const status = getChannelStatus({ blockers, routeSmokeStatus: smoke.status, warnings });\n\n  return {\n    id: `prototype-gap-${file.fileId}`,\n    kind: \"prototype\",\n    status,\n    label: `${file.fileName} prototype`,\n    fileId: file.fileId,\n    fileName: file.fileName,\n    ownerEmail: file.ownerEmail,\n    targetUrl: joinUrl(baseUrl, \"/share/<token>/prototype\"),\n    shareId: null,\n    permissionPreset: \"prototype\",\n    approvalState,\n    rollbackState,\n    routeSmokeStatus: smoke.status,\n    routeSmokeLabel: smoke.label,\n    routeSmokeAt: productionDeploySmoke.generatedAt,\n    expiresAt: null,\n    latestAt: file.updatedAt,\n    blockerCount: blockers.length,\n    reviewCount: warnings.length,\n    evidence: getEvidence({ approvalState, rollbackState, smokeStatus: smoke.status }),\n    blockers,\n    warnings,\n    recommendation:\n      \"Create a prototype share link after fixing start-page and target readiness.\",\n  };\n}\n\nexport function toReleaseChannel({\n  baseUrl,\n  latestApproval,\n  productionDeploySmoke,\n  rollbackReadiness,\n}: {\n  baseUrl: string;\n  latestApproval: AdminPublishChannelManagerInput[\"releaseApprovalSnapshots\"][number] | null;\n  productionDeploySmoke: AdminPublishChannelManagerInput[\"productionDeploySmoke\"];\n  rollbackReadiness: AdminPublishChannelManagerInput[\"rollbackReadiness\"];\n}): AdminPublishChannel {\n  const smoke = getSmokeRoute(productionDeploySmoke, \"release\");\n  const approvalState = getApprovalState(latestApproval);\n  const rollbackState =\n    rollbackReadiness.deploymentLinkCount > 0 ? \"linked\" : \"missing\";\n  const blockers = [\n    smoke.status === \"blocked\" ? \"Release handoff smoke is blocked.\" : \"\",\n    approvalState === \"blocked\" ? \"Latest approval snapshot is blocked.\" : \"\",\n  ].filter(Boolean);\n  const warnings = [\n    approvalState === \"missing\" ? \"No release approval snapshot is attached.\" : \"\",\n    rollbackState !== \"linked\" ? \"No rollback deployment link is available.\" : \"\",\n  ].filter(Boolean);\n  const status = getChannelStatus({ blockers, routeSmokeStatus: smoke.status, warnings });\n\n  return {\n    id: \"release-handoff\",\n    kind: \"release\",\n    status,\n    label: \"Production release handoff\",\n    fileId: null,\n    fileName: \"Workspace\",\n    ownerEmail: \"workspace\",\n    targetUrl: latestApproval?.deploymentUrl || baseUrl || productionDeploySmoke.baseUrl,\n    shareId: null,\n    permissionPreset: null,\n    approvalState,\n    rollbackState,\n    routeSmokeStatus: smoke.status,\n    routeSmokeLabel: smoke.label,\n    routeSmokeAt: productionDeploySmoke.generatedAt,\n    expiresAt: null,\n    latestAt: latestApproval?.createdAt ?? productionDeploySmoke.generatedAt,\n    blockerCount: blockers.length,\n    reviewCount: warnings.length,\n    evidence: getEvidence({ approvalState, rollbackState, smokeStatus: smoke.status }),\n    blockers,\n    warnings,\n    recommendation:\n      status === \"ready\"\n        ? \"Release channel has smoke, approval, and rollback evidence.\"\n        : \"Refresh release approval, smoke, and rollback links before production promotion.\",\n  };\n}\n\nexport function sortPublishChannels(\n  left: AdminPublishChannel,\n  right: AdminPublishChannel,\n) {\n  return (\n    statusWeight(left.status) - statusWeight(right.status) ||\n    kindWeight(left.kind) - kindWeight(right.kind) ||\n    left.label.localeCompare(right.label)\n  );\n}\n\nexport function getStatusFromApproval(\n  state: AdminPublishApprovalState,\n): AdminPublishChannelStatus {\n  if (state === \"blocked\") {\n    return \"blocked\";\n  }\n\n  return state === \"approved\" ? \"ready\" : \"review\";\n}\n\nfunction getShareKind(share: AdminPublishChannelShare): AdminPublishChannelKind {\n  if (share.permissionPreset === \"prototype\" || share.accessLevel === \"prototype\") {\n    return \"prototype\";\n  }\n\n  if (share.permissionPreset === \"handoff\" && share.allowDownload) {\n    return \"site\";\n  }\n\n  return \"share\";\n}\n\nfunction getSmokeRoute(\n  report: AdminPublishChannelManagerInput[\"productionDeploySmoke\"],\n  kind: AdminPublishChannelKind,\n) {\n  const smokeKind =\n    kind === \"prototype\"\n      ? \"prototype\"\n      : kind === \"release\"\n        ? \"release-handoff\"\n        : \"share\";\n  const matches = report.rows.filter((row) => row.kind === smokeKind);\n\n  return {\n    status: getWorstStatus(matches.map((row) => row.status), \"review\"),\n    label: matches[0]?.label ?? `${smokeKind} route smoke`,\n  };\n}\n\nfunction getApprovalState(\n  latestApproval: AdminPublishChannelManagerInput[\"releaseApprovalSnapshots\"][number] | null,\n): AdminPublishApprovalState {\n  if (!latestApproval) {\n    return \"missing\";\n  }\n\n  if (\n    latestApproval.preflightStatus === \"blocked\" ||\n    latestApproval.incidentStatus === \"blocked\"\n  ) {\n    return \"blocked\";\n  }\n\n  return latestApproval.preflightStatus === \"ready\" &&\n    latestApproval.incidentStatus === \"ready\" &&\n    latestApproval.smokeArtifacts.length > 0\n    ? \"approved\"\n    : \"review\";\n}\n\nfunction getRollbackState(\n  rollbackReadiness: AdminPublishChannelManagerInput[\"rollbackReadiness\"],\n  fileId: string,\n): AdminPublishRollbackState {\n  if (rollbackReadiness.latestVersions.some((version) => version.fileId === fileId)) {\n    return \"linked\";\n  }\n\n  return rollbackReadiness.status === \"blocked\" ? \"missing\" : \"review\";\n}\n\nfunction getEvidence({\n  approvalState,\n  rollbackState,\n  smokeStatus,\n}: {\n  approvalState: AdminPublishApprovalState;\n  rollbackState: AdminPublishRollbackState;\n  smokeStatus: AdminPublishChannelStatus;\n}) {\n  return [\n    smokeStatus !== \"blocked\" ? \"route smoke\" : \"\",\n    approvalState === \"approved\" ? \"release approval\" : \"\",\n    rollbackState === \"linked\" ? \"rollback link\" : \"\",\n  ].filter(Boolean);\n}\n\nfunction getChannelStatus({\n  blockers,\n  routeSmokeStatus,\n  warnings,\n}: {\n  blockers: string[];\n  routeSmokeStatus: AdminPublishChannelStatus;\n  warnings: string[];\n}): AdminPublishChannelStatus {\n  if (blockers.length > 0 || routeSmokeStatus === \"blocked\") {\n    return \"blocked\";\n  }\n\n  return warnings.length > 0 || routeSmokeStatus === \"review\" ? \"review\" : \"ready\";\n}\n\nfunction getWorstStatus(\n  statuses: AdminPublishChannelStatus[],\n  fallback: AdminPublishChannelStatus,\n) {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  if (statuses.includes(\"review\")) {\n    return \"review\";\n  }\n\n  return statuses.length > 0 ? \"ready\" : fallback;\n}\n\nfunction joinUrl(baseUrl: string, path: string) {\n  const trimmedBase = baseUrl.trim().replace(/\\/$/, \"\");\n  const normalizedPath = path.startsWith(\"/\") ? path : `/${path}`;\n\n  if (!trimmedBase || trimmedBase.includes(\"<deployment-url>\")) {\n    return normalizedPath;\n  }\n\n  return `${trimmedBase}${normalizedPath}`;\n}\n\nfunction statusWeight(status: AdminPublishChannelStatus) {\n  if (status === \"blocked\") {\n    return 0;\n  }\n\n  return status === \"review\" ? 1 : 2;\n}\n\nfunction kindWeight(kind: AdminPublishChannelKind) {\n  if (kind === \"release\") {\n    return 0;\n  }\n\n  if (kind === \"prototype\") {\n    return 1;\n  }\n\n  return kind === \"site\" ? 2 : 3;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-publish-channel-manager-builders.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-publish-channel-manager-builders-ts-fdd67abfdb04aad9.mjs",
  "kind": "ts",
  "hash": "fdd67abfdb04aad9",
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
    "source_path": "src/features/admin/admin-publish-channel-manager-builders.ts",
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
        "specifier": "@/features/admin/admin-publish-channel-manager-types",
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
      "toShareChannel",
      "toPrototypeGapChannel",
      "toReleaseChannel",
      "sortPublishChannels",
      "getStatusFromApproval"
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
