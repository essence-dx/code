
export const dxSourceText = "\n  | \"auth\"\n  | \"email\"\n  | \"session\"\n  | \"share\";\n\n\n\n\n\n\n\n\nconst SESSION_AGE_REVIEW_DAYS = 30;\nconst SHARE_CHANGE_REVIEW_DAYS = 7;\n\nexport function getAdminOperationalIncidentReport({\n  auditEvents,\n  notificationDeliveries,\n  sessions,\n  shares,\n  now = Date.now(),\n  generatedAt = new Date(now).toISOString(),\n}){\n  const rows: AdminOperationalIncidentRow[] = [];\n  const failedAuthEvents = auditEvents.filter(isFailedAuthEvent);\n  const failedEmailDeliveries = notificationDeliveries.filter(\n    (delivery) => delivery.status === \"failed\",\n  );\n  const expiredSessions = sessions.filter(\n    (session) => toTime(session.expiresAt) <= now,\n  );\n  const longLivedSessions = sessions.filter((session) => {\n    const createdAt = toTime(session.createdAt);\n    const expiresAt = toTime(session.expiresAt);\n\n    return (\n      expiresAt > now &&\n      createdAt <= now - daysToMilliseconds(SESSION_AGE_REVIEW_DAYS)\n    );\n  });\n  const expiredShares = shares.filter(\n    (share) =>\n      !share.disabledAt &&\n      Boolean(share.expiresAt && toTime(share.expiresAt) <= now),\n  );\n  const riskyShares = shares.filter(\n    (share) =>\n      !share.disabledAt &&\n      !Boolean(share.expiresAt && toTime(share.expiresAt) <= now) &&\n      (share.allowDownload ||\n        share.allowComments ||\n        share.accessLevel === \"review\" ||\n        !share.expiresAt),\n  );\n  const recentRiskyShareEvents = auditEvents.filter(\n    (event) =>\n      isRecent(event.createdAt, now, SHARE_CHANGE_REVIEW_DAYS) &&\n      isRiskyShareAction(event.action),\n  );\n\n  if (failedAuthEvents.length > 0) {\n    rows.push(\n      createRow({\n        id: \"failed-auth-attempts\",\n        status: \"blocked\",\n        kind: \"auth\",\n        label: \"Failed auth attempts\",\n        detail: `${failedAuthEvents.length} failed authentication events are present in the admin audit window.`,\n        recommendation:\n          \"Review source IPs, affected accounts, and OTP delivery around these failures before approving release.\",\n        items: failedAuthEvents,\n        target: latestTarget(failedAuthEvents),\n      }),\n    );\n  } else {\n    rows.push({\n      id: \"failed-auth-telemetry\",\n      status: \"review\",\n      kind: \"auth\",\n      label: \"Failed auth telemetry\",\n      detail:\n        \"No failed sign-in or OTP failure events are persisted in the current admin audit feed.\",\n      recommendation:\n        \"Capture Better Auth failure hooks in the audit log before treating production auth as fully observable.\",\n      count: 0,\n      latestAt: null,\n      target: null,\n    });\n  }\n\n  if (failedEmailDeliveries.length > 0) {\n    rows.push(\n      createRow({\n        id: \"failed-email-deliveries\",\n        status: \"blocked\",\n        kind: \"email\",\n        label: \"Failed email delivery\",\n        detail: `${failedEmailDeliveries.length} comment notification delivery attempts failed.`,\n        recommendation:\n          \"Inspect Brevo sender/domain readiness and retry failed recipients after the delivery issue is fixed.\",\n        items: failedEmailDeliveries,\n        target: latestEmailTarget(failedEmailDeliveries),\n      }),\n    );\n  } else {\n    rows.push({\n      id: \"email-deliveries-ready\",\n      status: \"ready\",\n      kind: \"email\",\n      label: \"Email delivery failures\",\n      detail: \"No failed comment notification deliveries are present.\",\n      recommendation:\n        \"Continue monitoring notification delivery rows after each deploy.\",\n      count: 0,\n      latestAt: null,\n      target: null,\n    });\n  }\n\n  if (expiredSessions.length > 0) {\n    rows.push(\n      createRow({\n        id: \"expired-sessions\",\n        status: \"blocked\",\n        kind: \"session\",\n        label: \"Expired sessions\",\n        detail: `${expiredSessions.length} expired sessions still appear in the loaded session window.`,\n        recommendation:\n          \"Revoke stale sessions and confirm the auth adapter is pruning expired session records.\",\n        items: expiredSessions,\n        target: latestSessionTarget(expiredSessions),\n      }),\n    );\n  } else {\n    rows.push({\n      id: \"expired-sessions-ready\",\n      status: \"ready\",\n      kind: \"session\",\n      label: \"Expired sessions\",\n      detail: \"No expired sessions are present in the loaded session window.\",\n      recommendation:\n        \"Keep session expiry checks in the release review before public deploys.\",\n      count: 0,\n      latestAt: null,\n      target: null,\n    });\n  }\n\n  if (longLivedSessions.length > 0) {\n    rows.push(\n      createRow({\n        id: \"long-lived-sessions\",\n        status: \"review\",\n        kind: \"session\",\n        label: \"Long-lived sessions\",\n        detail: `${longLivedSessions.length} active sessions are older than ${SESSION_AGE_REVIEW_DAYS} days.`,\n        recommendation:\n          \"Review account activity and revoke sessions for users that should reauthenticate.\",\n        items: longLivedSessions,\n        target: latestSessionTarget(longLivedSessions),\n      }),\n    );\n  }\n\n  if (expiredShares.length > 0) {\n    rows.push(\n      createRow({\n        id: \"expired-live-shares\",\n        status: \"blocked\",\n        kind: \"share\",\n        label: \"Expired live shares\",\n        detail: `${expiredShares.length} active public share links are past their expiry time.`,\n        recommendation:\n          \"Disable expired public links or refresh their expiry window before release.\",\n        items: expiredShares,\n        target: latestShareTarget(expiredShares),\n      }),\n    );\n  }\n\n  if (riskyShares.length > 0) {\n    rows.push(\n      createRow({\n        id: \"risky-share-exposure\",\n        status: \"review\",\n        kind: \"share\",\n        label: \"Risky share exposure\",\n        detail: `${riskyShares.length} live shares allow downloads, review access, comments, or have no expiry.`,\n        recommendation:\n          \"Review public links with elevated capabilities and disable anything that should not survive release.\",\n        items: riskyShares,\n        target: latestShareTarget(riskyShares),\n      }),\n    );\n  }\n\n  if (recentRiskyShareEvents.length > 0) {\n    rows.push(\n      createRow({\n        id: \"recent-risky-share-changes\",\n        status: \"review\",\n        kind: \"share\",\n        label: \"Recent share changes\",\n        detail: `${recentRiskyShareEvents.length} risky public share changes were recorded in the last ${SHARE_CHANGE_REVIEW_DAYS} days.`,\n        recommendation:\n          \"Confirm restored or elevated public links were intentional before approving production release.\",\n        items: recentRiskyShareEvents,\n        target: latestTarget(recentRiskyShareEvents),\n      }),\n    );\n  }\n\n  if (\n    expiredShares.length === 0 &&\n    riskyShares.length === 0 &&\n    recentRiskyShareEvents.length === 0\n  ) {\n    rows.push({\n      id: \"share-risk-ready\",\n      status: \"ready\",\n      kind: \"share\",\n      label: \"Share risk\",\n      detail: \"No stale, elevated, or recently restored public shares were found.\",\n      recommendation: \"Keep reviewing share exposure before every release.\",\n      count: 0,\n      latestAt: null,\n      target: null,\n    });\n  }\n\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const score = Math.max(0, 100 - blockedCount * 22 - reviewCount * 7);\n  const status: AdminOperationalIncidentStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n\n  return {\n    generatedAt,\n    status,\n    score,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    failedAuthAttemptCount: failedAuthEvents.length,\n    failedEmailDeliveryCount: failedEmailDeliveries.length,\n    staleSessionCount: expiredSessions.length + longLivedSessions.length,\n    riskyShareCount: expiredShares.length + riskyShares.length,\n    recentShareChangeCount: recentRiskyShareEvents.length,\n    rows,\n  };\n}\n\nfunction createRow<T extends { createdAt: Date | string }>({\n  id,\n  status,\n  kind,\n  label,\n  detail,\n  recommendation,\n  items,\n  target,\n}: {\n  id: string;\n  status: AdminOperationalIncidentStatus;\n  kind: AdminOperationalIncidentKind;\n  label: string;\n  detail: string;\n  recommendation: string;\n  items: T[];\n  target: string | null;\n}): AdminOperationalIncidentRow {\n  return {\n    id,\n    status,\n    kind,\n    label,\n    detail,\n    recommendation,\n    count: items.length,\n    latestAt: latestDate(items),\n    target,\n  };\n}\n\nfunction isFailedAuthEvent(event: AuditEventInput) {\n  const action = event.action.toLowerCase();\n\n  return (\n    action.includes(\"auth\") &&\n    (action.includes(\"fail\") ||\n      action.includes(\"denied\") ||\n      action.includes(\"invalid\") ||\n      action.includes(\"otp\"))\n  );\n}\n\nfunction isRiskyShareAction(action: string) {\n  const normalized = action.toLowerCase();\n\n  return (\n    normalized === \"share.restore\" ||\n    normalized.includes(\"share.public\") ||\n    normalized.includes(\"share.enable\") ||\n    normalized.includes(\"share.elevate\") ||\n    normalized.includes(\"share.permission\")\n  );\n}\n\nfunction isRecent(value: Date | string, now: number, days: number) {\n  return toTime(value) >= now - daysToMilliseconds(days);\n}\n\nfunction latestDate<T extends { createdAt: Date | string }>(items: T[]) {\n  const latest = items\n    .map((item) => toTime(item.createdAt))\n    .filter(Number.isFinite)\n    .sort((left, right) => right - left)[0];\n\n  return typeof latest === \"number\" ? new Date(latest).toISOString() : null;\n}\n\nfunction latestTarget(items: AuditEventInput[]) {\n  return items[0]?.targetLabel ?? null;\n}\n\nfunction latestEmailTarget(items: NotificationDeliveryInput[]) {\n  const latest = latestByCreatedAt(items);\n\n  if (!latest) {\n    return null;\n  }\n\n  return `${latest.recipientEmail} on ${latest.fileName}${\n    latest.reason ? ` (${latest.reason})` : \"\"\n  }`;\n}\n\nfunction latestSessionTarget(items: SessionRiskInput[]) {\n  const latest = latestByCreatedAt(items);\n\n  if (!latest) {\n    return null;\n  }\n\n  return `${latest.userEmail} (${latest.userName})`;\n}\n\nfunction latestShareTarget(items: ShareRiskInput[]) {\n  const latest = latestByCreatedAt(items);\n\n  if (!latest) {\n    return null;\n  }\n\n  return `${latest.fileName} by ${latest.ownerEmail}`;\n}\n\nfunction latestByCreatedAt<T extends { createdAt: Date | string }>(items: T[]) {\n  return [...items].sort(\n    (left, right) => toTime(right.createdAt) - toTime(left.createdAt),\n  )[0];\n}\n\nfunction toTime(value: Date | string) {\n  return value instanceof Date ? value.getTime() : new Date(value).getTime();\n}\n\nfunction daysToMilliseconds(days: number) {\n  return days * 24 * 60 * 60 * 1000;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-operational-incidents.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operational-incidents-ts-647015b9fdcb96e0.mjs",
  "kind": "ts",
  "hash": "647015b9fdcb96e0",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "getAdminOperationalIncidentReport"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-operational-incidents.ts",
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
      "getAdminOperationalIncidentReport"
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
  exportNames: ["getAdminOperationalIncidentReport"]
});

  | "auth"
  | "email"
  | "session"
  | "share";








const SESSION_AGE_REVIEW_DAYS = 30;
const SHARE_CHANGE_REVIEW_DAYS = 7;

export function getAdminOperationalIncidentReport({
  auditEvents,
  notificationDeliveries,
  sessions,
  shares,
  now = Date.now(),
  generatedAt = new Date(now).toISOString(),
}){
  const rows: AdminOperationalIncidentRow[] = [];
  const failedAuthEvents = auditEvents.filter(isFailedAuthEvent);
  const failedEmailDeliveries = notificationDeliveries.filter(
    (delivery) => delivery.status === "failed",
  );
  const expiredSessions = sessions.filter(
    (session) => toTime(session.expiresAt) <= now,
  );
  const longLivedSessions = sessions.filter((session) => {
    const createdAt = toTime(session.createdAt);
    const expiresAt = toTime(session.expiresAt);

    return (
      expiresAt > now &&
      createdAt <= now - daysToMilliseconds(SESSION_AGE_REVIEW_DAYS)
    );
  });
  const expiredShares = shares.filter(
    (share) =>
      !share.disabledAt &&
      Boolean(share.expiresAt && toTime(share.expiresAt) <= now),
  );
  const riskyShares = shares.filter(
    (share) =>
      !share.disabledAt &&
      !Boolean(share.expiresAt && toTime(share.expiresAt) <= now) &&
      (share.allowDownload ||
        share.allowComments ||
        share.accessLevel === "review" ||
        !share.expiresAt),
  );
  const recentRiskyShareEvents = auditEvents.filter(
    (event) =>
      isRecent(event.createdAt, now, SHARE_CHANGE_REVIEW_DAYS) &&
      isRiskyShareAction(event.action),
  );

  if (failedAuthEvents.length > 0) {
    rows.push(
      createRow({
        id: "failed-auth-attempts",
        status: "blocked",
        kind: "auth",
        label: "Failed auth attempts",
        detail: `${failedAuthEvents.length} failed authentication events are present in the admin audit window.`,
        recommendation:
          "Review source IPs, affected accounts, and OTP delivery around these failures before approving release.",
        items: failedAuthEvents,
        target: latestTarget(failedAuthEvents),
      }),
    );
  } else {
    rows.push({
      id: "failed-auth-telemetry",
      status: "review",
      kind: "auth",
      label: "Failed auth telemetry",
      detail:
        "No failed sign-in or OTP failure events are persisted in the current admin audit feed.",
      recommendation:
        "Capture Better Auth failure hooks in the audit log before treating production auth as fully observable.",
      count: 0,
      latestAt: null,
      target: null,
    });
  }

  if (failedEmailDeliveries.length > 0) {
    rows.push(
      createRow({
        id: "failed-email-deliveries",
        status: "blocked",
        kind: "email",
        label: "Failed email delivery",
        detail: `${failedEmailDeliveries.length} comment notification delivery attempts failed.`,
        recommendation:
          "Inspect Brevo sender/domain readiness and retry failed recipients after the delivery issue is fixed.",
        items: failedEmailDeliveries,
        target: latestEmailTarget(failedEmailDeliveries),
      }),
    );
  } else {
    rows.push({
      id: "email-deliveries-ready",
      status: "ready",
      kind: "email",
      label: "Email delivery failures",
      detail: "No failed comment notification deliveries are present.",
      recommendation:
        "Continue monitoring notification delivery rows after each deploy.",
      count: 0,
      latestAt: null,
      target: null,
    });
  }

  if (expiredSessions.length > 0) {
    rows.push(
      createRow({
        id: "expired-sessions",
        status: "blocked",
        kind: "session",
        label: "Expired sessions",
        detail: `${expiredSessions.length} expired sessions still appear in the loaded session window.`,
        recommendation:
          "Revoke stale sessions and confirm the auth adapter is pruning expired session records.",
        items: expiredSessions,
        target: latestSessionTarget(expiredSessions),
      }),
    );
  } else {
    rows.push({
      id: "expired-sessions-ready",
      status: "ready",
      kind: "session",
      label: "Expired sessions",
      detail: "No expired sessions are present in the loaded session window.",
      recommendation:
        "Keep session expiry checks in the release review before public deploys.",
      count: 0,
      latestAt: null,
      target: null,
    });
  }

  if (longLivedSessions.length > 0) {
    rows.push(
      createRow({
        id: "long-lived-sessions",
        status: "review",
        kind: "session",
        label: "Long-lived sessions",
        detail: `${longLivedSessions.length} active sessions are older than ${SESSION_AGE_REVIEW_DAYS} days.`,
        recommendation:
          "Review account activity and revoke sessions for users that should reauthenticate.",
        items: longLivedSessions,
        target: latestSessionTarget(longLivedSessions),
      }),
    );
  }

  if (expiredShares.length > 0) {
    rows.push(
      createRow({
        id: "expired-live-shares",
        status: "blocked",
        kind: "share",
        label: "Expired live shares",
        detail: `${expiredShares.length} active public share links are past their expiry time.`,
        recommendation:
          "Disable expired public links or refresh their expiry window before release.",
        items: expiredShares,
        target: latestShareTarget(expiredShares),
      }),
    );
  }

  if (riskyShares.length > 0) {
    rows.push(
      createRow({
        id: "risky-share-exposure",
        status: "review",
        kind: "share",
        label: "Risky share exposure",
        detail: `${riskyShares.length} live shares allow downloads, review access, comments, or have no expiry.`,
        recommendation:
          "Review public links with elevated capabilities and disable anything that should not survive release.",
        items: riskyShares,
        target: latestShareTarget(riskyShares),
      }),
    );
  }

  if (recentRiskyShareEvents.length > 0) {
    rows.push(
      createRow({
        id: "recent-risky-share-changes",
        status: "review",
        kind: "share",
        label: "Recent share changes",
        detail: `${recentRiskyShareEvents.length} risky public share changes were recorded in the last ${SHARE_CHANGE_REVIEW_DAYS} days.`,
        recommendation:
          "Confirm restored or elevated public links were intentional before approving production release.",
        items: recentRiskyShareEvents,
        target: latestTarget(recentRiskyShareEvents),
      }),
    );
  }

  if (
    expiredShares.length === 0 &&
    riskyShares.length === 0 &&
    recentRiskyShareEvents.length === 0
  ) {
    rows.push({
      id: "share-risk-ready",
      status: "ready",
      kind: "share",
      label: "Share risk",
      detail: "No stale, elevated, or recently restored public shares were found.",
      recommendation: "Keep reviewing share exposure before every release.",
      count: 0,
      latestAt: null,
      target: null,
    });
  }

  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const score = Math.max(0, 100 - blockedCount * 22 - reviewCount * 7);
  const status: AdminOperationalIncidentStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    generatedAt,
    status,
    score,
    readyCount,
    reviewCount,
    blockedCount,
    failedAuthAttemptCount: failedAuthEvents.length,
    failedEmailDeliveryCount: failedEmailDeliveries.length,
    staleSessionCount: expiredSessions.length + longLivedSessions.length,
    riskyShareCount: expiredShares.length + riskyShares.length,
    recentShareChangeCount: recentRiskyShareEvents.length,
    rows,
  };
}

function createRow<T extends { createdAt: Date | string }>({
  id,
  status,
  kind,
  label,
  detail,
  recommendation,
  items,
  target,
}: {
  id: string;
  status: AdminOperationalIncidentStatus;
  kind: AdminOperationalIncidentKind;
  label: string;
  detail: string;
  recommendation: string;
  items: T[];
  target: string | null;
}): AdminOperationalIncidentRow {
  return {
    id,
    status,
    kind,
    label,
    detail,
    recommendation,
    count: items.length,
    latestAt: latestDate(items),
    target,
  };
}

function isFailedAuthEvent(event: AuditEventInput) {
  const action = event.action.toLowerCase();

  return (
    action.includes("auth") &&
    (action.includes("fail") ||
      action.includes("denied") ||
      action.includes("invalid") ||
      action.includes("otp"))
  );
}

function isRiskyShareAction(action: string) {
  const normalized = action.toLowerCase();

  return (
    normalized === "share.restore" ||
    normalized.includes("share.public") ||
    normalized.includes("share.enable") ||
    normalized.includes("share.elevate") ||
    normalized.includes("share.permission")
  );
}

function isRecent(value: Date | string, now: number, days: number) {
  return toTime(value) >= now - daysToMilliseconds(days);
}

function latestDate<T extends { createdAt: Date | string }>(items: T[]) {
  const latest = items
    .map((item) => toTime(item.createdAt))
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0];

  return typeof latest === "number" ? new Date(latest).toISOString() : null;
}

function latestTarget(items: AuditEventInput[]) {
  return items[0]?.targetLabel ?? null;
}

function latestEmailTarget(items: NotificationDeliveryInput[]) {
  const latest = latestByCreatedAt(items);

  if (!latest) {
    return null;
  }

  return `${latest.recipientEmail} on ${latest.fileName}${
    latest.reason ? ` (${latest.reason})` : ""
  }`;
}

function latestSessionTarget(items: SessionRiskInput[]) {
  const latest = latestByCreatedAt(items);

  if (!latest) {
    return null;
  }

  return `${latest.userEmail} (${latest.userName})`;
}

function latestShareTarget(items: ShareRiskInput[]) {
  const latest = latestByCreatedAt(items);

  if (!latest) {
    return null;
  }

  return `${latest.fileName} by ${latest.ownerEmail}`;
}

function latestByCreatedAt<T extends { createdAt: Date | string }>(items: T[]) {
  return [...items].sort(
    (left, right) => toTime(right.createdAt) - toTime(left.createdAt),
  )[0];
}

function toTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function daysToMilliseconds(days: number) {
  return days * 24 * 60 * 60 * 1000;
}
export const dxRuntimeExports = Object.freeze({ getAdminOperationalIncidentReport });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
