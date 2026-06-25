import type { DesignDocument } from "@/features/editor/types";

export type LocalDesignBackup = {
  fileId: string;
  fileName: string;
  document: DesignDocument;
  savedAt: string;
};

export type LocalDesignBackupMeta = {
  fileId: string;
  fileName: string;
  savedAt: string;
};

export type LocalDesignSnapshot = {
  id: string;
  fileId: string;
  fileName: string;
  reason: string;
  document: DesignDocument;
  savedAt: string;
};

export type LocalDesignSnapshotMeta = {
  id: string;
  fileId: string;
  fileName: string;
  reason: string;
  savedAt: string;
};

const snapshotLimit = 8;

export function writeLocalDesignBackup(
  fileId: string,
  fileName: string,
  document: DesignDocument,
) {
  const backup: LocalDesignBackup = {
    fileId,
    fileName,
    document,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(getBackupKey(fileId), JSON.stringify(backup));
  return toMeta(backup);
}

export function readLocalDesignBackup(fileId: string) {
  const raw = localStorage.getItem(getBackupKey(fileId));

  if (!raw) {
    return null;
  }

  try {
    const backup = JSON.parse(raw) as LocalDesignBackup;

    if (backup.fileId !== fileId || !backup.document) {
      return null;
    }

    return backup;
  } catch {
    return null;
  }
}

export function readLocalDesignBackupMeta(fileId: string) {
  const backup = readLocalDesignBackup(fileId);
  return backup ? toMeta(backup) : null;
}

export function clearLocalDesignBackup(fileId: string) {
  localStorage.removeItem(getBackupKey(fileId));
}

export function writeLocalDesignSnapshot(
  fileId: string,
  fileName: string,
  document: DesignDocument,
  reason: string,
) {
  const snapshot: LocalDesignSnapshot = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    fileId,
    fileName,
    reason,
    document,
    savedAt: new Date().toISOString(),
  };
  const snapshots = [snapshot, ...readLocalDesignSnapshots(fileId)]
    .filter((item) => item.fileId === fileId)
    .slice(0, snapshotLimit);

  localStorage.setItem(getSnapshotKey(fileId), JSON.stringify(snapshots));
  return snapshots.map(snapshotToMeta);
}

export function readLocalDesignSnapshots(fileId: string) {
  const raw = localStorage.getItem(getSnapshotKey(fileId));

  if (!raw) {
    return [];
  }

  try {
    const snapshots = JSON.parse(raw) as LocalDesignSnapshot[];

    if (!Array.isArray(snapshots)) {
      return [];
    }

    return snapshots.filter(
      (snapshot) => snapshot.fileId === fileId && Boolean(snapshot.document),
    );
  } catch {
    return [];
  }
}

export function readLocalDesignSnapshotMetas(fileId: string) {
  return readLocalDesignSnapshots(fileId).map(snapshotToMeta);
}

export function clearLocalDesignSnapshots(fileId: string) {
  localStorage.removeItem(getSnapshotKey(fileId));
}

function getBackupKey(fileId: string) {
  return `essence.design-backup.${fileId}`;
}

function getSnapshotKey(fileId: string) {
  return `essence.design-snapshots.${fileId}`;
}

function toMeta(backup: LocalDesignBackup): LocalDesignBackupMeta {
  return {
    fileId: backup.fileId,
    fileName: backup.fileName,
    savedAt: backup.savedAt,
  };
}

function snapshotToMeta(snapshot: LocalDesignSnapshot): LocalDesignSnapshotMeta {
  return {
    id: snapshot.id,
    fileId: snapshot.fileId,
    fileName: snapshot.fileName,
    reason: snapshot.reason,
    savedAt: snapshot.savedAt,
  };
}
