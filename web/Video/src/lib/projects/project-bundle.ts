import { projectBundleSchema, type ProjectBundlePayload } from "@/lib/projects/project-sync-schema";

export const projectBundleFileSizeLimit = 10 * 1024 * 1024;

export function parseProjectBundleText(text: string): ProjectBundlePayload {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Project bundle is empty.");
  }

  try {
    return projectBundleSchema.parse(JSON.parse(trimmed));
  } catch {
    throw new Error("Project bundle is not valid.");
  }
}

export async function readProjectBundleFile(file: Pick<File, "name" | "type" | "size" | "text">): Promise<ProjectBundlePayload> {
  validateProjectBundleFile(file);
  return parseProjectBundleText(await file.text());
}

export function validateProjectBundleFile(file: Pick<File, "name" | "type" | "size">) {
  if (!isProjectBundleFile(file)) {
    throw new Error("Choose a project bundle JSON file.");
  }
  if (file.size > projectBundleFileSizeLimit) {
    throw new Error("Project bundle is too large.");
  }
}

export function isProjectBundleFile(file: Pick<File, "name" | "type">) {
  const normalizedName = file.name.toLowerCase();
  const normalizedType = file.type.toLowerCase();
  return normalizedType === "application/json" || normalizedName.endsWith(".json");
}
