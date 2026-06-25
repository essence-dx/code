import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import type { PersistedWorkbook } from "@/features/workbooks/types";

export const embeddedWorkbookUser = {
  email: "analyst@dx.local",
  name: "DX Analyst",
};

export const embeddedWorkbookSnapshotDate = new Date("2026-01-01T00:00:00.000Z");

export function createEmbeddedWorkbook(
  now = embeddedWorkbookSnapshotDate,
): PersistedWorkbook {
  return {
    id: "dx-local-workbook",
    name: "DX Workbook",
    accessRole: "owner",
    ownerEmail: embeddedWorkbookUser.email,
    isFavorite: false,
    isTemplate: false,
    folderName: "",
    description: "Local workbook for the embedded editor.",
    tags: ["local", "embedded"],
    lastOpenedAt: now,
    updatedAt: now,
    createdAt: now,
    document: createDefaultWorkbookDocument(),
  };
}
