import {
  createWorkbookBackupFileName,
  parseWorkbookBackup,
  workbookDocumentToBackupJson,
} from "@/features/workbooks/workbook-backup";
import type { WorkbookDocument } from "@/features/workbooks/types";

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      accept: Record<string, string[]>;
      description: string;
    }>;
  }) => Promise<{
    createWritable: () => Promise<{
      close: () => Promise<void>;
      write: (data: BlobPart) => Promise<void>;
    }>;
    name: string;
  }>;
};

export type LocalWorkbookSaveResult =
  | {
      blob: Blob;
      fileName: string;
      kind: "download";
    }
  | {
      fileName: string;
      kind: "saved";
    };

export async function saveWorkbookToLocalFile({
  document,
  workbookName,
}: {
  document: WorkbookDocument;
  workbookName: string;
}): Promise<LocalWorkbookSaveResult> {
  const fileName = createWorkbookBackupFileName(workbookName);
  const json = workbookDocumentToBackupJson({ document, workbookName });
  const pickerWindow =
    typeof window !== "undefined" ? (window as SaveFilePickerWindow) : null;

  if (pickerWindow?.showSaveFilePicker) {
    const handle = await pickerWindow.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          accept: {
            "application/json": [".json", ".essence-backup.json"],
          },
          description: "Essence Excel workbook backup",
        },
      ],
    });
    const writable = await handle.createWritable();

    await writable.write(json);
    await writable.close();

    return {
      fileName: handle.name || fileName,
      kind: "saved",
    };
  }

  return {
    blob: new Blob([json], { type: "application/json" }),
    fileName,
    kind: "download",
  };
}

export async function openWorkbookFromLocalFile(file: File) {
  return parseWorkbookBackup(await file.text());
}
