export type LocalStudioTrack = {
  id: string;
  songId: string;
  trackName: string;
  gainDb: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
  position: number;
};

export type StudioTimeSignature = "4/4" | "3/4" | "5/4" | "6/8" | "7/8";

export type StudioMarkerKind =
  | "intro"
  | "verse"
  | "chorus"
  | "hook"
  | "bridge"
  | "outro"
  | "note";

export type LocalStudioMarker = {
  id: string;
  label: string;
  kind: StudioMarkerKind;
  startMs: number;
};

export type LocalStudioTakeLane = {
  id: string;
  active: boolean;
  createdAt: number;
  name: string;
  notes: string;
  trackId: string;
};

export type LocalStudioProject = {
  id: string;
  title: string;
  bpm: number;
  markers: LocalStudioMarker[];
  pitchSemitones: number;
  takeLanes: LocalStudioTakeLane[];
  timeSignature: StudioTimeSignature;
  tracks: LocalStudioTrack[];
  createdAt: number;
  updatedAt: number;
};

export type LocalStudioProjectVersion = {
  id: string;
  projectId: string;
  title: string;
  bpm: number;
  markers: LocalStudioMarker[];
  pitchSemitones: number;
  takeLanes: LocalStudioTakeLane[];
  timeSignature: StudioTimeSignature;
  tracks: LocalStudioTrack[];
  createdAt: number;
};
