"use client";

import { useEffect, useRef, useState } from "react";
import {
  createWorkbookRecalculationPlan,
  type WorkbookRecalculationPlan,
} from "@/features/spreadsheet/formula-dependency-graph";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import type {
  FormulaWorkerRequest,
  FormulaWorkerResponse,
} from "@/features/spreadsheet/formula-worker-messages";
import type { WorkbookDocument } from "@/features/workbooks/types";

export type WorkbookEvaluationMode = "sync" | "worker";

export type WorkbookEvaluationState = {
  error: string | null;
  isCalculating: boolean;
  mode: WorkbookEvaluationMode;
  recalculationPlan: WorkbookRecalculationPlan;
  values: Record<string, string>;
};

function getEvaluationError(error: unknown) {
  return error instanceof Error ? error.message : "Formula calculation failed.";
}

function evaluateSynchronously(
  document: WorkbookDocument,
  activeSheetId: string,
  plan: WorkbookRecalculationPlan,
  previousValues: Record<string, string> | null,
) {
  return evaluateWorkbook(document, activeSheetId, {
    previousValues:
      plan.kind === "incremental" ? (previousValues ?? undefined) : undefined,
    targetKeys:
      plan.kind === "incremental" ? new Set(plan.targetKeys) : undefined,
  });
}

export function useWorkbookEvaluation(
  document: WorkbookDocument,
  activeSheetId: string,
) {
  const requestIdRef = useRef(0);
  const previousDocumentRef = useRef<WorkbookDocument | null>(null);
  const previousValuesRef = useRef<Record<string, string> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [evaluation, setEvaluation] = useState<WorkbookEvaluationState>(() => {
    const plan = createWorkbookRecalculationPlan({
      activeSheetId,
      document,
      previousDocument: null,
      previousValues: null,
    });

    try {
      const values = evaluateSynchronously(document, activeSheetId, plan, null);

      previousDocumentRef.current = document;
      previousValuesRef.current = values;

      return {
        error: null,
        isCalculating: false,
        mode: "sync",
        recalculationPlan: plan,
        values,
      };
    } catch (error) {
      return {
        error: getEvaluationError(error),
        isCalculating: false,
        mode: "sync",
        recalculationPlan: plan,
        values: {},
      };
    }
  });

  useEffect(() => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;

    const plan = createWorkbookRecalculationPlan({
      activeSheetId,
      document,
      previousDocument: previousDocumentRef.current,
      previousValues: previousValuesRef.current,
    });
    const previousValues = previousValuesRef.current;

    if (
      plan.kind === "incremental" &&
      plan.targetKeys.length === 0 &&
      previousValues
    ) {
      const values = { ...previousValues };

      previousDocumentRef.current = document;
      previousValuesRef.current = values;
      setEvaluation({
        error: null,
        isCalculating: false,
        mode: "sync",
        recalculationPlan: plan,
        values,
      });
      return undefined;
    }

    if (typeof Worker === "undefined") {
      setEvaluation((currentEvaluation) => {
        try {
          const values = evaluateSynchronously(
            document,
            activeSheetId,
            plan,
            previousValues,
          );

          previousDocumentRef.current = document;
          previousValuesRef.current = values;

          return {
            error: null,
            isCalculating: false,
            mode: "sync",
            recalculationPlan: plan,
            values,
          };
        } catch (error) {
          return {
            ...currentEvaluation,
            error: getEvaluationError(error),
            isCalculating: false,
            mode: "sync",
            recalculationPlan: plan,
          };
        }
      });
      return undefined;
    }

    workerRef.current?.terminate();

    const worker = new Worker(new URL("./formula-worker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current = worker;
    setEvaluation((currentEvaluation) => ({
      ...currentEvaluation,
      error: null,
      isCalculating: true,
      mode: "worker",
      recalculationPlan: plan,
    }));

    const handleMessage = (event: MessageEvent<FormulaWorkerResponse>) => {
      const response = event.data;

      if (response.requestId !== requestIdRef.current) {
        return;
      }

      setEvaluation((currentEvaluation) => {
        if ("error" in response) {
          return {
            ...currentEvaluation,
            error: response.error,
            isCalculating: false,
            mode: "worker",
          };
        }

        previousDocumentRef.current = document;
        previousValuesRef.current = response.values;

        return {
          error: null,
          isCalculating: false,
          mode: "worker",
          recalculationPlan: plan,
          values: response.values,
        };
      });
    };

    const handleError = () => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setEvaluation((currentEvaluation) => {
        try {
          const values = evaluateSynchronously(
            document,
            activeSheetId,
            plan,
            previousValues,
          );

          previousDocumentRef.current = document;
          previousValuesRef.current = values;

          return {
            error: null,
            isCalculating: false,
            mode: "sync",
            recalculationPlan: plan,
            values,
          };
        } catch (error) {
          return {
            ...currentEvaluation,
            error: getEvaluationError(error),
            isCalculating: false,
            mode: "sync",
            recalculationPlan: plan,
          };
        }
      });
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    const request: FormulaWorkerRequest = {
      activeSheetId,
      document,
      previousValues:
        plan.kind === "incremental" ? (previousValues ?? undefined) : undefined,
      requestId,
      targetKeys: plan.kind === "incremental" ? plan.targetKeys : undefined,
    };

    worker.postMessage(request);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();

      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, [activeSheetId, document]);

  return evaluation;
}
