import type {
  SolverRequest,
  SolverResult,
} from "@/features/spreadsheet/what-if-solver";
import type { WorkbookDocument } from "@/features/workbooks/types";

export type SolverWorkerRequest = SolverRequest & {
  activeSheetId: string;
  document: WorkbookDocument;
  requestId: number;
};

export type SolverWorkerResponse =
  | {
      requestId: number;
      result: SolverResult;
    }
  | {
      error: string;
      requestId: number;
    };
