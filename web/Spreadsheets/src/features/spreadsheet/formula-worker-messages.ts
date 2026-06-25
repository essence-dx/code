import type { WorkbookDocument } from "@/features/workbooks/types";

export type FormulaWorkerRequest = {
  activeSheetId: string;
  document: WorkbookDocument;
  previousValues?: Record<string, string>;
  requestId: number;
  targetKeys?: string[];
};

export type FormulaWorkerResponse =
  | {
      requestId: number;
      values: Record<string, string>;
    }
  | {
      error: string;
      requestId: number;
    };
