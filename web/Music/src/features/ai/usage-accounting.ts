"use client";

const ledgerKey = "essence-suno:usage-ledger";
const settingsKey = "essence-suno:usage-settings";
const usageChangedEvent = "essence-suno:usage-changed";
const maxEntries = 1000;

export type UsageKind = "audio" | "image" | "text" | "transcription";
export type UsageStatus = "disabled" | "failed" | "succeeded";

export type UsageEntry = {
  createdAt: number;
  id: string;
  kind: UsageKind;
  label: string;
  status: UsageStatus;
  units: number;
};

export type UsageSettings = {
  audioDailyLimit: number;
  audioMonthlyLimit: number;
  enforceAudioLimit: boolean;
};

export type UsageKindSummary = {
  daily: number;
  monthly: number;
  total: number;
};

export type UsageSummary = {
  byKind: Record<UsageKind, UsageKindSummary>;
  entries: UsageEntry[];
  settings: UsageSettings;
};

const defaultSettings: UsageSettings = {
  audioDailyLimit: 8,
  audioMonthlyLimit: 120,
  enforceAudioLimit: true,
};

const usageKinds = ["text", "image", "transcription", "audio"] as const;

export function recordUsageEvent(input: {
  kind: UsageKind;
  label: string;
  status?: UsageStatus;
  units?: number;
}) {
  const entries = listUsageEntries();
  const entry: UsageEntry = {
    createdAt: Date.now(),
    id: createUsageId(),
    kind: input.kind,
    label: input.label.trim() || labelForKind(input.kind),
    status: input.status ?? "succeeded",
    units: normalizeUnits(input.units),
  };

  writeUsageEntries([entry, ...entries].slice(0, maxEntries));
  return entry;
}

export function getUsageSummary(): UsageSummary {
  const entries = listUsageEntries();
  const todayStart = startOfDay(Date.now());
  const monthStart = startOfMonth(Date.now());
  const byKind = Object.fromEntries(
    usageKinds.map((kind) => [
      kind,
      summarizeKind(entries, kind, todayStart, monthStart),
    ]),
  ) as Record<UsageKind, UsageKindSummary>;

  return {
    byKind,
    entries,
    settings: getUsageSettings(),
  };
}

export function listUsageEntries() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ledgerKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isUsageEntry);
  } catch {
    return [];
  }
}

export function getUsageSettings(): UsageSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(settingsKey);
    const parsed = raw ? JSON.parse(raw) : {};

    if (!parsed || typeof parsed !== "object") {
      return defaultSettings;
    }

    const value = parsed as Partial<UsageSettings>;

    return {
      audioDailyLimit: normalizeLimit(
        value.audioDailyLimit,
        defaultSettings.audioDailyLimit,
      ),
      audioMonthlyLimit: normalizeLimit(
        value.audioMonthlyLimit,
        defaultSettings.audioMonthlyLimit,
      ),
      enforceAudioLimit:
        typeof value.enforceAudioLimit === "boolean"
          ? value.enforceAudioLimit
          : defaultSettings.enforceAudioLimit,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveUsageSettings(settings: UsageSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    settingsKey,
    JSON.stringify({
      audioDailyLimit: normalizeLimit(
        settings.audioDailyLimit,
        defaultSettings.audioDailyLimit,
      ),
      audioMonthlyLimit: normalizeLimit(
        settings.audioMonthlyLimit,
        defaultSettings.audioMonthlyLimit,
      ),
      enforceAudioLimit: settings.enforceAudioLimit,
    }),
  );
  dispatchUsageChanged();
}

export function clearUsageLedger() {
  writeUsageEntries([]);
}

export function serializeUsageLedger() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      settings: getUsageSettings(),
      type: "usage-ledger",
      version: 1,
      entries: listUsageEntries(),
    },
    null,
    2,
  );
}

export function checkAudioUsageLimit(nextUnits: number) {
  const settings = getUsageSettings();

  if (!settings.enforceAudioLimit) {
    return { allowed: true, message: "" };
  }

  const summary = getUsageSummary();
  const nextDaily = summary.byKind.audio.daily + normalizeUnits(nextUnits);
  const nextMonthly = summary.byKind.audio.monthly + normalizeUnits(nextUnits);

  if (nextDaily > settings.audioDailyLimit) {
    return {
      allowed: false,
      message: `Daily music limit reached (${summary.byKind.audio.daily}/${settings.audioDailyLimit}).`,
    };
  }

  if (nextMonthly > settings.audioMonthlyLimit) {
    return {
      allowed: false,
      message: `Monthly music limit reached (${summary.byKind.audio.monthly}/${settings.audioMonthlyLimit}).`,
    };
  }

  return { allowed: true, message: "" };
}

export function subscribeToUsage(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(usageChangedEvent, listener);
  return () => window.removeEventListener(usageChangedEvent, listener);
}

function writeUsageEntries(entries: UsageEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ledgerKey, JSON.stringify(entries));
  dispatchUsageChanged();
}

function dispatchUsageChanged() {
  window.dispatchEvent(new Event(usageChangedEvent));
}

function summarizeKind(
  entries: UsageEntry[],
  kind: UsageKind,
  todayStart: number,
  monthStart: number,
): UsageKindSummary {
  const matching = entries.filter((entry) => entry.kind === kind);

  return {
    daily: sumUnits(matching.filter((entry) => entry.createdAt >= todayStart)),
    monthly: sumUnits(matching.filter((entry) => entry.createdAt >= monthStart)),
    total: sumUnits(matching),
  };
}

function sumUnits(entries: UsageEntry[]) {
  return entries.reduce((total, entry) => total + entry.units, 0);
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfMonth(timestamp: number) {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function normalizeUnits(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.round(value))
    : 1;
}

function normalizeLimit(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.round(value))
    : fallback;
}

function labelForKind(kind: UsageKind) {
  const labels: Record<UsageKind, string> = {
    audio: "Music generation",
    image: "Cover image",
    text: "Writing request",
    transcription: "Transcription",
  };

  return labels[kind];
}

function createUsageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isUsageEntry(value: unknown): value is UsageEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<UsageEntry>;

  return (
    typeof entry.id === "string" &&
    typeof entry.createdAt === "number" &&
    usageKinds.includes(entry.kind as UsageKind) &&
    typeof entry.label === "string" &&
    ["disabled", "failed", "succeeded"].includes(entry.status ?? "") &&
    typeof entry.units === "number"
  );
}
