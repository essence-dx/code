import { nanoid } from "nanoid";
import { z } from "zod";
import { sceneAudioAssetSchema, type SceneAudioAsset } from "../types";

const audioLibraryFileSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  audio: z.array(sceneAudioAssetSchema),
  exportedAt: z.string(),
});

export type AudioLibraryFile = z.infer<typeof audioLibraryFileSchema>;

function createUniqueName(baseName: string, existingNames: Set<string>) {
  const trimmedBase = baseName.trim() || "Audio";
  let name = trimmedBase;
  let suffix = 2;

  while (existingNames.has(name)) {
    name = `${trimmedBase} ${suffix}`;
    suffix += 1;
  }

  existingNames.add(name);

  return name;
}

function normalizeImportedAudio(asset: SceneAudioAsset, existingNames: Set<string>): SceneAudioAsset {
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    name: createUniqueName(asset.name, existingNames),
    audio: structuredClone(asset.audio),
    createdAt: now,
    updatedAt: now,
  };
}

export function createAudioLibraryFile(name: string, audio: SceneAudioAsset[]): AudioLibraryFile {
  return {
    version: 1,
    name,
    audio: structuredClone(audio),
    exportedAt: new Date().toISOString(),
  };
}

export function serializeAudioLibraryFile(library: AudioLibraryFile) {
  return JSON.stringify(library, null, 2);
}

export function parseAudioLibraryFile(text: string): AudioLibraryFile {
  const parsed = audioLibraryFileSchema.safeParse(JSON.parse(text));

  if (!parsed.success) {
    throw new Error("This file is not a valid Essence audio library.");
  }

  return parsed.data;
}

export function mergeAudioLibrary(currentAudio: SceneAudioAsset[], incomingAudio: SceneAudioAsset[]) {
  const existingNames = new Set(currentAudio.map((asset) => asset.name));
  const importedAudio = incomingAudio.map((asset) => normalizeImportedAudio(asset, existingNames));

  return [...currentAudio, ...importedAudio];
}
