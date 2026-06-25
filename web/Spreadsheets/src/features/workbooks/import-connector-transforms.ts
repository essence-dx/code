import { applyConnectorTransformStep } from "@/features/workbooks/import-connector-transform-operations";
import {
  aggregateTypes,
  dataTypes,
  filterModes,
  maxTransformSteps,
  transformTypes,
  type ImportConnectorTransformStep,
} from "@/features/workbooks/import-connector-transform-types";

export type {
  ImportConnectorAggregate,
  ImportConnectorDataType,
  ImportConnectorFilterMode,
  ImportConnectorTransformStep,
  ImportConnectorTransformType,
} from "@/features/workbooks/import-connector-transform-types";

function clampPositiveInteger(value: unknown, fallback: number, max: number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(numberValue), 1), max);
}

export function normalizeImportConnectorTransformSteps(
  value: unknown,
): ImportConnectorTransformStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item, index) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<ImportConnectorTransformStep>;

      if (!candidate.type || !transformTypes.has(candidate.type)) {
        return [];
      }

      return [
        {
          id:
            typeof candidate.id === "string" && candidate.id.trim()
              ? candidate.id.trim().slice(0, 80)
              : `step_${index}`,
          type: candidate.type,
          aggregate:
            candidate.aggregate && aggregateTypes.has(candidate.aggregate)
              ? candidate.aggregate
              : "count",
          count: clampPositiveInteger(candidate.count, 1, 500),
          columnIndex: clampPositiveInteger(candidate.columnIndex, 1, 250),
          columns:
            typeof candidate.columns === "string"
              ? candidate.columns.trim().slice(0, 500)
              : "",
          dataType:
            candidate.dataType && dataTypes.has(candidate.dataType)
              ? candidate.dataType
              : "text",
          delimiter:
            typeof candidate.delimiter === "string"
              ? candidate.delimiter.slice(0, 20)
              : "",
          mode:
            candidate.mode && filterModes.has(candidate.mode)
              ? candidate.mode
              : "contains",
          name:
            typeof candidate.name === "string"
              ? candidate.name.trim().slice(0, 80)
              : "",
          targetColumnIndex: clampPositiveInteger(
            candidate.targetColumnIndex,
            2,
            250,
          ),
          value:
            typeof candidate.value === "string"
              ? candidate.value.trim().slice(0, 10_000)
              : "",
        },
      ];
    })
    .slice(0, maxTransformSteps);
}

export function applyImportConnectorTransformSteps(
  rows: string[][],
  steps: ImportConnectorTransformStep[],
) {
  return steps.reduce<string[][]>(
    (currentRows, step) => applyConnectorTransformStep(currentRows, step),
    rows,
  );
}
