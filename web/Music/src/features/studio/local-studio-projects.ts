import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import type { LocalSong } from "@/features/library/types";
import type {
  LocalStudioMarker,
  LocalStudioProject,
  LocalStudioProjectVersion,
  LocalStudioTakeLane,
  LocalStudioTrack,
  StudioMarkerKind,
  StudioTimeSignature,
} from "./types";

const DB_NAME = "essence-suno-studio";
const DB_VERSION = 3;
const PRIMARY_PROJECT_ID = "primary";
const MAX_VERSION_COUNT = 20;
const MIN_VERSION_INTERVAL_MS = 15_000;
const trackColors = ["#6ee7b7", "#93c5fd", "#fda4af", "#fde68a", "#c4b5fd"];
const markerKinds: StudioMarkerKind[] = [
  "intro",
  "verse",
  "chorus",
  "hook",
  "bridge",
  "outro",
  "note",
];

interface EssenceSunoStudioDb extends DBSchema {
  projects: {
    key: string;
    value: LocalStudioProject;
    indexes: {
      "by-updated-at": number;
    };
  };
  versions: {
    key: string;
    value: LocalStudioProjectVersion;
    indexes: {
      "by-project-id": string;
      "by-created-at": number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<EssenceSunoStudioDb>> | undefined;

function getStudioDb() {
  dbPromise ??= openDB<EssenceSunoStudioDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("projects")) {
        const projects = db.createObjectStore("projects", { keyPath: "id" });
        projects.createIndex("by-updated-at", "updatedAt");
      }

      if (!db.objectStoreNames.contains("versions")) {
        const versions = db.createObjectStore("versions", { keyPath: "id" });
        versions.createIndex("by-project-id", "projectId");
        versions.createIndex("by-created-at", "createdAt");
      }
    },
  });

  return dbPromise;
}

export async function getPrimaryStudioProject() {
  const db = await getStudioDb();
  const existing = await db.get("projects", PRIMARY_PROJECT_ID);

  if (existing) {
    const normalized = normalizeStudioProject(existing);

    if (normalized !== existing) {
      await db.put("projects", normalized);
    }

    return normalized;
  }

  const now = Date.now();
  const project: LocalStudioProject = {
    id: PRIMARY_PROJECT_ID,
    title: "Studio draft",
    bpm: 120,
    markers: [],
    pitchSemitones: 0,
    takeLanes: [],
    timeSignature: "4/4",
    tracks: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.put("projects", project);
  return project;
}

export async function saveStudioProject(
  project: LocalStudioProject,
  options: { forceVersion?: boolean } = {},
) {
  const db = await getStudioDb();
  const saved: LocalStudioProject = {
    ...normalizeStudioProject(project),
    updatedAt: Date.now(),
  };

  await db.put("projects", saved);
  await maybeSaveVersion(saved, options.forceVersion ?? false);
  return saved;
}

export async function listStudioProjectVersions(projectId = PRIMARY_PROJECT_ID) {
  const db = await getStudioDb();
  const versions = await db.getAllFromIndex("versions", "by-project-id", projectId);

  return versions
    .map(normalizeStudioProjectVersion)
    .toSorted((a, b) => b.createdAt - a.createdAt);
}

export async function restoreStudioProjectVersion(versionId: string) {
  const db = await getStudioDb();
  const version = await db.get("versions", versionId);

  if (!version) {
    throw new Error("Studio version not found.");
  }

  const existing = await getPrimaryStudioProject();
  const restored: LocalStudioProject = {
    ...existing,
    bpm: version.bpm ?? existing.bpm,
    markers: structuredClone(version.markers ?? []),
    pitchSemitones: version.pitchSemitones ?? existing.pitchSemitones,
    takeLanes: structuredClone(version.takeLanes ?? []),
    timeSignature: version.timeSignature ?? existing.timeSignature,
    title: version.title,
    tracks: version.tracks,
    updatedAt: Date.now(),
  };

  await db.put("projects", restored);
  await saveVersionSnapshot(restored);
  return restored;
}

async function maybeSaveVersion(
  project: LocalStudioProject,
  forceVersion: boolean,
) {
  const versions = await listStudioProjectVersions(project.id);
  const latest = versions[0];
  const canAutosave =
    !latest || Date.now() - latest.createdAt >= MIN_VERSION_INTERVAL_MS;

  if (!forceVersion && !canAutosave) {
    return;
  }

  await saveVersionSnapshot(project);
}

async function saveVersionSnapshot(project: LocalStudioProject) {
  const db = await getStudioDb();
  const version: LocalStudioProjectVersion = {
    id: nanoid(),
    projectId: project.id,
    bpm: project.bpm,
    markers: structuredClone(project.markers),
    pitchSemitones: project.pitchSemitones,
    takeLanes: structuredClone(project.takeLanes),
    timeSignature: project.timeSignature,
    title: project.title,
    tracks: structuredClone(project.tracks),
    createdAt: Date.now(),
  };

  await db.put("versions", version);
  await pruneVersions(project.id);
}

async function pruneVersions(projectId: string) {
  const db = await getStudioDb();
  const versions = await listStudioProjectVersions(projectId);
  const staleVersions = versions.slice(MAX_VERSION_COUNT);

  await Promise.all(staleVersions.map((version) => db.delete("versions", version.id)));
}

export function createTrackFromSong(
  song: LocalSong,
  position: number,
): LocalStudioTrack {
  return {
    id: nanoid(),
    songId: song.id,
    trackName: song.title,
    gainDb: 0,
    pan: 0,
    muted: false,
    solo: false,
    color: trackColors[position % trackColors.length],
    position,
  };
}

export function createStudioMarker(
  startMs: number,
  kind: StudioMarkerKind = "hook",
): LocalStudioMarker {
  return {
    id: nanoid(),
    kind,
    label: labelForMarkerKind(kind),
    startMs: Math.max(0, Math.round(startMs)),
  };
}

export function createTakeLane(track: LocalStudioTrack): LocalStudioTakeLane {
  return {
    id: nanoid(),
    active: true,
    createdAt: Date.now(),
    name: `${track.trackName} alternate`,
    notes: "",
    trackId: track.id,
  };
}

function normalizeStudioProject(project: LocalStudioProject): LocalStudioProject {
  return {
    ...project,
    bpm: clampInteger(project.bpm ?? 120, 40, 240),
    markers: normalizeMarkers(project.markers ?? []),
    pitchSemitones: clampInteger(project.pitchSemitones ?? 0, -12, 12),
    takeLanes: normalizeTakeLanes(project.takeLanes ?? [], project.tracks ?? []),
    timeSignature: normalizeTimeSignature(project.timeSignature),
    tracks: project.tracks ?? [],
  };
}

function normalizeStudioProjectVersion(
  version: LocalStudioProjectVersion,
): LocalStudioProjectVersion {
  return {
    ...version,
    bpm: clampInteger(version.bpm ?? 120, 40, 240),
    markers: normalizeMarkers(version.markers ?? []),
    pitchSemitones: clampInteger(version.pitchSemitones ?? 0, -12, 12),
    takeLanes: normalizeTakeLanes(version.takeLanes ?? [], version.tracks ?? []),
    timeSignature: normalizeTimeSignature(version.timeSignature),
    tracks: version.tracks ?? [],
  };
}

function normalizeMarkers(markers: LocalStudioMarker[]) {
  return markers
    .map((marker) => ({
      ...marker,
      kind: markerKinds.includes(marker.kind) ? marker.kind : "note",
      label: marker.label.trim() || labelForMarkerKind(marker.kind),
      startMs: Math.max(0, Math.round(marker.startMs || 0)),
    }))
    .toSorted((a, b) => a.startMs - b.startMs);
}

function normalizeTakeLanes(
  takeLanes: LocalStudioTakeLane[],
  tracks: LocalStudioTrack[],
) {
  const trackIds = new Set(tracks.map((track) => track.id));

  return takeLanes
    .filter((take) => trackIds.has(take.trackId))
    .map((take) => ({
      ...take,
      active: Boolean(take.active),
      createdAt: take.createdAt || Date.now(),
      name: take.name.trim() || "Alternate take",
      notes: take.notes ?? "",
    }));
}

function normalizeTimeSignature(value?: string): StudioTimeSignature {
  return value === "3/4" ||
    value === "5/4" ||
    value === "6/8" ||
    value === "7/8"
    ? value
    : "4/4";
}

function labelForMarkerKind(kind: StudioMarkerKind) {
  return kind === "note"
    ? "Note"
    : kind.charAt(0).toUpperCase() + kind.slice(1);
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}
