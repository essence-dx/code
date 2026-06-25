import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import type {
  FormulaWorkerRequest,
  FormulaWorkerResponse,
} from "@/features/spreadsheet/formula-worker-messages";

type FormulaWorkerScope = {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<FormulaWorkerRequest>) => void,
  ) => void;
  postMessage: (message: FormulaWorkerResponse) => void;
};

const workerScope = self as unknown as FormulaWorkerScope;

workerScope.addEventListener("message", (event) => {
  const { activeSheetId, document, previousValues, requestId, targetKeys } =
    event.data;

  try {
    workerScope.postMessage({
      requestId,
      values: evaluateWorkbook(document, activeSheetId, {
        previousValues,
        targetKeys: targetKeys ? new Set(targetKeys) : undefined,
      }),
    });
  } catch (error) {
    workerScope.postMessage({
      error:
        error instanceof Error ? error.message : "Formula calculation failed.",
      requestId,
    });
  }
});

export {};
