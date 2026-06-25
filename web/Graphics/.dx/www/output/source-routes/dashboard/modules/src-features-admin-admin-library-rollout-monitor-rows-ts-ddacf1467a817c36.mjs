import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-library-rollout-monitor-analysis-ts-0ae85dcdbf2f4491.mjs";
export const dxSourceText = "import type {\n  AdminLibraryRolloutFile,\n  AdminLibraryRolloutLibrary,\n  AdminLibraryRolloutRow,\n} from \"@/features/admin/admin-library-rollout-monitor\";\nimport {\n  getLatestDate,\n  getPercent,\n  READY_ADOPTION_PERCENT,\n  sum,\n  type PublishedLibrary,\n} from \"@/features/admin/admin-library-rollout-monitor-analysis\";\n\nexport function getSubscriptionCoverageRow({\n  rolloutLibraries,\n  rolloutFiles,\n  publishedLibraries,\n}: {\n  rolloutLibraries: AdminLibraryRolloutLibrary[];\n  rolloutFiles: AdminLibraryRolloutFile[];\n  publishedLibraries: PublishedLibrary[];\n}): AdminLibraryRolloutRow {\n  const subscribedFileCount = rolloutFiles.filter(\n    (file) =>\n      file.librarySubscriptionCount > 0 || file.subscribedComponentCount > 0,\n  ).length;\n\n  if (rolloutLibraries.length === 0) {\n    return {\n      id: \"library-subscriptions-missing\",\n      status: \"blocked\",\n      kind: \"subscriptions\",\n      label: \"Library subscriptions\",\n      value: \"0\",\n      detail:\n        \"No published libraries or subscribed library components were found in the admin file window.\",\n      recommendation:\n        \"Publish at least one component library and import it into a product file before monitoring rollout health.\",\n      target: null,\n      latestAt: null,\n    };\n  }\n\n  return {\n    id: \"library-subscription-coverage\",\n    status: subscribedFileCount > 0 ? \"ready\" : \"review\",\n    kind: \"subscriptions\",\n    label: \"Library subscriptions\",\n    value: `${subscribedFileCount} file${subscribedFileCount === 1 ? \"\" : \"s\"}`,\n    detail: `${publishedLibraries.length} published librar${publishedLibraries.length === 1 ? \"y\" : \"ies\"} and ${subscribedFileCount} subscribing file${subscribedFileCount === 1 ? \"\" : \"s\"} are visible.`,\n    recommendation:\n      subscribedFileCount > 0\n        ? \"Keep subscriber files in this rollout monitor before approving library releases.\"\n        : \"Import the latest library package into at least one product file to verify adoption.\",\n    target: rolloutLibraries[0]?.libraryName ?? null,\n    latestAt: getLatestDate(\n      rolloutLibraries.map((library) => library.latestActivityAt),\n    ),\n  };\n}\n\nexport function getSubscriptionDriftRow(\n  files: AdminLibraryRolloutFile[],\n): AdminLibraryRolloutRow {\n  const driftCount = sum(files.map((file) => file.subscriptionDriftCount));\n  const orphanCount = sum(files.map((file) => file.orphanSubscriptionCount));\n  const target = files.find(\n    (file) => file.subscriptionDriftCount > 0 || file.orphanSubscriptionCount > 0,\n  );\n\n  return {\n    id: \"library-subscription-drift\",\n    status: driftCount > 0 || orphanCount > 0 ? \"review\" : \"ready\",\n    kind: \"drift\",\n    label: \"Subscription drift\",\n    value: `${driftCount} drift / ${orphanCount} orphan`,\n    detail:\n      driftCount > 0 || orphanCount > 0\n        ? `${driftCount} subscribed components lag behind known library versions, and ${orphanCount} subscriptions have no local imported component.`\n        : \"Subscribed components match their known library subscription versions.\",\n    recommendation:\n      driftCount > 0 || orphanCount > 0\n        ? \"Refresh library imports or remove orphaned subscriptions before release adoption review.\"\n        : \"Keep this drift report attached to organization library rollout notes.\",\n    target: target?.fileName ?? null,\n    latestAt: target?.latestSubscriptionAt ?? null,\n  };\n}\n\nexport function getAvailableUpdatesRow(\n  files: AdminLibraryRolloutFile[],\n): AdminLibraryRolloutRow {\n  const updateCount = sum(files.map((file) => file.updateAvailableComponentCount));\n  const pendingInstanceCount = sum(\n    files.map((file) => file.pendingUpdateInstanceCount),\n  );\n  const target = files.find(\n    (file) =>\n      file.updateAvailableComponentCount > 0 ||\n      file.pendingUpdateInstanceCount > 0,\n  );\n\n  return {\n    id: \"library-available-updates\",\n    status: updateCount > 0 || pendingInstanceCount > 0 ? \"review\" : \"ready\",\n    kind: \"updates\",\n    label: \"Available updates\",\n    value: `${updateCount} components / ${pendingInstanceCount} instances`,\n    detail:\n      updateCount > 0 || pendingInstanceCount > 0\n        ? `${updateCount} library components have available updates, affecting ${pendingInstanceCount} pending instance review rows.`\n        : \"No available library updates are waiting in the loaded file window.\",\n    recommendation:\n      updateCount > 0 || pendingInstanceCount > 0\n        ? \"Review and accept library updates before measuring final release adoption.\"\n        : \"Keep update review clear before publishing the next organization library release.\",\n    target: target?.fileName ?? null,\n    latestAt: target?.latestSubscriptionAt ?? null,\n  };\n}\n\nexport function getDetachedComponentsRow(\n  files: AdminLibraryRolloutFile[],\n): AdminLibraryRolloutRow {\n  const detachedComponentCount = sum(\n    files.map((file) => file.detachedComponentCount),\n  );\n  const detachedInstanceCount = sum(files.map((file) => file.detachedInstanceCount));\n  const target = files.find(\n    (file) => file.detachedComponentCount > 0 || file.detachedInstanceCount > 0,\n  );\n\n  return {\n    id: \"library-detached-components\",\n    status:\n      detachedComponentCount > 0 || detachedInstanceCount > 0\n        ? \"review\"\n        : \"ready\",\n    kind: \"detached\",\n    label: \"Detached components\",\n    value: `${detachedComponentCount} components / ${detachedInstanceCount} instances`,\n    detail:\n      detachedComponentCount > 0 || detachedInstanceCount > 0\n        ? `${detachedComponentCount} library components are detached from future updates, affecting ${detachedInstanceCount} instance review rows.`\n        : \"No detached library components are visible in the loaded file window.\",\n    recommendation:\n      detachedComponentCount > 0 || detachedInstanceCount > 0\n        ? \"Re-link intentionally reusable components or document why detached forks should stay local.\"\n        : \"Keep detachments visible so local forks do not silently miss organization updates.\",\n    target: target?.fileName ?? null,\n    latestAt: target?.latestSubscriptionAt ?? null,\n  };\n}\n\nexport function getReleaseAdoptionRow({\n  rolloutFiles,\n  publishedLibraries,\n}: {\n  rolloutFiles: AdminLibraryRolloutFile[];\n  publishedLibraries: PublishedLibrary[];\n}): AdminLibraryRolloutRow {\n  const subscribedComponentCount = sum(\n    rolloutFiles.map((file) => file.subscribedComponentCount),\n  );\n  const adoptedLatestComponentCount = sum(\n    rolloutFiles.map((file) => file.adoptedLatestComponentCount),\n  );\n  const adoptionPercent = getPercent(\n    adoptedLatestComponentCount,\n    subscribedComponentCount,\n  );\n  const target = rolloutFiles\n    .filter((file) => file.subscribedComponentCount > 0)\n    .sort((first, second) => first.releaseAdoptionPercent - second.releaseAdoptionPercent)[0];\n\n  if (publishedLibraries.length > 0 && subscribedComponentCount === 0) {\n    return {\n      id: \"library-release-adoption-missing\",\n      status: \"review\",\n      kind: \"adoption\",\n      label: \"Release adoption\",\n      value: \"0%\",\n      detail:\n        \"Published organization libraries exist, but no subscribed components are visible in the loaded file window.\",\n      recommendation:\n        \"Import the published libraries into product files so adoption can be measured.\",\n      target: publishedLibraries[0]?.fileName ?? null,\n      latestAt: getLatestDate(publishedLibraries.map((library) => library.updatedAt)),\n    };\n  }\n\n  return {\n    id: \"library-release-adoption\",\n    status:\n      subscribedComponentCount === 0 || adoptionPercent < READY_ADOPTION_PERCENT\n        ? \"review\"\n        : \"ready\",\n    kind: \"adoption\",\n    label: \"Release adoption\",\n    value: `${adoptionPercent}%`,\n    detail: `${adoptedLatestComponentCount} of ${subscribedComponentCount} subscribed components are on the latest known library version.`,\n    recommendation:\n      adoptionPercent >= READY_ADOPTION_PERCENT\n        ? \"Adoption meets the organization rollout threshold.\"\n        : \"Drive rollout above the organization threshold by accepting updates in the lowest-adoption files.\",\n    target: target?.fileName ?? null,\n    latestAt: target?.latestSubscriptionAt ?? null,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-library-rollout-monitor-rows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-rollout-monitor-rows-ts-ddacf1467a817c36.mjs",
  "kind": "ts",
  "hash": "ddacf1467a817c36",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-library-rollout-monitor-analysis",
      "resolved_path": "src/features/admin/admin-library-rollout-monitor-analysis.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-rollout-monitor-analysis-ts-0ae85dcdbf2f4491.mjs",
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
    "source_path": "src/features/admin/admin-library-rollout-monitor-rows.ts",
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
        "specifier": "@/features/admin/admin-library-rollout-monitor",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-library-rollout-monitor-analysis",
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
    "export_names": [
      "getSubscriptionCoverageRow",
      "getSubscriptionDriftRow",
      "getAvailableUpdatesRow",
      "getDetachedComponentsRow",
      "getReleaseAdoptionRow"
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
