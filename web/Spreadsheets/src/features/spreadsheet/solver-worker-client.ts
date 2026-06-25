"use client";

import type {
  SolverWorkerRequest,
  SolverWorkerResponse,
} from "@/features/spreadsheet/solver-worker-messages";
import type {
  SolverRequest,
  SolverResult,
} from "@/features/spreadsheet/what-if-solver";
import type { WorkbookDocument } from "@/features/workbooks/types";

const workerRequestTimeoutMs = 10_000;

function shouldUseSolverWorker(request: SolverRequest) {
  return (
    request.engine === "adaptive" ||
    request.variables.length > 3 ||
    (request.constraints?.length ?? 0) > 4
  );
}

export function shouldRunSolverInWorker(request: SolverRequest) {
  return typeof Worker !== "undefined" && shouldUseSolverWorker(request);
}

export function runSolverInWorker(input: {
  activeSheetId: string;
  document: WorkbookDocument;
  request: SolverRequest;
  requestId: number;
}) {
  return new Promise<SolverResult>((resolve, reject) => {
    const worker = new Worker(new URL("./solver-worker.ts", import.meta.url), {
      type: "module",
    });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("Solver worker timed out."));
    }, workerRequestTimeoutMs);

    function cleanup() {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
    }

    function handleMessage(event: MessageEvent<SolverWorkerResponse>) {
      const response = event.data;

      if (response.requestId !== input.requestId) {
        return;
      }

      cleanup();

      if ("error" in response) {
        reject(new Error(response.error));
        return;
      }

      resolve(response.result);
    }

    function handleError() {
      cleanup();
      reject(new Error("Solver worker failed."));
    }

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    const message: SolverWorkerRequest = {
      ...input.request,
      activeSheetId: input.activeSheetId,
      document: input.document,
      requestId: input.requestId,
    };

    worker.postMessage(message);
  });
}
