import type { ProjectTemplateVersionAction, ProjectTemplateVersionEntry } from "@/db/schema";

const maxVersionHistoryEntries = 12;

export function createProjectTemplateVersionEntry(input: {
  action: ProjectTemplateVersionAction;
  actorUserId: string | null;
  at: Date;
  sourceProjectId?: string | null;
  sourceTemplateId?: string | null;
  version: number;
}): ProjectTemplateVersionEntry {
  return {
    action: input.action,
    actorUserId: input.actorUserId,
    at: input.at.toISOString(),
    sourceProjectId: input.sourceProjectId ?? null,
    sourceTemplateId: input.sourceTemplateId ?? null,
    version: input.version,
  };
}

export function normalizeProjectTemplateVersionHistory(value: unknown): ProjectTemplateVersionEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is ProjectTemplateVersionEntry => {
      const candidate = entry as Partial<ProjectTemplateVersionEntry>;

      return Boolean(
        candidate &&
          typeof candidate.at === "string" &&
          typeof candidate.version === "number" &&
          ["cloned", "created", "refreshed", "updated"].includes(String(candidate.action)),
      );
    })
    .slice(-maxVersionHistoryEntries);
}

export function appendProjectTemplateVersionHistory(value: unknown, entry: ProjectTemplateVersionEntry): ProjectTemplateVersionEntry[] {
  return [...normalizeProjectTemplateVersionHistory(value), entry].slice(-maxVersionHistoryEntries);
}
