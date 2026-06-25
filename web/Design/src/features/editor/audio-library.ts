export type AudioLibraryKind = "music" | "sfx";

export type AudioLibraryItem = {
  id: string;
  kind: AudioLibraryKind;
  name: string;
  description: string;
  durationSeconds: number;
  bpm: number | null;
  tags: string[];
  sourceProvider: string;
  authorName: string;
  licenseName: string;
  licenseUrl: string;
  generator:
    | { type: "pulse-bed"; rootFrequency: number; seed: number }
    | { type: "focus-bed"; rootFrequency: number; seed: number }
    | { type: "notification"; rootFrequency: number; seed: number }
    | { type: "whoosh"; rootFrequency: number; seed: number }
    | { type: "impact"; rootFrequency: number; seed: number };
};

const cc0LicenseUrl = "https://creativecommons.org/publicdomain/zero/1.0/";

export const audioLibraryItems: AudioLibraryItem[] = [
  {
    id: "warm-pulse-bed",
    kind: "music",
    name: "Warm Pulse Bed",
    description: "Soft pulsing chords for explainers and product scenes.",
    durationSeconds: 14,
    bpm: 92,
    tags: ["background", "warm"],
    sourceProvider: "Essence Studio Originals",
    authorName: "Essence Studio",
    licenseName: "CC0 1.0",
    licenseUrl: cc0LicenseUrl,
    generator: { type: "pulse-bed", rootFrequency: 174.61, seed: 17 },
  },
  {
    id: "clear-focus-bed",
    kind: "music",
    name: "Clear Focus Bed",
    description: "Calm loop bed for tutorials, dashboards, and slides.",
    durationSeconds: 16,
    bpm: 78,
    tags: ["background", "calm"],
    sourceProvider: "Essence Studio Originals",
    authorName: "Essence Studio",
    licenseName: "CC0 1.0",
    licenseUrl: cc0LicenseUrl,
    generator: { type: "focus-bed", rootFrequency: 220, seed: 29 },
  },
  {
    id: "soft-notification",
    kind: "sfx",
    name: "Soft Notification",
    description: "Two-note confirmation sound for UI moments.",
    durationSeconds: 1.25,
    bpm: null,
    tags: ["notification", "ui"],
    sourceProvider: "Essence Studio Originals",
    authorName: "Essence Studio",
    licenseName: "CC0 1.0",
    licenseUrl: cc0LicenseUrl,
    generator: { type: "notification", rootFrequency: 587.33, seed: 43 },
  },
  {
    id: "clean-whoosh",
    kind: "sfx",
    name: "Clean Whoosh",
    description: "Short transition sweep for motion and video cuts.",
    durationSeconds: 1,
    bpm: null,
    tags: ["transition", "sweep"],
    sourceProvider: "Essence Studio Originals",
    authorName: "Essence Studio",
    licenseName: "CC0 1.0",
    licenseUrl: cc0LicenseUrl,
    generator: { type: "whoosh", rootFrequency: 160, seed: 61 },
  },
  {
    id: "soft-impact",
    kind: "sfx",
    name: "Soft Impact",
    description: "Low hit for titles, reveals, and section changes.",
    durationSeconds: 0.85,
    bpm: null,
    tags: ["impact", "title"],
    sourceProvider: "Essence Studio Originals",
    authorName: "Essence Studio",
    licenseName: "CC0 1.0",
    licenseUrl: cc0LicenseUrl,
    generator: { type: "impact", rootFrequency: 82.41, seed: 83 },
  },
];
