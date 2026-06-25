import type {
  SolverWorkerRequest,
  SolverWorkerResponse,
} from "@/features/spreadsheet/solver-worker-messages";
import { solveBoundedVariables } from "@/features/spreadsheet/what-if-solver";

type SolverWorkerScope = {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<SolverWorkerRequest>) => void,
  ) => void;
  postMessage: (message: SolverWorkerResponse) => void;
};

const workerScope = self as unknown as SolverWorkerScope;

workerScope.addEventListener("message", (event) => {
  const { requestId, ...solverInput } = event.data;

  try {
    workerScope.postMessage({
      requestId,
      result: solveBoundedVariables(solverInput),
    });
  } catch (error) {
    workerScope.postMessage({
      error: error instanceof Error ? error.message : "Solver failed.",
      requestId,
    });
  }
});

export {};
