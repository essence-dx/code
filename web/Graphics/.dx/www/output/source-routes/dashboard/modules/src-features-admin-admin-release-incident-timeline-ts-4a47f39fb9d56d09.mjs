
export const dxSourceText = "import type {\n  AdminAuditRow,\n  AdminNotificationDeliveryRow,\n} from \"@/features/admin/admin-data\";\nimport type { AdminOperationalIncidentReport } from \"@/features/admin/admin-operational-incidents\";\nimport type {\n  AdminProductionMonitoringDigest,\n  AdminProductionMonitoringStatus,\n} from \"@/features/admin/admin-production-monitoring-digest\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\nimport type {\n  RuntimeIssueSeverity,\n  RuntimeObservabilityReport,\n} from \"@/features/editor/runtime-observability\";\n\nexport type AdminReleaseIncidentTimelineStatus =\n  | \"ready\"\n  | \"review\"\n  | \"blocked\";\n\nexport type AdminReleaseIncidentTimelineSeverity =\n  | \"error\"\n  | \"info\"\n  | \"warning\";\n\nexport type AdminReleaseIncidentTimelineSource =\n  | \"audit\"\n  | \"deploy-check\"\n  | \"manifest\"\n  | \"notification\"\n  | \"rollback\"\n  | \"runtime\";\n\nexport type AdminReleaseIncidentTimelineEvent = {\n  id: string;\n  source: AdminReleaseIncidentTimelineSource;\n  status: AdminReleaseIncidentTimelineStatus;\n  severity: AdminReleaseIncidentTimelineSeverity;\n  occurredAt: string;\n  title: string;\n  summary: string;\n  actor: string | null;\n  target: string | null;\n  recommendation: string;\n  relatedIds: string[];\n};\n\nexport type AdminReleaseIncidentCorrelation = {\n  id: string;\n  status: AdminReleaseIncidentTimelineStatus;\n  label: string;\n  value: string;\n  eventCount: number;\n  sources: AdminReleaseIncidentTimelineSource[];\n  latestAt: string | null;\n  detail: string;\n  recommendation: string;\n};\n\nexport type AdminReleaseIncidentTimelineReport = {\n  generatedAt: string;\n  status: AdminReleaseIncidentTimelineStatus;\n  score: number;\n  eventCount: number;\n  readyEventCount: number;\n  reviewEventCount: number;\n  blockedEventCount: number;\n  deployEventCount: number;\n  auditEventCount: number;\n  notificationEventCount: number;\n  runtimeEventCount: number;\n  rollbackEventCount: number;\n  manifestEventCount: number;\n  correlationCount: number;\n  timeline: AdminReleaseIncidentTimelineEvent[];\n  correlations: AdminReleaseIncidentCorrelation[];\n};\n\nexport type AdminReleaseIncidentTimelineInput = {\n  auditEvents: AdminAuditRow[];\n  generatedAt?: string;\n  notificationDeliveries: AdminNotificationDeliveryRow[];\n  operationalIncidents: AdminOperationalIncidentReport;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  productionMonitoringDigest: AdminProductionMonitoringDigest;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  rollbackReadiness: AdminRollbackReadinessReport;\n  runtimeObservability: RuntimeObservabilityReport;\n};\n\nconst MAX_TIMELINE_EVENTS = 36;\nconst MAX_AUDIT_EVENTS = 12;\nconst MAX_NOTIFICATION_EVENTS = 12;\n\nexport function getAdminReleaseIncidentTimeline({\n  auditEvents,\n  generatedAt = new Date().toISOString(),\n  notificationDeliveries,\n  operationalIncidents,\n  productionDeploySmoke,\n  productionMonitoringDigest,\n  releaseArtifactManifest,\n  rollbackReadiness,\n  runtimeObservability,\n}: AdminReleaseIncidentTimelineInput): AdminReleaseIncidentTimelineReport {\n  const timeline = [\n    ...getDeployEvents(productionDeploySmoke),\n    ...getRuntimeEvents(runtimeObservability, generatedAt),\n    ...getRollbackEvents(rollbackReadiness),\n    ...getNotificationEvents(notificationDeliveries),\n    ...getAuditEvents(auditEvents),\n    ...getManifestEvents(releaseArtifactManifest),\n  ]\n    .sort(sortEvents)\n    .slice(0, MAX_TIMELINE_EVENTS);\n  const correlations = getCorrelations({\n    operationalIncidents,\n    productionMonitoringDigest,\n    releaseArtifactManifest,\n    timeline,\n  });\n  const readyEventCount = timeline.filter((event) => event.status === \"ready\")\n    .length;\n  const reviewEventCount = timeline.filter((event) => event.status === \"review\")\n    .length;\n  const blockedEventCount = timeline.filter(\n    (event) => event.status === \"blocked\",\n  ).length;\n  const blockedCorrelationCount = correlations.filter(\n    (correlation) => correlation.status === \"blocked\",\n  ).length;\n  const reviewCorrelationCount = correlations.filter(\n    (correlation) => correlation.status === \"review\",\n  ).length;\n\n  return {\n    generatedAt,\n    status:\n      blockedEventCount + blockedCorrelationCount > 0\n        ? \"blocked\"\n        : reviewEventCount + reviewCorrelationCount > 0\n          ? \"review\"\n          : \"ready\",\n    score: Math.max(\n      0,\n      100 -\n        (blockedEventCount + blockedCorrelationCount) * 16 -\n        (reviewEventCount + reviewCorrelationCount) * 5,\n    ),\n    eventCount: timeline.length,\n    readyEventCount,\n    reviewEventCount,\n    blockedEventCount,\n    deployEventCount: getSourceCount(timeline, \"deploy-check\"),\n    auditEventCount: getSourceCount(timeline, \"audit\"),\n    notificationEventCount: getSourceCount(timeline, \"notification\"),\n    runtimeEventCount: getSourceCount(timeline, \"runtime\"),\n    rollbackEventCount: getSourceCount(timeline, \"rollback\"),\n    manifestEventCount: getSourceCount(timeline, \"manifest\"),\n    correlationCount: correlations.length,\n    timeline,\n    correlations,\n  };\n}\n\nfunction getDeployEvents(\n  report: ProductionDeploySmokeReport,\n): AdminReleaseIncidentTimelineEvent[] {\n  return report.rows.map((row) => ({\n    id: `deploy-${row.id}`,\n    source: \"deploy-check\",\n    status: row.status,\n    severity: statusToSeverity(row.status),\n    occurredAt: report.generatedAt,\n    title: row.label,\n    summary: `${row.method} ${row.route}: ${row.detail}`,\n    actor: null,\n    target: row.route,\n    recommendation: row.recommendation,\n    relatedIds: [row.id],\n  }));\n}\n\nfunction getRuntimeEvents(\n  report: RuntimeObservabilityReport,\n  generatedAt: string,\n): AdminReleaseIncidentTimelineEvent[] {\n  if (report.issues.length > 0) {\n    return report.issues.map((issue) => ({\n      id: `runtime-${issue.id}`,\n      source: \"runtime\",\n      status: runtimeSeverityToStatus(issue.severity),\n      severity: runtimeSeverityToTimelineSeverity(issue.severity),\n      occurredAt: issue.capturedAt,\n      title: `${issue.surfaceLabel} ${issue.kind}`,\n      summary: issue.message,\n      actor: null,\n      target: issue.url,\n      recommendation:\n        issue.severity === \"error\"\n          ? \"Fix this runtime error before release approval.\"\n          : \"Review this runtime signal before closing the release timeline.\",\n      relatedIds: [issue.id],\n    }));\n  }\n\n  return report.rows.map((row) => ({\n    id: `runtime-${row.id}`,\n    source: \"runtime\",\n    status: row.status,\n    severity: statusToSeverity(row.status),\n    occurredAt: generatedAt,\n    title: row.label,\n    summary: row.detail,\n    actor: null,\n    target: null,\n    recommendation: row.recommendation,\n    relatedIds: row.issueIds,\n  }));\n}\n\nfunction getRollbackEvents(\n  report: AdminRollbackReadinessReport,\n): AdminReleaseIncidentTimelineEvent[] {\n  return report.rows.map((row) => ({\n    id: `rollback-${row.id}`,\n    source: \"rollback\",\n    status: row.status,\n    severity: statusToSeverity(row.status),\n    occurredAt: report.generatedAt,\n    title: row.label,\n    summary: row.detail,\n    actor: null,\n    target: row.target,\n    recommendation: row.recommendation,\n    relatedIds: [row.id],\n  }));\n}\n\nfunction getNotificationEvents(\n  deliveries: AdminNotificationDeliveryRow[],\n): AdminReleaseIncidentTimelineEvent[] {\n  return deliveries.slice(0, MAX_NOTIFICATION_EVENTS).map((delivery) => ({\n    id: `notification-${delivery.id}`,\n    source: \"notification\",\n    status: notificationStatusToTimelineStatus(delivery.status),\n    severity: delivery.status === \"failed\" ? \"error\" : \"info\",\n    occurredAt: delivery.createdAt,\n    title: `${delivery.kind} notification ${delivery.status}`,\n    summary: `${delivery.fileName} notification to ${delivery.recipientEmail}${delivery.reason ? ` for ${delivery.reason}` : \"\"}.`,\n    actor: delivery.actorName,\n    target: delivery.recipientEmail,\n    recommendation:\n      delivery.status === \"failed\"\n        ? \"Retry delivery after sender, domain, and recipient readiness are confirmed.\"\n        : \"Keep notification delivery evidence with release incident review.\",\n    relatedIds: [delivery.id, delivery.fileId],\n  }));\n}\n\nfunction getAuditEvents(\n  auditEvents: AdminAuditRow[],\n): AdminReleaseIncidentTimelineEvent[] {\n  return auditEvents.slice(0, MAX_AUDIT_EVENTS).map((event) => ({\n    id: `audit-${event.id}`,\n    source: \"audit\",\n    status: isHighImpactAuditAction(event.action) ? \"review\" : \"ready\",\n    severity: isHighImpactAuditAction(event.action) ? \"warning\" : \"info\",\n    occurredAt: event.createdAt,\n    title: formatAuditAction(event.action),\n    summary: `${event.actorEmail} changed ${event.targetLabel}.`,\n    actor: event.actorEmail,\n    target: event.targetLabel,\n    recommendation: isHighImpactAuditAction(event.action)\n      ? \"Confirm this high-impact admin change is intentional for the release window.\"\n      : \"Keep this audit event as timeline evidence.\",\n    relatedIds: [event.id, event.targetId],\n  }));\n}\n\nfunction getManifestEvents(\n  report: AdminReleaseArtifactManifestReport,\n): AdminReleaseIncidentTimelineEvent[] {\n  return [\n    {\n      id: `manifest-${report.manifestId}`,\n      source: \"manifest\",\n      status: report.status,\n      severity: statusToSeverity(report.status),\n      occurredAt: report.generatedAt,\n      title: \"Signed release artifact manifest\",\n      summary: `${report.artifactCount} artifacts, ${report.signedArtifactCount} signed, ${report.blockedArtifactCount} blocked. Manifest checksum ${report.checksum}.`,\n      actor: null,\n      target: report.manifestId,\n      recommendation: report.signing.configured\n        ? \"Archive this manifest with release approvals and exported artifacts.\"\n        : \"Configure ESSENCE_RELEASE_SIGNING_KEY before treating artifacts as signed.\",\n      relatedIds: report.artifacts.map((artifact) => artifact.id),\n    },\n  ];\n}\n\nfunction getCorrelations({\n  operationalIncidents,\n  productionMonitoringDigest,\n  releaseArtifactManifest,\n  timeline,\n}: {\n  operationalIncidents: AdminOperationalIncidentReport;\n  productionMonitoringDigest: AdminProductionMonitoringDigest;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  timeline: AdminReleaseIncidentTimelineEvent[];\n}): AdminReleaseIncidentCorrelation[] {\n  const deployAndRuntime = timeline.filter(\n    (event) =>\n      (event.source === \"deploy-check\" || event.source === \"runtime\") &&\n      event.status !== \"ready\",\n  );\n  const authEmailNotifications = timeline.filter(\n    (event) =>\n      (event.source === \"notification\" ||\n        event.summary.toLowerCase().includes(\"auth\") ||\n        event.summary.toLowerCase().includes(\"email\")) &&\n      event.status !== \"ready\",\n  );\n  const rollbackAndShare = timeline.filter(\n    (event) =>\n      (event.source === \"rollback\" ||\n        event.summary.toLowerCase().includes(\"share\")) &&\n      event.status !== \"ready\",\n  );\n  const releaseGovernance = timeline.filter(\n    (event) =>\n      event.source === \"manifest\" ||\n      event.title.toLowerCase().includes(\"release\") ||\n      event.title.toLowerCase().includes(\"approval\"),\n  );\n\n  return [\n    createCorrelation({\n      id: \"deploy-runtime-correlation\",\n      label: \"Deploy and runtime evidence\",\n      value: `${productionMonitoringDigest.deploySmokeScore}/${productionMonitoringDigest.runtimeScore}`,\n      events: deployAndRuntime,\n      readyDetail:\n        \"Deploy checks and runtime observations have no active release timeline blockers.\",\n      detail: `${deployAndRuntime.length} deploy or runtime events need review before release approval.`,\n      recommendation:\n        \"Resolve failed route checks and runtime capture gaps before publishing release artifacts.\",\n    }),\n    createCorrelation({\n      id: \"auth-email-notification-correlation\",\n      label: \"Auth and notification incidents\",\n      value: `${operationalIncidents.failedAuthAttemptCount}/${operationalIncidents.failedEmailDeliveryCount}`,\n      events: authEmailNotifications,\n      readyDetail:\n        \"Auth, email, and notification evidence has no active blockers in the loaded timeline.\",\n      detail: `${operationalIncidents.failedAuthAttemptCount} failed auth attempts, ${operationalIncidents.failedEmailDeliveryCount} failed email deliveries, and ${authEmailNotifications.length} notification-related timeline events need review.`,\n      recommendation:\n        \"Review OTP, Brevo, recipient, and auth audit evidence before release handoff.\",\n    }),\n    createCorrelation({\n      id: \"rollback-share-correlation\",\n      label: \"Rollback and share exposure\",\n      value: `${productionMonitoringDigest.rollbackScore}`,\n      events: rollbackAndShare,\n      readyDetail:\n        \"Rollback and share exposure evidence is clear in the current timeline.\",\n      detail: `${rollbackAndShare.length} rollback or share events need review.`,\n      recommendation:\n        \"Resolve stale shares, elevated public links, and rollback gaps before release.\",\n    }),\n    createCorrelation({\n      id: \"release-governance-correlation\",\n      label: \"Release governance chain\",\n      value: `${releaseArtifactManifest.score}`,\n      events: releaseGovernance.filter((event) => event.status !== \"ready\"),\n      readyDetail:\n        \"Release approval and signed artifact evidence are connected in the timeline.\",\n      detail: `${releaseGovernance.length} release governance events are linked; ${releaseArtifactManifest.unsignedArtifactCount} artifacts are unsigned.`,\n      recommendation:\n        \"Archive release approvals, manifest signatures, and deploy evidence together.\",\n    }),\n  ];\n}\n\nfunction createCorrelation({\n  detail,\n  events,\n  id,\n  label,\n  readyDetail,\n  recommendation,\n  value,\n}: {\n  detail: string;\n  events: AdminReleaseIncidentTimelineEvent[];\n  id: string;\n  label: string;\n  readyDetail: string;\n  recommendation: string;\n  value: string;\n}): AdminReleaseIncidentCorrelation {\n  const status = getWorstStatus(events.map((event) => event.status));\n\n  return {\n    id,\n    status,\n    label,\n    value,\n    eventCount: events.length,\n    sources: Array.from(new Set(events.map((event) => event.source))),\n    latestAt: events\n      .map((event) => event.occurredAt)\n      .sort((left, right) => toTime(right) - toTime(left))[0] ?? null,\n    detail: events.length > 0 ? detail : readyDetail,\n    recommendation,\n  };\n}\n\nfunction notificationStatusToTimelineStatus(\n  status: string,\n): AdminReleaseIncidentTimelineStatus {\n  if (status === \"failed\") {\n    return \"blocked\";\n  }\n\n  return status === \"sent\" || status === \"delivered\" ? \"ready\" : \"review\";\n}\n\nfunction runtimeSeverityToStatus(\n  severity: RuntimeIssueSeverity,\n): AdminReleaseIncidentTimelineStatus {\n  if (severity === \"error\") {\n    return \"blocked\";\n  }\n\n  return severity === \"warning\" ? \"review\" : \"ready\";\n}\n\nfunction runtimeSeverityToTimelineSeverity(\n  severity: RuntimeIssueSeverity,\n): AdminReleaseIncidentTimelineSeverity {\n  if (severity === \"error\") {\n    return \"error\";\n  }\n\n  return severity === \"warning\" ? \"warning\" : \"info\";\n}\n\nfunction statusToSeverity(\n  status: AdminReleaseIncidentTimelineStatus,\n): AdminReleaseIncidentTimelineSeverity {\n  if (status === \"blocked\") {\n    return \"error\";\n  }\n\n  return status === \"review\" ? \"warning\" : \"info\";\n}\n\nfunction getWorstStatus(\n  statuses: AdminReleaseIncidentTimelineStatus[],\n): AdminReleaseIncidentTimelineStatus {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  return statuses.includes(\"review\") ? \"review\" : \"ready\";\n}\n\nfunction getSourceCount(\n  events: AdminReleaseIncidentTimelineEvent[],\n  source: AdminReleaseIncidentTimelineSource,\n) {\n  return events.filter((event) => event.source === source).length;\n}\n\nfunction sortEvents(\n  first: AdminReleaseIncidentTimelineEvent,\n  second: AdminReleaseIncidentTimelineEvent,\n) {\n  const timeDelta = toTime(second.occurredAt) - toTime(first.occurredAt);\n\n  if (timeDelta !== 0) {\n    return timeDelta;\n  }\n\n  return getSeverityRank(first.severity) - getSeverityRank(second.severity);\n}\n\nfunction getSeverityRank(severity: AdminReleaseIncidentTimelineSeverity) {\n  if (severity === \"error\") {\n    return 0;\n  }\n\n  return severity === \"warning\" ? 1 : 2;\n}\n\nfunction isHighImpactAuditAction(action: string) {\n  return (\n    action.startsWith(\"release.\") ||\n    action.startsWith(\"share.\") ||\n    action.startsWith(\"session.\") ||\n    action.startsWith(\"user.\") ||\n    action.includes(\"approval\") ||\n    action.includes(\"policy\")\n  );\n}\n\nfunction formatAuditAction(action: string) {\n  return action\n    .split(\".\")\n    .filter(Boolean)\n    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))\n    .join(\" \");\n}\n\nfunction toTime(value: string) {\n  const time = new Date(value).getTime();\n\n  return Number.isFinite(time) ? time : 0;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-incident-timeline.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-incident-timeline-ts-4a47f39fb9d56d09.mjs",
  "kind": "ts",
  "hash": "4a47f39fb9d56d09",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-incident-timeline.ts",
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
        "specifier": "@/features/admin/admin-data",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-operational-incidents",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-production-monitoring-digest",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-artifact-manifest",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-rollback-readiness",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/runtime-observability",
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
      "getAdminReleaseIncidentTimeline"
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
