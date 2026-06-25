import type { AdminAuditMetadata } from "@/db/schema";
import {
  collaboratorRoleLabels,
  type CollaboratorRole,
  type SharePermissionPreset,
  sharePresetConfig,
} from "@/features/files/permissions";

export const WORKSPACE_POLICY_ACTION = "workspace.policy.update";

export const workspacePolicyInviteModes = [
  "any-existing-user",
  "same-domain-only",
  "admins-only",
] as const;

export const workspacePolicySessionModes = [
  "monitor",
  "review-stale",
  "revoke-expired",
] as const;

export type WorkspacePolicyInviteMode =
  (typeof workspacePolicyInviteModes)[number];

export type WorkspacePolicySessionMode =
  (typeof workspacePolicySessionModes)[number];

export type WorkspacePolicySettings = {
  defaultShareExpiryDays: number;
  allowPublicDownloads: boolean;
  allowPublicComments: boolean;
  inviteMode: WorkspacePolicyInviteMode;
  maxInviteRole: CollaboratorRole;
  sessionMode: WorkspacePolicySessionMode;
  staleSessionDays: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type WorkspaceSharePolicyResult = {
  accessLevel: "inspect" | "prototype" | "review";
  allowComments: boolean;
  allowDownload: boolean;
  expiresAt: Date | null;
};

export type WorkspacePolicyDecision = {
  allowed: boolean;
  reason: string | null;
};

export type WorkspacePolicyFinding = {
  id: string;
  label: string;
  status: "ready" | "review" | "blocked";
  value: string;
  detail: string;
};

export type WorkspacePolicyReviewReport = {
  settings: WorkspacePolicySettings;
  status: "ready" | "review" | "blocked";
  score: number;
  activeShareCount: number;
  downloadShareCount: number;
  commentShareCount: number;
  expiredShareCount: number;
  staleSessionCount: number;
  expiredSessionCount: number;
  findings: WorkspacePolicyFinding[];
};

type WorkspacePolicyEvent = {
  action: string;
  actorEmail: string;
  createdAt: string | Date;
  metadata: AdminAuditMetadata;
};

type WorkspacePolicyShareRow = {
  allowComments: boolean;
  allowDownload: boolean;
  disabledAt: string | null;
  expiresAt: string | null;
};

type WorkspacePolicySessionRow = {
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
};

const defaultWorkspacePolicySettings: WorkspacePolicySettings = {
  defaultShareExpiryDays: 0,
  allowPublicDownloads: true,
  allowPublicComments: true,
  inviteMode: "any-existing-user",
  maxInviteRole: "editor",
  sessionMode: "monitor",
  staleSessionDays: 30,
  updatedAt: null,
  updatedBy: null,
};

const roleRank: Record<CollaboratorRole, number> = {
  viewer: 1,
  commenter: 2,
  editor: 3,
};

export function getDefaultWorkspacePolicySettings(): WorkspacePolicySettings {
  return { ...defaultWorkspacePolicySettings };
}

export function createWorkspacePolicyMetadata(
  settings: WorkspacePolicySettings,
): AdminAuditMetadata {
  return {
    defaultShareExpiryDays: settings.defaultShareExpiryDays,
    allowPublicDownloads: settings.allowPublicDownloads,
    allowPublicComments: settings.allowPublicComments,
    inviteMode: settings.inviteMode,
    maxInviteRole: settings.maxInviteRole,
    sessionMode: settings.sessionMode,
    staleSessionDays: settings.staleSessionDays,
    updatedBy: settings.updatedBy,
  };
}

export function getWorkspacePolicySettingsFromEvents(
  events: WorkspacePolicyEvent[],
): WorkspacePolicySettings {
  const event = events.find((row) => row.action === WORKSPACE_POLICY_ACTION);

  if (!event) {
    return getDefaultWorkspacePolicySettings();
  }

  return normalizeWorkspacePolicySettings({
    ...event.metadata,
    updatedAt: toIsoString(event.createdAt),
    updatedBy: readString(event.metadata.updatedBy, event.actorEmail),
  });
}

export function normalizeWorkspacePolicySettings(
  input: Partial<Record<keyof WorkspacePolicySettings, unknown>>,
): WorkspacePolicySettings {
  const defaults = getDefaultWorkspacePolicySettings();

  return {
    defaultShareExpiryDays: readNumber(
      input.defaultShareExpiryDays,
      defaults.defaultShareExpiryDays,
      0,
      365,
    ),
    allowPublicDownloads: readBoolean(
      input.allowPublicDownloads,
      defaults.allowPublicDownloads,
    ),
    allowPublicComments: readBoolean(
      input.allowPublicComments,
      defaults.allowPublicComments,
    ),
    inviteMode: readEnum(
      input.inviteMode,
      workspacePolicyInviteModes,
      defaults.inviteMode,
    ),
    maxInviteRole: readEnum(
      input.maxInviteRole,
      ["viewer", "commenter", "editor"] as const,
      defaults.maxInviteRole,
    ),
    sessionMode: readEnum(
      input.sessionMode,
      workspacePolicySessionModes,
      defaults.sessionMode,
    ),
    staleSessionDays: readNumber(
      input.staleSessionDays,
      defaults.staleSessionDays,
      1,
      365,
    ),
    updatedAt: readNullableString(input.updatedAt, defaults.updatedAt),
    updatedBy: readNullableString(input.updatedBy, defaults.updatedBy),
  };
}

export function applyWorkspaceSharePolicy(
  preset: SharePermissionPreset,
  settings: WorkspacePolicySettings,
  now = new Date(),
): WorkspaceSharePolicyResult {
  const presetConfig = sharePresetConfig[preset];

  return {
    accessLevel: presetConfig.accessLevel,
    allowComments: presetConfig.allowComments && settings.allowPublicComments,
    allowDownload: presetConfig.allowDownload && settings.allowPublicDownloads,
    expiresAt:
      settings.defaultShareExpiryDays > 0
        ? new Date(
            now.getTime() + settings.defaultShareExpiryDays * 24 * 60 * 60 * 1000,
          )
        : null,
  };
}

export function getInvitePolicyDecision({
  inviterEmail,
  inviterIsAdmin,
  role,
  settings,
  targetEmail,
}: {
  inviterEmail: string;
  inviterIsAdmin: boolean;
  role: CollaboratorRole;
  settings: WorkspacePolicySettings;
  targetEmail: string;
}): WorkspacePolicyDecision {
  if (!isCollaboratorRoleAllowed(role, settings)) {
    return {
      allowed: false,
      reason: `Workspace policy allows invites up to ${collaboratorRoleLabels[settings.maxInviteRole].toLowerCase()}.`,
    };
  }

  if (settings.inviteMode === "admins-only" && !inviterIsAdmin) {
    return {
      allowed: false,
      reason: "Workspace policy only allows administrators to invite collaborators.",
    };
  }

  if (
    settings.inviteMode === "same-domain-only" &&
    getEmailDomain(inviterEmail) !== getEmailDomain(targetEmail)
  ) {
    return {
      allowed: false,
      reason: "Workspace policy only allows collaborators from the same email domain.",
    };
  }

  return { allowed: true, reason: null };
}

export function isCollaboratorRoleAllowed(
  role: CollaboratorRole,
  settings: WorkspacePolicySettings,
) {
  return roleRank[role] <= roleRank[settings.maxInviteRole];
}

export function getWorkspacePolicyReviewReport({
  now = new Date(),
  sessions,
  settings,
  shares,
}: {
  now?: Date;
  sessions: WorkspacePolicySessionRow[];
  settings: WorkspacePolicySettings;
  shares: WorkspacePolicyShareRow[];
}): WorkspacePolicyReviewReport {
  const activeShares = shares.filter((share) => !share.disabledAt);
  const expiredShares = activeShares.filter(
    (share) => share.expiresAt && new Date(share.expiresAt).getTime() < now.getTime(),
  );
  const liveShares = activeShares.filter(
    (share) => !share.expiresAt || new Date(share.expiresAt).getTime() >= now.getTime(),
  );
  const downloadShareCount = liveShares.filter((share) => share.allowDownload).length;
  const commentShareCount = liveShares.filter((share) => share.allowComments).length;
  const staleSessionCutoff =
    now.getTime() - settings.staleSessionDays * 24 * 60 * 60 * 1000;
  const expiredSessionCount = sessions.filter(
    (row) => new Date(row.expiresAt).getTime() < now.getTime(),
  ).length;
  const staleSessionCount = sessions.filter(
    (row) => new Date(row.updatedAt || row.createdAt).getTime() < staleSessionCutoff,
  ).length;
  const findings: WorkspacePolicyFinding[] = [
    getExpiryFinding(settings),
    getDownloadFinding(settings, downloadShareCount),
    getCommentFinding(settings, commentShareCount),
    getInviteFinding(settings),
    getRoleFinding(settings),
    getSessionFinding(settings, staleSessionCount, expiredSessionCount),
    getShareInventoryFinding(activeShares.length, expiredShares.length),
  ];
  const score = getPolicyScore({
    downloadShareCount,
    expiredSessionCount,
    settings,
    staleSessionCount,
  });

  return {
    settings,
    status: score >= 85 ? "ready" : score >= 60 ? "review" : "blocked",
    score,
    activeShareCount: activeShares.length,
    downloadShareCount,
    commentShareCount,
    expiredShareCount: expiredShares.length,
    staleSessionCount,
    expiredSessionCount,
    findings,
  };
}

function getExpiryFinding(
  settings: WorkspacePolicySettings,
): WorkspacePolicyFinding {
  if (settings.defaultShareExpiryDays > 0) {
    return {
      id: "default-share-expiry",
      label: "Default share expiry",
      status: "ready",
      value: `${settings.defaultShareExpiryDays} days`,
      detail: "New public share links receive an automatic expiration date.",
    };
  }

  return {
    id: "default-share-expiry",
    label: "Default share expiry",
    status: "review",
    value: "No automatic expiry",
    detail: "New public share links stay live until someone manually disables them.",
  };
}

function getDownloadFinding(
  settings: WorkspacePolicySettings,
  downloadShareCount: number,
): WorkspacePolicyFinding {
  if (!settings.allowPublicDownloads && downloadShareCount > 0) {
    return {
      id: "public-downloads",
      label: "Public downloads",
      status: "blocked",
      value: `${downloadShareCount} existing links`,
      detail: "The saved policy blocks downloads, but older live links still expose downloads.",
    };
  }

  if (!settings.allowPublicDownloads) {
    return {
      id: "public-downloads",
      label: "Public downloads",
      status: "ready",
      value: "Blocked for new links",
      detail: "New public share links cannot expose file downloads.",
    };
  }

  return {
    id: "public-downloads",
    label: "Public downloads",
    status: downloadShareCount > 0 ? "review" : "ready",
    value: `${downloadShareCount} live links`,
    detail: "Downloads are allowed for presets that normally include handoff assets.",
  };
}

function getCommentFinding(
  settings: WorkspacePolicySettings,
  commentShareCount: number,
): WorkspacePolicyFinding {
  if (!settings.allowPublicComments && commentShareCount > 0) {
    return {
      id: "public-comments",
      label: "Public comments",
      status: "review",
      value: `${commentShareCount} existing links`,
      detail: "The saved policy blocks comments, but older review links still allow comments.",
    };
  }

  return {
    id: "public-comments",
    label: "Public comments",
    status: "ready",
    value: settings.allowPublicComments ? "Allowed by policy" : "Blocked for new links",
    detail: settings.allowPublicComments
      ? "New review links can collect collaborator feedback."
      : "New public share links cannot collect comments.",
  };
}

function getInviteFinding(
  settings: WorkspacePolicySettings,
): WorkspacePolicyFinding {
  const values: Record<WorkspacePolicyInviteMode, string> = {
    "any-existing-user": "Any registered user",
    "same-domain-only": "Same email domain",
    "admins-only": "Administrators only",
  };

  return {
    id: "invite-restriction",
    label: "Invite restriction",
    status: settings.inviteMode === "any-existing-user" ? "review" : "ready",
    value: values[settings.inviteMode],
    detail:
      settings.inviteMode === "any-existing-user"
        ? "File owners can invite any existing account in the workspace."
        : "New collaborator invites are restricted before access is changed.",
  };
}

function getRoleFinding(
  settings: WorkspacePolicySettings,
): WorkspacePolicyFinding {
  return {
    id: "max-invite-role",
    label: "Maximum invite role",
    status: settings.maxInviteRole === "editor" ? "review" : "ready",
    value: collaboratorRoleLabels[settings.maxInviteRole],
    detail:
      settings.maxInviteRole === "editor"
        ? "File owners can grant full editor access by default."
        : "File owners cannot grant roles above this workspace limit.",
  };
}

function getSessionFinding(
  settings: WorkspacePolicySettings,
  staleSessionCount: number,
  expiredSessionCount: number,
): WorkspacePolicyFinding {
  if (expiredSessionCount > 0 && settings.sessionMode === "revoke-expired") {
    return {
      id: "session-hygiene",
      label: "Session hygiene",
      status: "blocked",
      value: `${expiredSessionCount} expired`,
      detail: "Policy expects expired sessions to be revoked, but expired sessions still exist.",
    };
  }

  return {
    id: "session-hygiene",
    label: "Session hygiene",
    status:
      staleSessionCount > 0 || expiredSessionCount > 0
        ? settings.sessionMode === "monitor"
          ? "review"
          : "blocked"
        : "ready",
    value: `${staleSessionCount} stale / ${expiredSessionCount} expired`,
    detail:
      settings.sessionMode === "monitor"
        ? "Admins monitor stale sessions before taking manual action."
        : "Admins should review or revoke sessions outside the configured age window.",
  };
}

function getShareInventoryFinding(
  activeShareCount: number,
  expiredShareCount: number,
): WorkspacePolicyFinding {
  return {
    id: "share-inventory",
    label: "Share inventory",
    status: expiredShareCount > 0 ? "review" : "ready",
    value: `${activeShareCount} active / ${expiredShareCount} expired`,
    detail:
      expiredShareCount > 0
        ? "Expired links are still visible in the admin review window until disabled."
        : "No expired active shares were found in the recent review window.",
  };
}

function getPolicyScore({
  downloadShareCount,
  expiredSessionCount,
  settings,
  staleSessionCount,
}: {
  downloadShareCount: number;
  expiredSessionCount: number;
  settings: WorkspacePolicySettings;
  staleSessionCount: number;
}) {
  let score = 100;

  if (settings.defaultShareExpiryDays === 0) {
    score -= 18;
  }

  if (settings.allowPublicDownloads) {
    score -= 8;
  }

  score -= Math.min(downloadShareCount * 3, 12);

  if (settings.inviteMode === "any-existing-user") {
    score -= 12;
  } else if (settings.inviteMode === "same-domain-only") {
    score -= 4;
  }

  if (settings.maxInviteRole === "editor") {
    score -= 8;
  } else if (settings.maxInviteRole === "commenter") {
    score -= 3;
  }

  if (settings.sessionMode === "monitor") {
    score -= 8;
  } else if (settings.sessionMode === "review-stale") {
    score -= 3;
  }

  score -= Math.min(staleSessionCount * 2, 10);
  score -= Math.min(expiredSessionCount * 3, 12);

  return Math.max(0, Math.min(100, score));
}

function getEmailDomain(email: string) {
  return email.toLowerCase().split("@")[1] ?? "";
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNullableString(value: unknown, fallback: string | null) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readEnum<const T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && options.includes(value)
    ? value
    : fallback;
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}
