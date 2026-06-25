export type AdminOperationalIncidentStatus = "ready" | "review" | "blocked";

export type AdminOperationalIncidentKind =
  | "auth"
  | "email"
  | "session"
  | "share";

export type AdminOperationalIncidentRow = {
  id: string;
  status: AdminOperationalIncidentStatus;
  kind: AdminOperationalIncidentKind;
  label: string;
  detail: string;
  recommendation: string;
  count: number;
  latestAt: string | null;
  target: string | null;
};

export type AdminOperationalIncidentReport = {
  generatedAt: string;
  status: AdminOperationalIncidentStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  failedAuthAttemptCount: number;
  failedEmailDeliveryCount: number;
  staleSessionCount: number;
  riskyShareCount: number;
  recentShareChangeCount: number;
  rows: AdminOperationalIncidentRow[];
};

type AuditEventInput = {
  actorEmail: string;
  action: string;
  targetLabel: string;
  createdAt: Date | string;
};

type NotificationDeliveryInput = {
  fileName: string;
  recipientEmail: string;
  reason: string | null;
  status: string;
  createdAt: Date | string;
};

type SessionRiskInput = {
  id: string;
  userEmail: string;
  userName: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  ipAddress: string | null;
  userAgent: string | null;
};

type ShareRiskInput = {
  fileName: string;
  ownerEmail: string;
  accessLevel: string;
  allowComments: boolean;
  allowDownload: boolean;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  disabledAt: Date | string | null;
};

export type AdminOperationalIncidentInput = {
  auditEvents: AuditEventInput[];
  notificationDeliveries: NotificationDeliveryInput[];
  sessions: SessionRiskInput[];
  shares: ShareRiskInput[];
  now?: number;
  generatedAt?: string;
};

const SESSION_AGE_REVIEW_DAYS = 30;
const SHARE_CHANGE_REVIEW_DAYS = 7;

export function getAdminOperationalIncidentReport({
  auditEvents,
  notificationDeliveries,
  sessions,
  shares,
  now = Date.now(),
  generatedAt = new Date(now).toISOString(),
}: AdminOperationalIncidentInput): AdminOperationalIncidentReport {
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
