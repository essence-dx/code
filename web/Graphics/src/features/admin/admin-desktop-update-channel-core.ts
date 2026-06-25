import type { AdminDesktopReleaseConfig } from "@/features/admin/admin-release-channels";

export type AdminDesktopUpdateChannelStatus = "ready" | "review" | "blocked";

export type AdminDesktopUpdateChannelKind = "beta" | "canary" | "stable";

export type AdminDesktopRolloutHold = {
  active: boolean;
  reason: string | null;
  expiresAt: string | null;
};

export type AdminDesktopUpdateChannelSettings = {
  activeChannel: AdminDesktopUpdateChannelKind;
  currentVersion: string;
  targetVersion: string;
  minimumVersion: string;
  feedUrl: string | null;
  signatureRequired: boolean;
  rolloutPercent: number;
  hold: AdminDesktopRolloutHold;
};

export type AdminDesktopUpdateChannelRow = {
  id: string;
  status: AdminDesktopUpdateChannelStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  artifactCount: number;
};

export type AdminDesktopUpdateChannelPackage = {
  channel: AdminDesktopUpdateChannelKind;
  label: string;
  status: AdminDesktopUpdateChannelStatus;
  score: number;
  currentVersion: string;
  targetVersion: string;
  minimumVersion: string;
  rolloutPercent: number;
  feedUrl: string | null;
  hold: AdminDesktopRolloutHold;
  rows: AdminDesktopUpdateChannelRow[];
};

export type AdminDesktopUpdateChannelReport = {
  generatedAt: string;
  status: AdminDesktopUpdateChannelStatus;
  score: number;
  activeChannel: AdminDesktopUpdateChannelKind;
  currentVersion: string;
  targetVersion: string;
  minimumVersion: string;
  rolloutPercent: number;
  holdActive: boolean;
  holdReason: string | null;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  packageCount: number;
  commandCount: number;
  rows: AdminDesktopUpdateChannelRow[];
  packages: AdminDesktopUpdateChannelPackage[];
  commands: string[];
};

export function getDesktopUpdateSettings({
  desktopReleaseConfig,
  env,
}: {
  desktopReleaseConfig: AdminDesktopReleaseConfig;
  env: Record<string, string | undefined>;
}): AdminDesktopUpdateChannelSettings {
  const currentVersion = desktopReleaseConfig.packageVersion;

  return {
    activeChannel: readChannel(env.ESSENCE_DESKTOP_UPDATE_CHANNEL),
    currentVersion,
    targetVersion:
      readString(env.ESSENCE_DESKTOP_UPDATE_TARGET_VERSION) ?? currentVersion,
    minimumVersion:
      readString(env.ESSENCE_DESKTOP_UPDATE_MIN_VERSION) ?? currentVersion,
    feedUrl: readString(env.ESSENCE_DESKTOP_UPDATE_FEED_URL),
    signatureRequired: readBoolean(
      env.ESSENCE_DESKTOP_UPDATE_SIGNATURE_REQUIRED,
      true,
    ),
    rolloutPercent: readPercent(env.ESSENCE_DESKTOP_UPDATE_ROLLOUT_PERCENT),
    hold: {
      active: readBoolean(env.ESSENCE_DESKTOP_UPDATE_HOLD, false),
      reason: readString(env.ESSENCE_DESKTOP_UPDATE_HOLD_REASON),
      expiresAt: readString(env.ESSENCE_DESKTOP_UPDATE_HOLD_EXPIRES_AT),
    },
  };
}

export function getRowsStatus(
  statuses: AdminDesktopUpdateChannelStatus[],
): AdminDesktopUpdateChannelStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

export function getRowsScore(rows: AdminDesktopUpdateChannelRow[]) {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;

  return Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);
}

export function compareVersions(left: string, right: string) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let index = 0; index < 3; index += 1) {
    const delta = leftParts[index] - rightParts[index];

    if (delta !== 0) {
      return delta > 0 ? 1 : -1;
    }
  }

  return 0;
}

export function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function readChannel(value: string | undefined): AdminDesktopUpdateChannelKind {
  if (value === "beta" || value === "canary" || value === "stable") {
    return value;
  }

  return "stable";
}

function readString(value: string | undefined) {
  return value?.trim() || null;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function readPercent(value: string | undefined) {
  if (!value) {
    return 100;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : -1;
}

function parseVersion(value: string) {
  const clean = value.trim().replace(/^[^\d]*/, "");
  const [major = "0", minor = "0", patch = "0"] = clean.split(".");

  return [major, minor, patch].map((part) => {
    const parsed = Number.parseInt(part, 10);

    return Number.isFinite(parsed) ? parsed : 0;
  }) as [number, number, number];
}
