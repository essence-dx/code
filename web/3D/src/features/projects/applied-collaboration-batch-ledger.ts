const ledgerPrefix = "essence-spline-applied-collaboration-batches";
const maxStoredBatchIds = 200;

function getProjectLedgerPrefix(projectId: string) {
  return `${ledgerPrefix}:${projectId}:`;
}

function getProjectBaselineLedgerKey(projectId: string, since: string) {
  return `${getProjectLedgerPrefix(projectId)}${since}`;
}

function isCurrentBaselineLedgerKey(key: string, projectId: string, since: string) {
  const baselineKey = getProjectBaselineLedgerKey(projectId, since);

  return key === baselineKey || key.startsWith(`${baselineKey}:scene:`);
}

export function getAppliedCollaborationBatchLedgerKey(projectId: string | null, since: string | null, sceneId?: string | null) {
  if (!projectId || !since) {
    return null;
  }

  const baselineKey = getProjectBaselineLedgerKey(projectId, since);

  return sceneId ? `${baselineKey}:scene:${sceneId}` : baselineKey;
}

export function readAppliedCollaborationBatchLedger(key: string | null) {
  if (!key || typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;

    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

export function writeAppliedCollaborationBatchLedger(key: string | null, batchIds: Set<string>) {
  if (!key || typeof window === "undefined") {
    return;
  }

  if (batchIds.size === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify([...batchIds].slice(-maxStoredBatchIds)));
}

export function pruneAppliedCollaborationBatchLedgers(projectId: string | null, activeKey: string | null, activeSince?: string | null) {
  if (!projectId || typeof window === "undefined") {
    return;
  }

  const projectPrefix = getProjectLedgerPrefix(projectId);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(projectPrefix) && key !== activeKey && (!activeSince || !isCurrentBaselineLedgerKey(key, projectId, activeSince))) {
      window.localStorage.removeItem(key);
    }
  }
}
