import { nanoid } from "nanoid";
import { z } from "zod";
import { sceneMaterialAssetSchema, type SceneMaterialAsset } from "../types";

const materialLibraryFileSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  materials: z.array(sceneMaterialAssetSchema),
  exportedAt: z.string(),
});

export type MaterialLibraryFile = z.infer<typeof materialLibraryFileSchema>;

function createUniqueName(baseName: string, existingNames: Set<string>) {
  const trimmedBase = baseName.trim() || "Material";
  let name = trimmedBase;
  let suffix = 2;

  while (existingNames.has(name)) {
    name = `${trimmedBase} ${suffix}`;
    suffix += 1;
  }

  existingNames.add(name);

  return name;
}

function normalizeImportedMaterial(asset: SceneMaterialAsset, existingNames: Set<string>): SceneMaterialAsset {
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    name: createUniqueName(asset.name, existingNames),
    material: structuredClone(asset.material),
    createdAt: now,
    updatedAt: now,
  };
}

export function createMaterialLibraryFile(name: string, materials: SceneMaterialAsset[]): MaterialLibraryFile {
  return {
    version: 1,
    name,
    materials: structuredClone(materials),
    exportedAt: new Date().toISOString(),
  };
}

export function serializeMaterialLibraryFile(library: MaterialLibraryFile) {
  return JSON.stringify(library, null, 2);
}

export function parseMaterialLibraryFile(text: string): MaterialLibraryFile {
  const parsed = materialLibraryFileSchema.safeParse(JSON.parse(text));

  if (!parsed.success) {
    throw new Error("This file is not a valid Essence material library.");
  }

  return parsed.data;
}

export function mergeMaterialLibrary(currentMaterials: SceneMaterialAsset[], incomingMaterials: SceneMaterialAsset[]) {
  const existingNames = new Set(currentMaterials.map((asset) => asset.name));
  const importedMaterials = incomingMaterials.map((asset) => normalizeImportedMaterial(asset, existingNames));

  return [...currentMaterials, ...importedMaterials];
}
